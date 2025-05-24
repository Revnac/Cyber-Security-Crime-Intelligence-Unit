// web_dashboard/backend/services/cryptoForensicsService.js
const CryptoTransaction = require('../models/CryptoTransaction');
// const WalletAddress = require('../models/WalletAddress'); // WalletAddress model might be useful for context but not strictly for traversal if tx data is rich

const traceFunds = async (startIdentifier, identifierType, direction, blockchain, maxHops, options = {}) => {
  console.log(`Starting fund tracing: ID=${startIdentifier}, Type=${identifierType}, Dir=${direction}, Hops=${maxHops}, Chain=${blockchain}`);

  if (!startIdentifier || !identifierType || !direction || !blockchain || maxHops === undefined) {
    throw new Error("Missing required parameters for fund tracing.");
  }
  if (maxHops <= 0 || maxHops > 5) { // Limit hops for performance
    throw new Error("Max hops must be between 1 and 5 for this version.");
  }

  const results = {
    nodes: new Map(), // id -> { id, type, label, properties }
    edges: [],      // { source, target, type, properties }
    // paths: [], // For more complex path reconstruction later
    summary: {
      startIdentifier, identifierType, direction, blockchain, maxHops,
      hopsReached: 0,
      foundTransactions: 0,
      foundAddresses: 0,
    }
  };

  const visitedTransactions = new Set(); // Store tx._id.toString()
  const visitedAddresses = new Set();   // Store "address_blockchain" string

  const addNode = (id, type, label, properties = {}) => {
    if (!results.nodes.has(id)) {
      results.nodes.set(id, { id, type, label, ...properties });
      if (type === 'address') results.summary.foundAddresses++;
      if (type === 'transaction') results.summary.foundTransactions++;
    }
  };

  const addEdge = (source, target, relationship, properties = {}) => {
    results.edges.push({ source, target, relationship, ...properties });
  };

  let addressesToExploreNextHop = new Set();
  let currentHop = 0;

  // Initial population based on startIdentifier
  if (identifierType === 'address') {
    const initialAddressKey = `${startIdentifier}_${blockchain}`;
    if (!visitedAddresses.has(initialAddressKey)) {
      addNode(startIdentifier, 'address', `Addr: ${startIdentifier.substring(0, 10)}...`, { blockchain });
      addressesToExploreNextHop.add(startIdentifier);
      visitedAddresses.add(initialAddressKey);
    }
  } else if (identifierType === 'tx') {
    const startTx = await CryptoTransaction.findOne({ txHash: startIdentifier, blockchain: blockchain }).lean();
    if (startTx && !visitedTransactions.has(startTx._id.toString())) {
      addNode(startTx.txHash, 'transaction', `Tx: ${startTx.txHash.substring(0, 10)}...`, { timestamp: startTx.timestamp, valueUSD: startTx.valueUSD, blockchain });
      visitedTransactions.add(startTx._id.toString());
      results.summary.hopsReached = 1; // Initial tx counts as first "hop" of sorts or discovery

      if (direction === 'forward' || direction === 'both') {
        startTx.outputs.forEach(output => {
          if (output.address) {
            const addrKey = `${output.address}_${blockchain}`;
            if (!visitedAddresses.has(addrKey)) { // Check before adding to explore
                addressesToExploreNextHop.add(output.address);
            }
            // Add node & edge regardless of visit for exploration, graph structure needs it
            addNode(output.address, 'address', `Addr: ${output.address.substring(0,10)}...`, { blockchain });
            addEdge(startTx.txHash, output.address, 'sends_to', { amount: output.amount });
          }
        });
      }
      if (direction === 'backward' || direction === 'both') {
        startTx.inputs.forEach(input => {
          if (input.address) {
            const addrKey = `${input.address}_${blockchain}`;
            if(!visitedAddresses.has(addrKey)) {
                addressesToExploreNextHop.add(input.address);
            }
            addNode(input.address, 'address', `Addr: ${input.address.substring(0,10)}...`, { blockchain });
            addEdge(input.address, startTx.txHash, 'receives_from', { amount: input.amount });
          }
        });
      }
    } else if (!startTx) {
        console.warn(`TraceFunds: Starting transaction ${startIdentifier} not found on ${blockchain}.`);
        results.nodes = Array.from(results.nodes.values()); return results; // Early exit
    }
  }


  // Iterative Tracing
  for (currentHop = (identifierType === 'tx' ? 1 : 0) ; currentHop < maxHops; currentHop++) {
    if (addressesToExploreNextHop.size === 0) break;
    results.summary.hopsReached = currentHop + 1;

    const addressesThisHop = Array.from(addressesToExploreNextHop);
    addressesToExploreNextHop = new Set(); // Reset for the *next* hop

    for (const address of addressesThisHop) {
      const addressKey = `${address}_${blockchain}`;
      if (visitedAddresses.has(addressKey) && currentHop > 0 && identifierType === 'address') { 
          // If it's an address start, the first address is already "visited" but needs processing for hop 0->1
          // For subsequent hops, if address already fully processed, skip.
          // This simple visitedAddresses check might need refinement for full cycle detection vs. re-exploration limits
          // For now, if an address was a seed for a previous hop's transaction search, we might re-evaluate its txs.
          // A more robust approach is to mark addresses as "fully explored for this direction/hop_level".
      }
      visitedAddresses.add(addressKey); // Mark as visited for future direct exploration
      addNode(address, 'address', `Addr: ${address.substring(0, 10)}...`, { blockchain });


      let query = {};
      if (direction === 'forward') {
        query = { 'inputs.address': address, blockchain: blockchain };
      } else if (direction === 'backward') {
        query = { 'outputs.address': address, blockchain: blockchain };
      } else { // 'both'
        query = { $or: [{ 'inputs.address': address }, { 'outputs.address': address }], blockchain: blockchain };
      }
      
      // Note on Blockchain Specificity:
      // For UTXO-based chains (e.g., Bitcoin), an input address implies the entire UTXO value is spent.
      // The 'amount' on the input edge should reflect the value of that specific input.
      // For account-based chains (e.g., Ethereum), a transaction has one 'from' address (sender)
      // and one 'to' address (receiver) for the primary value transfer.
      // This implementation uses a generic model assuming inputs[].address and outputs[].address.

      const transactions = await CryptoTransaction.find(query).lean();

      for (const tx of transactions) {
        if (visitedTransactions.has(tx._id.toString())) continue;
        
        addNode(tx.txHash, 'transaction', `Tx: ${tx.txHash.substring(0, 10)}...`, { timestamp: tx.timestamp, valueUSD: tx.valueUSD, blockchain });
        visitedTransactions.add(tx._id.toString());

        if (direction === 'forward') {
          // Edge from current address to this transaction
          const inputDetail = tx.inputs.find(inp => inp.address === address);
          addEdge(address, tx.txHash, 'sent_to_tx', { amount: inputDetail ? inputDetail.amount : undefined });
          // Add output addresses of this transaction for the next hop
          tx.outputs.forEach(output => {
            if (output.address) {
                addressesToExploreNextHop.add(output.address);
                addNode(output.address, 'address', `Addr: ${output.address.substring(0,10)}...`, { blockchain }); // Add node early
                addEdge(tx.txHash, output.address, 'sends_to', {amount: output.amount}); // Edge from tx to output addr
            }
          });
        } else if (direction === 'backward') {
          // Edge from this transaction to current address
          const outputDetail = tx.outputs.find(out => out.address === address);
          addEdge(tx.txHash, address, 'received_from_tx', { amount: outputDetail ? outputDetail.amount : undefined });
          // Add input addresses of this transaction for the next hop
          tx.inputs.forEach(input => {
            if (input.address) {
                addressesToExploreNextHop.add(input.address);
                addNode(input.address, 'address', `Addr: ${input.address.substring(0,10)}...`, { blockchain }); // Add node early
                addEdge(input.address, tx.txHash, 'receives_from', {amount: input.amount}); // Edge from input addr to tx
            }
          });
        } else { // 'both' - more complex to define edges simply, this part needs careful thought for 'both'
            // Simplified: if current address is an input, then tx outputs are "forward"
            // if current address is an output, then tx inputs are "backward"
            let addressIsInput = tx.inputs.some(inp => inp.address === address);
            let addressIsOutput = tx.outputs.some(out => out.address === address);

            if (addressIsInput) {
                const inputDetail = tx.inputs.find(inp => inp.address === address);
                addEdge(address, tx.txHash, 'sent_to_tx_in_both_trace', { amount: inputDetail ? inputDetail.amount : undefined });
                tx.outputs.forEach(output => {
                    if (output.address) {
                        addressesToExploreNextHop.add(output.address);
                        addNode(output.address, 'address', `Addr: ${output.address.substring(0,10)}...`, { blockchain });
                        addEdge(tx.txHash, output.address, 'sends_to_in_both_trace', { amount: output.amount });
                    }
                });
            }
            if (addressIsOutput) {
                 const outputDetail = tx.outputs.find(out => out.address === address);
                addEdge(tx.txHash, address, 'received_from_tx_in_both_trace', { amount: outputDetail ? outputDetail.amount : undefined });
                tx.inputs.forEach(input => {
                    if (input.address) {
                        addressesToExploreNextHop.add(input.address);
                        addNode(input.address, 'address', `Addr: ${input.address.substring(0,10)}...`, { blockchain });
                        addEdge(input.address, tx.txHash, 'receives_from_in_both_trace', { amount: input.amount });
                    }
                });
            }
        }
      }
    }
  }
  
  // Performance Considerations:
  // - Deep hops or addresses with thousands of transactions can be very slow.
  // - Ensure database fields used in queries are indexed.
  // - For very large graphs, consider query limits, timeouts, or background job processing.
  // - Graph databases (e.g., Neo4j) are specialized for this type of traversal.

  results.nodes = Array.from(results.nodes.values());
  console.log(`Fund tracing complete. Hops: ${results.summary.hopsReached}, Found Txs: ${results.summary.foundTransactions}, Found Addrs: ${results.summary.foundAddresses}`);
  return results;
};

module.exports = {
  traceFunds,
};
