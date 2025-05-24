// web_dashboard/backend/models/WalletAddress.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const WalletAddressSchema = new Schema({
  address: { // The wallet address string
    type: String,
    required: true,
    trim: true,
    index: true 
    // Consider making it unique in combination with blockchain if addresses can exist on multiple chains
    // unique: true, // If globally unique, but usually it's per blockchain
  },
  blockchain: { // e.g., 'Bitcoin', 'Ethereum', 'TRON'
    type: String,
    required: true,
    index: true
  },
  firstSeenAt: { // Timestamp of the first transaction involving this address
    type: Date,
    index: true
  },
  lastSeenAt: { // Timestamp of the most recent transaction
    type: Date,
    index: true
  },
  balance: { // Current balance - may be complex to maintain in real-time
    type: Number,
    default: 0
  },
  totalReceived: { // Sum of all incoming transaction amounts
    type: Number,
    default: 0
  },
  totalSent: { // Sum of all outgoing transaction amounts
    type: Number,
    default: 0
  },
  transactionCount: { // Total number of transactions involving this address
    type: Number,
    default: 0,
    index: true
  },
  riskScore: { // Calculated risk score, e.g., 0-100
    type: Number,
    min: 0,
    max: 100, // Or another scale e.g. 0-10
    index: true,
    default: null // Default to null or a neutral score
  },
  tags: [{ // e.g., 'exchange', 'miner', 'darknet_market', 'scam', 'victim'
    type: String,
    trim: true,
    lowercase: true,
    index: true
  }],
  associatedEntityIds: [{ // Links to known entities
    type: Schema.Types.ObjectId,
    ref: 'Entity' // Assumes an 'Entity' model will be created
  }],
  notes: { // Analyst notes about this address
    type: String,
    trim: true
  },
  lastAnalyzedAt: { // Timestamp when risk scoring or analysis was last performed
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create a compound unique index for address + blockchain to ensure address uniqueness per blockchain
WalletAddressSchema.index({ address: 1, blockchain: 1 }, { unique: true });

// Pre-save hook to update the `updatedAt` field
WalletAddressSchema.pre('save', function(next) {
  if (!this.isNew) { // Do not update on initial creation
    this.updatedAt = Date.now();
  }
  next();
});

// Consider virtuals for calculated fields if needed, e.g., net_activity
// WalletAddressSchema.virtual('netActivity').get(function() {
//   return this.totalReceived - this.totalSent;
// });

const WalletAddress = mongoose.model('WalletAddress', WalletAddressSchema);

module.exports = WalletAddress;
