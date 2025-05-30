// web_dashboard/backend/services/cryptoIngestionService.js
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser'); // <<< UNCOMMENTED
const CryptoTransaction = require('../models/CryptoTransaction');
const WalletAddress = require('../models/WalletAddress'); // Will be used to update wallet summaries

/**
 * Processes and saves a single transaction data object.
 * This function will also handle basic updates to WalletAddress summaries.
 * @param {object} transactionData - An object conforming to the CryptoTransaction schema.
 * @returns {Promise<object>} - The saved CryptoTransaction document.
 */
const processTransaction = async (transactionData) => {
  if (!transactionData.txHash || !transactionData.blockchain || !transactionData.timestamp) {
    throw new Error('Missing required fields (txHash, blockchain, timestamp) for transaction.');
  }

  // If transactionData includes tokenType and contractAddress, they will be saved.
  // Future enhancements to WalletAddress updates might use these for token-specific logic.
  let savedTransaction; 

  try {
    savedTransaction = await CryptoTransaction.findOneAndUpdate(
      { txHash: transactionData.txHash, blockchain: transactionData.blockchain },
      transactionData,
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    // console.log(`Processed and saved transaction: ${savedTransaction.txHash}`); // Keep logging minimal during bulk operations

  } catch (error) {
    console.error(`Error saving transaction ${transactionData.txHash}:`, error.message);
    throw error; 
  }

  if (savedTransaction) {
    const txTimestamp = savedTransaction.timestamp;
    const txBlockchain = savedTransaction.blockchain;
    
    const updateWallet = async (address, amount, type) => {
      if (!address || typeof amount !== 'number' || isNaN(amount)) {
        // console.warn(`Skipping wallet update for address ${address} on tx ${savedTransaction.txHash} due to invalid address or amount.`);
        return; // Silently skip if data is bad, or log warning
      }
      
      const updateOps = {
        $set: { lastSeenAt: txTimestamp, address: address, blockchain: txBlockchain },
        $setOnInsert: { firstSeenAt: txTimestamp, createdAt: new Date() },
        $inc: { transactionCount: 1 }
      };

      if (type === 'input') {
        updateOps.$inc.totalSent = amount;
      } else if (type === 'output') {
        updateOps.$inc.totalReceived = amount;
      }

      try {
        await WalletAddress.findOneAndUpdate(
          { address: address, blockchain: txBlockchain },
          updateOps,
          { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
        );
      } catch (walletError) {
        console.error(`Error updating wallet ${address} on ${txBlockchain} for tx ${savedTransaction.txHash}:`, walletError.message);
      }
    };

    if (savedTransaction.inputs && Array.isArray(savedTransaction.inputs)) {
      for (const input of savedTransaction.inputs) {
        // Ensure input.address and input.amount are valid before processing
        if (input && input.address && typeof input.amount === 'number' && !isNaN(input.amount)) {
             await updateWallet(input.address, input.amount, 'input');
        } else {
            // console.warn(`Invalid input data for tx ${savedTransaction.txHash}:`, input);
        }
      }
    }

    if (savedTransaction.outputs && Array.isArray(savedTransaction.outputs)) {
      for (const output of savedTransaction.outputs) {
        // Ensure output.address and output.amount are valid
        if (output && output.address && typeof output.amount === 'number' && !isNaN(output.amount)) {
            await updateWallet(output.address, output.amount, 'output');
        } else {
            // console.warn(`Invalid output data for tx ${savedTransaction.txHash}:`, output);
        }
      }
    }
  } 

  return savedTransaction; 
};

/**
 * Ingests transactions from a CSV file.
 * Assumes specific CSV column names that map to CryptoTransaction schema.
 * @param {string} filePath - Absolute path to the CSV file.
 * @returns {Promise<object>} - Summary of the ingestion process.
 */
const ingestTransactionsFromCSV = async (filePath) => {
  console.log(`Starting CSV ingestion from: ${filePath}`);
  if (!fs.existsSync(filePath)) {
    console.error(`CSV file not found: ${filePath}`);
    return { success: false, message: 'CSV file not found.', processed: 0, saved: 0, failed: 0 };
  }

  let processedCount = 0;
  let savedCount = 0;
  let failedCount = 0;

  // Define expected CSV column headers (lowercase and underscore for robustness after sanitizing)
  // This mapping should correspond to how you sanitize headers in csv-parser options
  const columnMapping = {
    transaction_id: 'txHash',
    blockchain_name: 'blockchain',
    timestamp_utc: 'timestamp',
    input_addresses_amounts_json: 'inputs', // Expects JSON string: [{"address":"addr1","amount":1.0,"previousTxHash":"prevHash","index":0}]
    output_addresses_amounts_scripts_json: 'outputs', // Expects JSON string: [{"address":"addr2","amount":0.99,"scriptType":"P2PKH"}]
    fee_amount: 'fee',
    value_usd_estimate: 'valueUSD',
    block_height: 'blockHeight',
    metadata_json: 'metadata' // Expects JSON string: {"tag":"exchange_related"}
  };
  console.log("Expected CSV column mapping (after header sanitization):", columnMapping);


  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv({
        mapHeaders: ({ header }) => header.trim().toLowerCase().replace(/\s+/g, '_'), // Sanitize headers
        // skipLines: 0, // if there are comments or empty lines at the start
      }))
      .on('data', async (row) => {
        processedCount++;
        try {
          // Transform row data based on columnMapping
          const transactionData = {};
          for (const csvHeader in columnMapping) {
            const modelField = columnMapping[csvHeader];
            if (row[csvHeader] !== undefined && row[csvHeader] !== '') {
              if (modelField === 'timestamp') {
                transactionData[modelField] = new Date(row[csvHeader]);
              } else if (['inputs', 'outputs', 'metadata'].includes(modelField)) {
                try {
                  transactionData[modelField] = JSON.parse(row[csvHeader]);
                } catch (e) {
                  console.warn(`Row ${processedCount}: Malformed JSON for ${modelField}: ${row[csvHeader]}. Skipping this field.`);
                  transactionData[modelField] = (modelField === 'metadata' ? {} : []); // Default to empty if parse fails
                }
              } else if (['fee', 'valueUSD', 'blockHeight'].includes(modelField) || (modelField === 'amount' && (csvHeader.includes('input') || csvHeader.includes('output')) ) ) {
                transactionData[modelField] = parseFloat(row[csvHeader]);
                if (isNaN(transactionData[modelField])) {
                    console.warn(`Row ${processedCount}: Could not parse number for ${modelField}: ${row[csvHeader]}. Setting to null or default handling by schema.`);
                    transactionData[modelField] = null; // Or handle as per schema default
                }
              } else {
                transactionData[modelField] = row[csvHeader];
              }
            }
          }
          
          // Ensure inputs/outputs are arrays even if missing or malformed from CSV
          transactionData.inputs = Array.isArray(transactionData.inputs) ? transactionData.inputs : [];
          transactionData.outputs = Array.isArray(transactionData.outputs) ? transactionData.outputs : [];
          transactionData.metadata = typeof transactionData.metadata === 'object' && transactionData.metadata !== null ? transactionData.metadata : {};


          // Basic check for core fields after mapping
          if (!transactionData.txHash || !transactionData.blockchain || !transactionData.timestamp) {
            throw new Error(`Row ${processedCount}: Missing core fields (txHash, blockchain, or timestamp) after mapping.`);
          }
          
          // Validate and process inputs/outputs structure if parsed from JSON
          // Ensure amounts are numbers
          if (transactionData.inputs) {
              transactionData.inputs.forEach(input => {
                  if (input.amount !== undefined) input.amount = parseFloat(input.amount);
              });
          }
          if (transactionData.outputs) {
              transactionData.outputs.forEach(output => {
                  if (output.amount !== undefined) output.amount = parseFloat(output.amount);
              });
          }
          
          // TODO X.1.3: Map tokenType and contractAddress if available in CSV
          // Example:
          // if (row['token_type']) transactionData.tokenType = row['token_type'];
          // if (row['contract_address']) transactionData.contractAddress = row['contract_address'];
          // Also, ensure the columnMapping includes these if they have different CSV header names.

          await processTransaction(transactionData); // processTransaction is in the same file
          savedCount++;
        } catch (error) {
          failedCount++;
          console.error(`Error processing CSV row ${processedCount}:`, error.message, "
Row data:", row);
          // Optionally, collect problematic rows for later review instead of just logging
        }
      })
      .on('end', () => {
        console.log('CSV file successfully processed.');
        resolve({ success: true, message: 'CSV ingestion complete.', processed: processedCount, saved: savedCount, failed: failedCount });
      })
      .on('error', (error) => {
        console.error('Error reading CSV file stream:', error);
        // Note: errors during 'data' event (like processTransaction errors) won't trigger this 'error' event
        // This 'error' event is for stream-level errors (e.g., file not readable)
        reject({ success: false, message: error.message, processed: processedCount, saved: savedCount, failed: failedCount });
      });
  });
};


/**
 * (Conceptual) Polls a blockchain API for new transactions.
 * @param {object} apiConfig - Configuration for the blockchain API.
 */
const pollBlockchainAPI = async (apiConfig) => {
  // TODO: Implement logic to connect to a specific blockchain API (e.g., Bitcoin, Ethereum node, or third-party service)
  // - Fetch new blocks/transactions since last poll.
  // - For each new transaction, adapt its structure to `transactionData`.
  // - Call `await processTransaction(transactionData);`
  console.log("Conceptual: Polling blockchain API with config:", apiConfig);
  // This would be a complex, ongoing task, likely involving a job scheduler.
};

module.exports = {
  ingestTransactionsFromCSV,
  processTransaction,
  pollBlockchainAPI // Export conceptual function as well
};
