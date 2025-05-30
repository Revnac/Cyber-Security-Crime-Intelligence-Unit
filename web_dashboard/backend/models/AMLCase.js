// web_dashboard/backend/models/AMLCase.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AttachmentSchema = new Schema({
  fileName: { type: String, required: true },
  filePath: { type: String, required: true }, // Path or URL to the stored file
  fileType: { type: String }, // e.g., 'application/pdf', 'image/jpeg'
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  uploadDate: { type: Date, default: Date.now }
}, { _id: false });

const InvestigationNoteSchema = new Schema({
  note: { type: String, required: true, trim: true },
  author: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: false // <<< MODIFIED
  }, 
  isSystemGenerated: { // <<< ADDED
    type: Boolean,
    default: false
  },
  timestamp: { type: Date, default: Date.now }
}, { _id: true }); // _id: true to allow each note to have its own ID for easier updates/deletions if needed

const AMLCaseSchema = new Schema({
  caseId: { // Human-readable case/alert ID, e.g., "AML-YYYYMMDD-XXXXX"
    type: String,
    required: true,
    unique: true,
    index: true,
    // Consider a pre-save hook or a separate utility to generate this ID sequentially/uniquely
  },
  status: {
    type: String,
    required: true,
    enum: ['New', 'Open', 'Under Investigation', 'Pending Review', 'EscalatedToAuthorities', 'SARFiled', 'Closed-FalsePositive', 'Closed-Resolved', 'Closed-Other'],
    default: 'New',
    index: true
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium',
    index: true
  },
  ruleTriggered: { // Name or ID of the AML rule that generated the alert
    type: String,
    trim: true,
    index: true
  },
  triggeringCryptoTransactions: [{ // Renamed from triggeringTransactions
    type: Schema.Types.ObjectId,
    ref: 'CryptoTransaction'
  }],
  triggeringFiatTransactions: [{ // <<< ADDED
    type: Schema.Types.ObjectId,
    ref: 'FiatTransaction',
    default: []
  }],
  triggeringWalletAddresses: [{
    type: Schema.Types.ObjectId,
    ref: 'WalletAddress'
  }],
  associatedEntities: [{
    type: Schema.Types.ObjectId,
    ref: 'Entity'
  }],
  summary: { // Brief summary of the alert/case
    type: String,
    required: [true, 'Case summary is required.'],
    trim: true
  },
  detailedDescription: { // More detailed explanation or initial findings
    type: String,
    trim: true
  },
  totalCaseValueUSD: { // <<< ADDED
    type: Number,
    default: 0
    // Estimated total value of all linked transactions (crypto and fiat) in USD. 
    // May require a separate calculation step/service to update.
  },
  assignedTo: { // Analyst assigned to the case
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    default: null
  },
  openedAt: { // When the alert/case was created
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  closedAt: { // When the case was closed
    type: Date,
    default: null
  },
  resolutionDetails: { // Details of how the case was resolved
    type: String,
    trim: true
  },
  aiInsights: { // <<< ADDED
    confidenceOfAlert: { type: Number, min: 0, max: 1 }, // If case originated from an AI alert
    suggestedNextActions: [{ type: String, trim: true }],
    relatedPatternId: { type: String, trim: true, default: null }, // Link to a detected pattern
    riskFactors: [{ type: String, trim: true }] // Key textual risk factors
  },
  sarFiled: { // Suspicious Activity Report details
    filed: { type: Boolean, default: false },
    dateFiled: { type: Date, default: null },
    referenceNumber: { type: String, trim: true, default: null }
  },
  attachments: [AttachmentSchema],
  investigationNotes: [InvestigationNoteSchema]
});

// Pre-save hook to update the `updatedAt` field
AMLCaseSchema.pre('save', function(next) {
  if (this.isModified()) { // Update if any field is modified, not just non-new
      this.updatedAt = Date.now();
  }
  // If status changes to a "closed" state, set closedAt
  if (this.isModified('status') && 
      (this.status.startsWith('Closed-') || this.status === 'SARFiled') && // Assuming SARFiled also closes the internal case
      !this.closedAt) {
    this.closedAt = Date.now();
  }
  next();
});

// Example for generating caseId - this is a simplified approach.
// A more robust system might use a dedicated sequence generator or a more complex algorithm.
// This hook should be used carefully, especially in distributed environments.
// AMLCaseSchema.pre('validate', async function(next) {
//   if (this.isNew && !this.caseId) {
//     const today = new Date();
//     const year = today.getFullYear();
//     const month = String(today.getMonth() + 1).padStart(2, '0');
//     const day = String(today.getDate()).padStart(2, '0');
//     // This count logic is NOT concurrency-safe for high volume.
//     // Consider a separate counter collection in MongoDB or another strategy.
//     const count = await this.constructor.countDocuments({ openedAt: { $gte: new Date(year, today.getMonth(), day) } });
//     this.caseId = `AML-${year}${month}${day}-${String(count + 1).padStart(5, '0')}`;
//   }
//   next();
// });


const AMLCase = mongoose.model('AMLCase', AMLCaseSchema);

module.exports = AMLCase;
