// web_dashboard/backend/models/FiatTransaction.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FiatPartyDetailsSchema = new Schema({
  accountNumber: { type: String, trim: true },
  bankName: { type: String, trim: true },
  branchCode: { type: String, trim: true },
  holderName: { type: String, trim: true },
  country: { // ISO 3166-1 alpha-2 country code
    type: String, 
    trim: true, 
    uppercase: true, 
    match: /^[A-Z]{2}$/,
    default: null
  }
}, { _id: false });

const FiatTransactionSchema = new Schema({
  internalTransactionId: { // Generated internally or from an import batch ID
    type: String,
    required: true,
    unique: true,
    index: true
    // Consider a pre-save hook for generation if not provided externally
  },
  externalTransactionId: { // e.g., bank's transaction ID
    type: String,
    index: true,
    sparse: true, // Allows nulls but if present should ideally be unique with institution or similar context
    trim: true
  },
  transactionType: {
    type: String,
    required: true,
    enum: ['Bank Transfer', 'Cash Deposit', 'Cash Withdrawal', 'Card Payment', 'Online Payment', 'Inter-Account Transfer', 'Salary Payment', 'Loan Disbursement', 'Fee', 'Interest', 'Other'],
    index: true
  },
  currencyCode: { // ISO 4217, e.g., 'ZAR', 'USD', 'EUR'
    type: String,
    required: true,
    uppercase: true,
    match: /^[A-Z]{3}$/,
    index: true
  },
  amount: { // Positive value, direction implied by sender/receiver or transaction type
    type: Number,
    required: true
    // Consider using mongoose-long or Decimal128 for financial precision if needed
  },
  valueUSD: { // Approximate USD value at time of transaction
    type: Number 
  },
  timestamp: { // When the transaction occurred or was recorded/posted
    type: Date,
    required: true,
    index: true
  },
  description: { // Transaction description/narrative from bank or user
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Posted', 'Completed', 'Failed', 'Reversed', 'Cancelled', 'Under Review', 'Flagged'],
    default: 'Completed',
    index: true
  },
  senderDetails: FiatPartyDetailsSchema,
  receiverDetails: FiatPartyDetailsSchema,
  institution: { // Name of the primary financial institution processing/involved
    type: String,
    trim: true,
    index: true
  },
  linkedCryptoTransactionIds: [{
    type: Schema.Types.ObjectId,
    ref: 'CryptoTransaction'
  }],
  linkedAMLCaseIds: [{ // Using AMLCase.caseId (human-readable) or _id
    type: String, // Store caseId string for human readability
    // Or: type: Schema.Types.ObjectId, ref: 'AMLCase'
    index: true,
    sparse: true
  }],
  dataSource: { // e.g., 'Bank Statement Import', 'Manual Entry', 'API Feed'
    type: String,
    trim: true
  },
  metadata: { // For any other specific details
    type: Schema.Types.Mixed,
    default: {}
    // e.g., payment_gateway_ref, specific_bank_codes, check_number
  },
  aiTransactionScore: { // <<< ADDED
    score: { type: Number, min: 0, max: 1 },
    isAnomaly: { type: Boolean, default: false },
    modelVersion: { type: String, trim: true },
    anomalyType: { type: String, trim: true, default: null }
  },
  notes: { // Internal notes by analysts
      type: String,
      trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
  // Conceptual comments for X.2.2:
  // Data for this model could be ingested via:
  // 1. CSV uploads of bank statements (requires a dedicated CSV parser and mapping).
  // 2. Direct API feeds from financial systems (requires integration development).
  // 3. Manual entry for specific investigative purposes.
  // Service functions in a new `fiatIngestionService.js` (or extending an existing one)
  // would handle the ingestion logic, similar to cryptoIngestionService.js.
});

// Indexes
FiatTransactionSchema.index({ externalTransactionId: 1, institution: 1 }, { sparse: true }); // For looking up bank specific txns
FiatTransactionSchema.index({ 'senderDetails.accountNumber': 1, institution: 1 }, { sparse: true });
FiatTransactionSchema.index({ 'receiverDetails.accountNumber': 1, institution: 1 }, { sparse: true });
FiatTransactionSchema.index({ currencyCode: 1, amount: 1 });
FiatTransactionSchema.index({ transactionType: 1, status: 1 });

// Pre-save hook to update the `updatedAt` field
FiatTransactionSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.updatedAt = Date.now();
  }
  next();
});

// Pre-validate hook for internalTransactionId generation (example)
// FiatTransactionSchema.pre('validate', async function(next) {
//   if (this.isNew && !this.internalTransactionId) {
//     this.internalTransactionId = `FT-${Date.now()}-${mongoose.Types.ObjectId().toHexString().slice(-6)}`;
//   }
//   next();
// });


const FiatTransaction = mongoose.model('FiatTransaction', FiatTransactionSchema);

module.exports = FiatTransaction;
