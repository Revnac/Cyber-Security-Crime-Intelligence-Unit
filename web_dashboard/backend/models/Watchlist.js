// web_dashboard/backend/models/Watchlist.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const WatchlistSchema = new Schema({
  identifier: { // The actual item being watchlisted
    type: String,
    required: [true, 'Identifier is required.'],
    trim: true
  },
  identifierType: {
    type: String,
    required: [true, 'Identifier type is required.'],
    enum: ['CRYPTO_ADDRESS', 'ENTITY_NAME', 'WEBSITE_URL', 'IP_ADDRESS', 'EMAIL_ADDRESS', 'PHONE_NUMBER', 'OTHER'],
    index: true
  },
  blockchain: { // Conditional, e.g., for 'CRYPTO_ADDRESS'
    type: String,
    trim: true,
    default: null // Default to null if not applicable
    // Consider making this required if identifierType is 'CRYPTO_ADDRESS' via custom validator or schema logic
  },
  riskLevel: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical', 'Informational'],
    default: 'High',
    index: true
  },
  source: { // Source of this watchlist information
    type: String,
    trim: true,
    required: [true, 'Source of watchlist item is required.']
  },
  reason: { // Reason for adding to the watchlist
    type: String,
    trim: true,
    required: [true, 'Reason for watchlisting is required.']
  },
  associatedEntity: { // Optional link to an Entity model
    type: Schema.Types.ObjectId,
    ref: 'Entity',
    default: null
  },
  isActive: { // To allow deactivating watchlist items without deleting
    type: Boolean,
    default: true,
    index: true
  },
  addedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastMatchedAt: { // Timestamp of the last time this item was matched
    type: Date,
    default: null
  },
  notes: { // Additional notes or context
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
});

// Compound unique index to prevent duplicate entries for the same identifier, type, and blockchain (if applicable)
// For CRYPTO_ADDRESS, blockchain should be part of the uniqueness.
// For other types, blockchain might be null, so the index needs to handle sparse nulls or be conditional.
// A simpler approach for now is to ensure application logic handles uniqueness checks before saving,
// or use a more complex unique index with partialFilterExpression if your MongoDB version supports it well.
// For now, let's index the main fields used for lookups:
WatchlistSchema.index({ identifier: 1, identifierType: 1, blockchain: 1, isActive: 1 }, { name: "watchlist_compound_lookup_idx" });
// Consider a unique index if business logic strictly requires it and duplicates are harmful:
// WatchlistSchema.index({ identifier: 1, identifierType: 1, blockchain: 1 }, { unique: true, partialFilterExpression: { blockchain: { $ne: null } } });
// WatchlistSchema.index({ identifier: 1, identifierType: 1 }, { unique: true, partialFilterExpression: { blockchain: null } });


// Pre-save hook to update the `updatedAt` field
WatchlistSchema.pre('save', function(next) {
  if (this.isModified()) { // Update if any field is modified
    this.updatedAt = Date.now();
  }
  // Ensure blockchain is null if identifierType is not CRYPTO_ADDRESS, or handle as needed
  if (this.identifierType !== 'CRYPTO_ADDRESS') {
    this.blockchain = null; 
  }
  next();
});

const Watchlist = mongoose.model('Watchlist', WatchlistSchema);

module.exports = Watchlist;
