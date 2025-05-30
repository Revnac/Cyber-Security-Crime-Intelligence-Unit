// web_dashboard/backend/models/SecurityEvent.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MitreMappingSchema = new Schema({
  id: { type: String, required: true },    // e.g., TAXXXX or TXXXX.XXX
  name: { type: String, required: true },  // Tactic or Technique Name
  link: { type: String }                   // URL to MITRE ATT&CK page
}, { _id: false });

const SecurityEventSchema = new Schema({
  originalEventId: { // ID from the source system, if available (e.g., Meraki event ID)
    type: String,
    index: true,
    sparse: true // Allows nulls if not all events have it, but if present should be unique with source
  },
  eventSource: { // e.g., 'Meraki-IDS', 'Firewall-X', 'CustomApp'
    type: String,
    required: true,
    index: true
  },
  eventTimestamp: { // When the event occurred
    type: Date,
    required: true,
    index: true,
    default: Date.now
  },
  receivedTimestamp: { // When our system received/ingested the event
    type: Date,
    default: Date.now,
    index: true
  },
  severity: { // Normalized severity if possible
    type: String,
    enum: ['Informational', 'Low', 'Medium', 'High', 'Critical'],
    default: 'Informational'
  },
  description: { // Brief description of the event
    type: String,
    required: true
  },
  mitreAttackMapping: { // Embedded object for MITRE ATT&CK details
    mitre_tactics: [MitreMappingSchema],
    mitre_techniques: [MitreMappingSchema]
    // Example: from sentinel_meraki_integration.py
    // {
    //   "mitre_tactics": [{"id": "TAXXXX", "name": "Tactic Name", "link": "URL"}],
    //   "mitre_techniques": [{"id": "TXXXX.XXX", "name": "Technique Name", "link": "URL"}]
    // }
  },
  rawData: { // The full original event data as JSON or string
    type: Schema.Types.Mixed,
    required: true
  },
  status: { // For managing the lifecycle of this event within our system
    type: String,
    enum: ['New', 'UnderInvestigation', 'Correlated', 'Closed'],
    default: 'New',
    index: true
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  relatedCaseId: { // Link to an AMLCase or a general investigation case if applicable
    type: String, // Using the human-readable caseId from AMLCase for now
    default: null,
    index: true,
    sparse: true
  },
  tags: [String], // General tags for categorization or filtering
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for source-specific original IDs
SecurityEventSchema.index({ eventSource: 1, originalEventId: 1 }, { unique: true, sparse: true });
// Index for MITRE ATT&CK tactics and techniques
SecurityEventSchema.index({ 'mitreAttackMapping.mitre_tactics.id': 1 });
SecurityEventSchema.index({ 'mitreAttackMapping.mitre_techniques.id': 1 });
SecurityEventSchema.index({ tags: 1 });


SecurityEventSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.updatedAt = Date.now();
  }
  next();
});

const SecurityEvent = mongoose.model('SecurityEvent', SecurityEventSchema);

module.exports = SecurityEvent;
