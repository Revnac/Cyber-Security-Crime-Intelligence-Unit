// web_dashboard/backend/services/cryptoForensicsService.js
const CryptoTransaction = require('../models/CryptoTransaction');
// const WalletAddress = require('../models/WalletAddress'); // For enriching node data later

const MAX_NODES_IN_TRACE = 200; // Limit total nodes (addresses + txs) to prevent runaway queries
const MAX_QUERIES_IN_TRACE = 100; // Limit total DB queries

const traceFunds = async (startIdentifier, identifierType, direction, blockchain, maxHops, options = {}) => {
  // Parameter validation
  if (!startIdentifier || !identifierType || !direction || !blockchain || maxHops === undefined) {
    throw new Error("Missing required parameters for fund tracing (startIdentifier, identifierType, direction, blockchain, maxHops).");
  }
  if (!['address', 'tx'].includes(identifierType)) {
    throw new Error("Invalid identifierType. Must be 'address' or 'tx'.");
  }
  if (!['forward', 'backward', 'both'].includes(direction)) {
    throw new Error("Invalid direction. Must be 'forward', 'backward', or 'both'.");
  }
  if (typeof maxHops !== 'number' || maxHops <= 0 || maxHops > 5) { // Max 5 hops for this version
    throw new Error("Max hops must be an integer between 1 and 5.");
  }
  console.log(`TRACE_FUNDS_START: ID=${startIdentifier}, Type=${identifierType}, Dir=${direction}, Hops=${maxHops}, Chain=${blockchain}`);

  const results = {
    nodes: new Map(), // id (address or txHash) -> { id, type, label, blockchain, ...properties }
    edges: [],      // { source, target, relationship, blockchain, amount, tokenType, contractAddress, label }
    summary: {
      startIdentifier, identifierType, direction, blockchain, maxHops,
      hopsReached: 0,
      foundTransactions: 0,
      foundAddresses: 0,
      queriesMade: 0,
      warning: null,
    },
  };

  const visitedTxHashes = new Set();    // Stores "txHash_blockchain" to ensure tx uniqueness per blockchain
  const visitedAddresses = new Set(); // Stores "address_blockchain"

  const addNode = (id, type, labelPrefix, properties = {}) => {
    const nodeKey = (type === 'transaction' && properties.txHash) ? properties.txHash : id; // Use txHash for tx nodes if available, else id
    if (results.nodes.size >= MAX_NODES_IN_TRACE) {
      results.summary.warning = results.summary.warning || `Trace truncated: Maximum node limit (${MAX_NODES_IN_TRACE}) reached.`;
      return false; 
    }
    if (!results.nodes.has(nodeKey)) {
      const label = `${labelPrefix}: ${String(nodeKey).substring(0, 10)}...`;
      results.nodes.set(nodeKey, { id: nodeKey, type, label, blockchain, ...properties });
      if (type === 'address') results.summary.foundAddresses++;
      if (type === 'transaction') results.summary.foundTransactions++;
    }
    return true;
  };

  const addEdge = (source, target, relationship, properties = {}) => {
    results.edges.push({ 
        source, target, relationship, blockchain, 
        amount: properties.amount, 
        tokenType: properties.tokenType, 
        contractAddress: properties.contractAddress,
        label: `${properties.amount !== undefined ? properties.amount.toFixed(4) : ''} ${properties.tokenType === 'Native' ? blockchain : properties.tokenType || blockchain}`
    });
  };

  let queue = []; // Elements will be { id, type, hop }

  // Initialize queue with the starting identifier
  if (identifierType === 'address') {
    const addressKey = `${startIdentifier}_${blockchain}`;
    if (!visitedAddresses.has(addressKey)) {
      if (addNode(startIdentifier, 'address', 'Addr', { address: startIdentifier } )) {
        queue.push({ id: startIdentifier, type: 'address', hop: 0 });
        visitedAddresses.add(addressKey);
      }
    }
  } else if (identifierType === 'tx') {
    const startTx = await CryptoTransaction.findOne({ txHash: startIdentifier, blockchain: blockchain }).lean();
    results.summary.queriesMade++;
    if (startTx) {
      const txKey = `${startTx.txHash}_${startTx.blockchain}`;
      if (!visitedTxHashes.has(txKey)) {
        if (addNode(startTx.txHash, 'transaction', 'Tx', { 
            txHash: startTx.txHash, timestamp: startTx.timestamp, valueUSD: startTx.valueUSD, 
            tokenType: startTx.tokenType, contractAddress: startTx.contractAddress 
        })) {
          visitedTxHashes.add(txKey);
          queue.push({ id: startTx.txHash, type: 'transaction', hop: 0 });
        }
      }
    } else {
      results.summary.warning = `Starting transaction ${startIdentifier} not found on ${blockchain}.`;
    }
  }
  
  let currentProcessingHop = 0;
  while (currentProcessingHop < maxHops && queue.length > 0 && results.nodes.size < MAX_NODES_IN_TRACE && results.summary.queriesMade < MAX_QUERIES_IN_TRACE) {
    results.summary.hopsReached = currentProcessingHop + 1;
    const nextHopQueue = [];
    
    for (const item of queue) {
      if (item.type === 'address') {
        const currentAddress = item.id;
        let dbQuery = { blockchain };
        
        if (direction === 'forward') dbQuery['inputs.address'] = currentAddress;
        else if (direction === 'backward') dbQuery['outputs.address'] = currentAddress;
        else dbQuery.$or = [{ 'inputs.address': currentAddress }, { 'outputs.address': currentAddress }];
        
        const transactions = await CryptoTransaction.find(dbQuery).limit(20).lean();
        results.summary.queriesMade++;

        for (const tx of transactions) {
          const txKey = `${tx.txHash}_${tx.blockchain}`;
          if (visitedTxHashes.has(txKey) || results.nodes.size >= MAX_NODES_IN_TRACE) continue;
          
          if (!addNode(tx.txHash, 'transaction', 'Tx', { 
              txHash: tx.txHash, timestamp: tx.timestamp, valueUSD: tx.valueUSD, 
              tokenType: tx.tokenType, contractAddress: tx.contractAddress 
          })) break; // Node limit reached
          visitedTxHashes.add(txKey);

          if (direction === 'forward') {
            const inputDetail = tx.inputs.find(i => i.address === currentAddress);
            addEdge(currentAddress, tx.txHash, 'SENT_FROM_ADDRESS_TO_TX', { amount: inputDetail?.amount, tokenType: tx.tokenType, contractAddress: tx.contractAddress });
            tx.outputs.forEach(o => { if(o.address) nextHopQueue.push({ id: o.address, type: 'address', hop: currentProcessingHop + 1 }); });
          } else if (direction === 'backward') {
            const outputDetail = tx.outputs.find(o => o.address === currentAddress);
            addEdge(tx.txHash, currentAddress, 'RECEIVED_AT_ADDRESS_FROM_TX', { amount: outputDetail?.amount, tokenType: tx.tokenType, contractAddress: tx.contractAddress });
            tx.inputs.forEach(i => { if(i.address) nextHopQueue.push({ id: i.address, type: 'address', hop: currentProcessingHop + 1 }); });
          } else { // 'both'
             tx.inputs.forEach(i => {
                if (i.address) {
                    if (i.address === currentAddress) {
                        addEdge(currentAddress, tx.txHash, 'SENT_FROM_ADDRESS_TO_TX_BOTH', { amount: i.amount, tokenType: tx.tokenType, contractAddress: tx.contractAddress });
                    } else { // Other input addresses
                        nextHopQueue.push({ id: i.address, type: 'address', hop: currentProcessingHop + 1 });
                        // Edge from other input addresses to this tx
                        addNode(i.address, 'address', 'Addr', { address: i.address });
                        addEdge(i.address, tx.txHash, 'SENT_FROM_ADDRESS_TO_TX_BOTH', { amount: i.amount, tokenType: tx.tokenType, contractAddress: tx.contractAddress });
                    }
                }
             });
             tx.outputs.forEach(o => {
                if (o.address) {
                    if (o.address === currentAddress) {
                        addEdge(tx.txHash, currentAddress, 'RECEIVED_AT_ADDRESS_FROM_TX_BOTH', { amount: o.amount, tokenType: tx.tokenType, contractAddress: tx.contractAddress });
                    } else { // Other output addresses
                        nextHopQueue.push({ id: o.address, type: 'address', hop: currentProcessingHop + 1 });
                        // Edge from this tx to other output addresses
                        addNode(o.address, 'address', 'Addr', { address: o.address });
                        addEdge(tx.txHash, o.address, 'RECEIVED_AT_ADDRESS_FROM_TX_BOTH', { amount: o.amount, tokenType: tx.tokenType, contractAddress: tx.contractAddress });
                    }
                }
             });
          }
        }
      } else { // item.type === 'transaction'
          const currentTxHash = item.id;
          const currentTx = await CryptoTransaction.findOne({ txHash: currentTxHash, blockchain: blockchain }).lean(); // Fetch if only hash was queued
          results.summary.queriesMade++;
          if (!currentTx) continue;

          if (direction === 'forward' || direction === 'both') {
            currentTx.outputs.forEach(o => { 
                if(o.address) nextHopQueue.push({ id: o.address, type: 'address', hop: currentProcessingHop + 1 }); 
                // Edges from this Tx to its outputs were already added when this Tx was discovered
            });
          }
          if (direction === 'backward' || direction === 'both') {
            currentTx.inputs.forEach(i => { 
                if(i.address) nextHopQueue.push({ id: i.address, type: 'address', hop: currentProcessingHop + 1 }); 
                // Edges from inputs to this Tx were already added
            });
          }
      }
      if (results.nodes.size >= MAX_NODES_IN_TRACE || results.summary.queriesMade >= MAX_QUERIES_IN_TRACE) {
          results.summary.warning = results.summary.warning || `Trace truncated: Resource limit reached (Nodes: ${results.nodes.size}/${MAX_NODES_IN_TRACE}, Queries: ${results.summary.queriesMade}/${MAX_QUERIES_IN_TRACE}).`;
          break;
      }
    }
    queue = [];
    for (const nextItem of nextHopQueue) {
        const itemKey = `${nextItem.id}_${blockchain}`;
        if (!visitedAddresses.has(itemKey) && nextItem.type === 'address') { // Only add addresses to main queue for next hop processing
            queue.push(nextItem);
            visitedAddresses.add(itemKey); 
        } else if (!visitedTxHashes.has(itemKey) && nextItem.type === 'transaction') {
            // This case should be rare if we primarily explore address -> tx -> address
            queue.push(nextItem);
            visitedTxHashes.add(itemKey);
        }
    }
    currentProcessingHop++;
  }

  if (results.nodes.size === 0 && !results.summary.warning) {
      results.summary.warning = "No transactions or addresses found related to the start identifier.";
  }
  if (currentProcessingHop < maxHops && !results.summary.warning && results.nodes.size > 0) {
      results.summary.hopsReached = currentProcessingHop; // Actual hops explored if ended early
  } else if (results.nodes.size === 0) {
      results.summary.hopsReached = 0;
  }


  // TODO: Path reconstruction (results.paths) is deferred.

  results.nodes = Array.from(results.nodes.values());
  console.log(`TRACE_FUNDS_END: Hops: ${results.summary.hopsReached}, Txs: ${results.summary.foundTransactions}, Addrs: ${results.summary.foundAddresses}, Queries: ${results.summary.queriesMade}, Warning: ${results.summary.warning}`);
  return results;
};

module.exports = { traceFunds };
