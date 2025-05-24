// web_dashboard/backend/models/CryptoTransaction.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CryptoTransactionInputSchema = new Schema({
  address: { type: String, index: true }, // Sender address
  amount: { type: Number, required: true },
  previousTxHash: { type: String }, // For UTXO models like Bitcoin
  index: { type: Number } // Output index in previous transaction for UTXO
}, { _id: false });

const CryptoTransactionOutputSchema = new Schema({
  address: { type: String, required: true, index: true }, // Recipient address
  amount: { type: Number, required: true },
  scriptType: { type: String }, // e.g., P2PKH, P2SH for Bitcoin; or address type for account models
  spent: { type: Boolean, default: false }, // For UTXO, indicates if this output has been spent
  spentInTxHash: { type: String, default: null } // If spent, the tx hash where it was used as an input
}, { _id: false });

const CryptoTransactionSchema = new Schema({
  txHash: { // Transaction Hash/ID
    type: String,
    required: true,
    unique: true,
    index: true
  },
  blockchain: { // e.g., 'Bitcoin', 'Ethereum', 'TRON'
    type: String,
    required: true,
    index: true
  },
  blockHeight: { // Block number where the transaction was included
    type: Number,
    index: true
  },
  timestamp: { // Timestamp of the transaction
    type: Date,
    required: true,
    index: true
  },
  inputs: [CryptoTransactionInputSchema], // Array of input objects
  outputs: [CryptoTransactionOutputSchema], // Array of output objects
  
  valueUSD: { // Approximate value in USD at the time of transaction
    type: Number 
  },
  fee: { 
    type: Number 
  },
  metadata: { // For any other blockchain-specific details or enrichment data
    type: Schema.Types.Mixed,
    default: {}
    // Examples: 
    // 'tags': ['suspicious', 'exchange_deposit'],
    // 'source_of_funds_confidence': 'medium',
    // 'destination_category': 'gambling_site'
  },
  createdAt: { // Record creation timestamp in our system
    type: Date,
    default: Date.now
  }
});

// Compound index for common queries, e.g., finding transactions for a specific address on a blockchain
CryptoTransactionSchema.index({ blockchain: 1, 'inputs.address': 1 });
CryptoTransactionSchema.index({ blockchain: 1, 'outputs.address': 1 });
CryptoTransactionSchema.index({ blockchain: 1, timestamp: -1 }); // Sort by time for a specific blockchain

// TTL index for automatic data archival/deletion if needed in the future
// Example: Expire documents 7 years after their transaction timestamp
// CryptoTransactionSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7 * 365 * 24 * 60 * 60 });


const CryptoTransaction = mongoose.model('CryptoTransaction', CryptoTransactionSchema);

module.exports = CryptoTransaction;
