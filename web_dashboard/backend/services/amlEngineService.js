// web_dashboard/backend/services/amlEngineService.js
const CryptoTransaction = require('../models/CryptoTransaction'); // Already there
const WalletAddress = require('../models/WalletAddress'); // Already there
const Entity = require('../models/Entity'); // Already there
const Watchlist = require('../models/Watchlist'); // <<< ADD THIS
// const AMLCase = require('../models/AMLCase'); // AMLCase model is now used by caseService
const { createCaseFromAlert } = require('./caseService'); // <<< ADD THIS

// --- AML Rule Definitions ---

const checkTransactionThreshold = (transaction) => {
  const thresholdUSD = 10000; // Example threshold
  if (transaction.valueUSD && transaction.valueUSD >= thresholdUSD) {
    console.log(`AML RULE TRIGGERED: Transaction ${transaction.txHash || transaction._id} exceeded threshold (Value: $${transaction.valueUSD})`);
    return {
      ruleTriggered: 'HIGH_VALUE_TRANSACTION',
      summary: `Transaction ${transaction.txHash || transaction._id} for $${transaction.valueUSD} exceeded threshold of $${thresholdUSD}.`,
      priority: 'Medium',
      triggeringTransactions: [transaction._id], // Standardized field
      triggeringWalletAddresses: [], 
      associatedEntities: []
      // relatedTransactionId field removed as triggeringTransactions is now standard
    };
  }
  return null;
};

const checkAgainstWatchlist = async (transaction) => {
  let alertData = null;
  const addressesToScan = new Map(); // Use a Map to store address and its type (input/output) to avoid duplicate checks if an address is in both

  if (transaction.inputs && Array.isArray(transaction.inputs)) {
    for (const input of transaction.inputs) {
      if (input.address && !addressesToScan.has(input.address)) {
        addressesToScan.set(input.address, 'input');
      }
    }
  }
  if (transaction.outputs && Array.isArray(transaction.outputs)) {
    for (const output of transaction.outputs) {
      if (output.address && !addressesToScan.has(output.address)) {
        addressesToScan.set(output.address, 'output');
      }
    }
  }

  for (const [addressString, type] of addressesToScan.entries()) {
    try {
      const watchlistItem = await Watchlist.findOne({
        identifier: addressString,
        identifierType: 'CRYPTO_ADDRESS',
        blockchain: transaction.blockchain, // Match blockchain from transaction
        isActive: true
      });

      if (watchlistItem) {
        console.log(`AML RULE TRIGGERED: Address ${addressString} (type: ${type}) in transaction ${transaction.txHash || transaction._id} is on DB watchlist.`);
        
        // Map Watchlist riskLevel to alert priority
        let alertPriority = 'Medium'; // Default
        if (watchlistItem.riskLevel === 'Critical' || watchlistItem.riskLevel === 'High') {
            alertPriority = 'High';
        } else if (watchlistItem.riskLevel === 'Low') {
            alertPriority = 'Low';
        }

        alertData = {
          ruleTriggered: 'DB_WATCHLIST_HIT',
          summary: `Transaction ${transaction.txHash || transaction._id} involves DB watchlisted address: ${addressString} (type: ${type}, Watchlist Risk: ${watchlistItem.riskLevel}).`,
          priority: alertPriority,
          triggeringTransactions: [transaction._id], // Standardized field
          // TODO X.3.2: Resolve hitAddress strings to WalletAddress._ids before passing to caseService
          // For now, caseService is aware it might receive strings here.
          triggeringWalletAddresses: [addressString], 
          associatedEntities: watchlistItem.associatedEntity ? [watchlistItem.associatedEntity] : [],
          // relatedTransactionId field removed
          watchlistMatchDetails: {
            watchlistId: watchlistItem._id,
            identifier: watchlistItem.identifier,
            identifierType: watchlistItem.identifierType,
            riskLevel: watchlistItem.riskLevel,
            reason: watchlistItem.reason,
            source: watchlistItem.source
          }
        };

        // Optional: Update lastMatchedAt on the watchlistItem
        watchlistItem.lastMatchedAt = new Date();
        await watchlistItem.save();
        
        break; // Found a hit, stop checking other addresses for this transaction
      }
    } catch (error) {
      console.error(`Error querying watchlist for address ${addressString} on tx ${transaction.txHash || transaction._id}:`, error.message);
      // Continue to next address even if one query fails
    }
  }
  
  return alertData;
};

const checkStructuringPatterns = (transaction, recentTransactions = []) => {
  console.warn(`AML RULE SKIPPED: Structuring pattern detection for tx ${transaction.txHash || transaction._id} is not implemented.`);
  // Placeholder: Real structuring detection is complex.
  return null;
};

// --- Main Analysis Function ---
const analyzeTransaction = async (transactionDoc) => {
  if (!transactionDoc || typeof transactionDoc !== 'object') {
    console.error("analyzeTransaction: Invalid transaction document provided.");
    return [];
  }
  
  const transaction = transactionDoc.toObject ? transactionDoc.toObject({ virtuals: true }) : { ...transactionDoc };
  if (transactionDoc._id && !transaction._id) {
      transaction._id = transactionDoc._id.toString(); // Ensure _id is a string if it's an ObjectId
  }

  const triggeredAlertsData = [];
  let alertResult;

  // Rule 1: Check Threshold
  alertResult = checkTransactionThreshold(transaction);
  if (alertResult) triggeredAlertsData.push(alertResult);

  // Rule 2: Check Watchlist (async)
  alertResult = await checkAgainstWatchlist(transaction);
  if (alertResult) triggeredAlertsData.push(alertResult);

  // Rule 3: Check Structuring
  // const relatedRecentTransactions = []; // Placeholder: Fetch actual related transactions
  // alertResult = checkStructuringPatterns(transaction, relatedRecentTransactions);
  // if (alertResult) triggeredAlertsData.push(alertResult);
  // For now, just call it to log the warning:
  checkStructuringPatterns(transaction);


  if (triggeredAlertsData.length > 0) {
      console.log(`Transaction ${transaction.txHash || transaction._id} triggered ${triggeredAlertsData.length} AML alert(s).`);
  } else {
      // console.log(`Transaction ${transaction.txHash || transaction._id} did not trigger any AML alerts.`);
  }

  return triggeredAlertsData;
};

// TODO X.B.1.1: Future Enhancement for Direct Fiat AML Analysis
// If AML rules need to be applied directly to fiat transactions upon their ingestion (similar to crypto),
// a new function like `analyzeFiatTransaction(fiatTransactionDocument, triggeredByUserId)` could be created.
// This function would:
// 1. Take a FiatTransaction document as input.
// 2. Apply specific AML rules relevant to fiat movements (e.g., structuring with cash,
//    unusual international transfers, transactions with high-risk country counterparts).
// 3. Generate alertData objects, ensuring fields like `triggeringFiatTransactions` are populated.
// 4. This alertData would then be passed to `caseService.createCaseFromAlert`.
// For now, fiat transactions are primarily linked to cases manually or if their details
// are part of an alert generated from other sources (e.g., crypto transaction analysis leading
// to investigation of related fiat accounts).

module.exports = {
  analyzeTransaction,
  // For testing or more granular use later:
  // checkTransactionThreshold, 
  // checkAgainstWatchlist,
  // checkStructuringPatterns 
};
