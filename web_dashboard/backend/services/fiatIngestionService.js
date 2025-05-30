// web_dashboard/backend/services/fiatIngestionService.js
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser'); // Assumes csv-parser is already a dependency from crypto ingestion
const FiatTransaction = require('../models/FiatTransaction');
const { auditLog } = require('../utils/logger'); // For logging ingestion events

/**
 * Processes and saves a single fiat transaction data object.
 * @param {object} fiatTxData - An object conforming to the FiatTransaction schema.
 * @returns {Promise<object>} - The saved FiatTransaction document.
 */
const processFiatTransaction = async (fiatTxData) => {
  // Basic validation
  if (!fiatTxData.internalTransactionId || !fiatTxData.transactionType || !fiatTxData.currencyCode || !fiatTxData.amount || !fiatTxData.timestamp) {
    throw new Error('Missing required fields for fiat transaction (internalTransactionId, transactionType, currencyCode, amount, timestamp).');
  }

  try {
    // Use findOneAndUpdate with upsert to avoid duplicates based on internalTransactionId
    const newTransaction = await FiatTransaction.findOneAndUpdate(
      { internalTransactionId: fiatTxData.internalTransactionId },
      fiatTxData,
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    // console.log(`Processed fiat transaction: ${newTransaction.internalTransactionId}`); // Keep logging minimal in bulk
    return newTransaction;
  } catch (error) {
    console.error(`Error processing fiat transaction ${fiatTxData.internalTransactionId}:`, error.message);
    throw error;
  }
};

/**
 * Ingests fiat transactions from a CSV file.
 * Assumes specific CSV column names that map to FiatTransaction schema.
 * @param {string} filePath - Absolute path to the CSV file.
 * @param {string} ingestedByUserId - ID of user performing ingestion.
 * @returns {Promise<object>} - Summary of the ingestion process.
 */
const ingestFiatTransactionsFromCSV = async (filePath, ingestedByUserId = 'System_CSV_Upload') => {
  console.log(`Starting Fiat CSV ingestion from: ${filePath}`);
  if (!fs.existsSync(filePath)) {
    console.error(`Fiat CSV file not found: ${filePath}`);
    auditLog('ERROR', 'FIAT_CSV_INGESTION_FAILURE_FILE_NOT_FOUND', ingestedByUserId, { filePath });
    return { success: false, message: 'CSV file not found.', processed: 0, saved: 0, failed: 0 };
  }

  let processedCount = 0;
  let savedCount = 0;
  let failedCount = 0;

  // Define expected CSV column headers (lowercase and underscore for robustness)
  // This mapping should correspond to how you sanitize headers in csv-parser options
  const columnMapping = {
    internal_transaction_id: 'internalTransactionId', // Required
    external_transaction_id: 'externalTransactionId',
    transaction_type: 'transactionType', // Required, from enum
    currency_code: 'currencyCode', // Required, ISO 4217 (ZAR, USD)
    amount: 'amount', // Required
    value_usd: 'valueUSD', // Optional
    timestamp: 'timestamp', // Required, ISO8601 format
    description: 'description',
    status: 'status', // Optional, from enum, defaults to 'Completed'
    sender_account_number: 'senderDetails.accountNumber',
    sender_bank_name: 'senderDetails.bankName',
    sender_branch_code: 'senderDetails.branchCode',
    sender_holder_name: 'senderDetails.holderName',
    sender_country: 'senderDetails.country', // ISO alpha-2
    receiver_account_number: 'receiverDetails.accountNumber',
    receiver_bank_name: 'receiverDetails.bankName',
    receiver_branch_code: 'receiverDetails.branchCode',
    receiver_holder_name: 'receiverDetails.holderName',
    receiver_country: 'receiverDetails.country', // ISO alpha-2
    institution: 'institution',
    // linkedCryptoTransactionIds (JSON array of ObjectIds), linkedAMLCaseIds (JSON array of caseId strings)
    // For simplicity, these might be harder to map directly from simple CSVs unless specifically formatted.
    // For now, assume they are not in the CSV or handled by a later linking process.
    // linked_crypto_ids_json: 'linkedCryptoTransactionIds', 
    // linked_aml_case_ids_json: 'linkedAMLCaseIds',
    data_source: 'dataSource', // Optional, defaults can be set if not in CSV
    metadata_json: 'metadata' // Expects JSON string
  };
  console.log("Expected Fiat CSV column mapping (after header sanitization):", columnMapping);

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv({
        mapHeaders: ({ header }) => header.trim().toLowerCase().replace(/\s+/g, '_'),
      }))
      .on('data', async (row) => {
        processedCount++;
        const fiatTxData = {};
        try {
          for (const csvHeader in columnMapping) {
            const modelPath = columnMapping[csvHeader];
            if (row[csvHeader] !== undefined && row[csvHeader] !== '') {
              // Handle nested paths like 'senderDetails.accountNumber'
              const keys = modelPath.split('.');
              let current = fiatTxData;
              keys.forEach((key, index) => {
                if (index === keys.length - 1) { // Last key, assign value
                  if (['amount', 'valueUSD'].includes(key)) {
                    current[key] = parseFloat(row[csvHeader]);
                    if (isNaN(current[key])) current[key] = null; // Handle parse failure
                  } else if (modelPath === 'timestamp') {
                    current[key] = new Date(row[csvHeader]);
                    if (isNaN(current[key].getTime())) current[key] = null; // Handle invalid date
                  } else if (modelPath === 'metadata_json') {
                     try { current[key] = JSON.parse(row[csvHeader]); } catch (e) { current[key] = {}; }
                  } else {
                    current[key] = row[csvHeader];
                  }
                } else { // Not the last key, ensure object path exists
                  current[key] = current[key] || {};
                  current = current[key];
                }
              });
            }
          }
          
          // Set default dataSource if not provided
          if (!fiatTxData.dataSource) fiatTxData.dataSource = 'CSV_Upload';

          await processFiatTransaction(fiatTxData);
          savedCount++;
        } catch (error) {
          failedCount++;
          console.error(`Error processing Fiat CSV row ${processedCount}:`, error.message, "\nRow data:", row);
        }
      })
      .on('end', () => {
        console.log('Fiat CSV file successfully processed.');
        auditLog('INFO', 'FIAT_CSV_INGESTION_SUCCESS', ingestedByUserId, { filePath, processed: processedCount, saved: savedCount, failed: failedCount });
        resolve({ success: true, message: 'Fiat CSV ingestion complete.', processed: processedCount, saved: savedCount, failed: failedCount });
      })
      .on('error', (error) => {
        console.error('Error reading Fiat CSV file stream:', error);
        auditLog('ERROR', 'FIAT_CSV_INGESTION_FAILURE_STREAM_ERROR', ingestedByUserId, { filePath, error: error.message });
        reject({ success: false, message: error.message, processed: processedCount, saved: savedCount, failed: failedCount });
      });
  });
};

module.exports = {
  ingestFiatTransactionsFromCSV,
  processFiatTransaction,
};
