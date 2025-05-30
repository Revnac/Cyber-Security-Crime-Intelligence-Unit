// web_dashboard/backend/models/Entity.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AssociatedWalletAddressSchema = new Schema({
  address: { type: String, required: true, trim: true },
  blockchain: { type: String, required: true, trim: true },
  notes: { type: String, trim: true } // e.g., "Primary operational wallet", "User deposit address"
}, { _id: false });

const EntitySchema = new Schema({
  name: { // Name of the entity
    type: String,
    required: [true, 'Entity name is required.'],
    trim: true,
    index: true
  },
  type: { // e.g., 'Individual', 'Organization', 'Exchange', 'Darknet Market', 'Scam Operator'
    type: String,
    required: [true, 'Entity type is required.'],
    trim: true,
    index: true,
    enum: ['Individual', 'Organization', 'Exchange', 'Virtual Asset Service Provider', 'Darknet Market', 'Mixer', 'Tumbler', 'Scam Operator', 'Terrorist Organization', 'Sanctioned Entity', 'Other'] 
  },
  category: { // e.g., 'Financial Services', 'Illicit Actor', 'High Risk VASP'
    type: String,
    trim: true,
    index: true
  },
  associatedWalletAddresses: [AssociatedWalletAddressSchema],
  riskAssessment: {
    score: { // Overall risk score for the entity, e.g., 0-100
      type: Number,
      min: 0,
      max: 100 // Or another scale
    },
    level: { // e.g., 'Low', 'Medium', 'High', 'Severe'
      type: String,
      enum: ['Low', 'Medium', 'High', 'Severe', 'Unknown'],
      default: 'Unknown'
    },
    assessedBy: { // Analyst who performed assessment
      type: Schema.Types.ObjectId,
      ref: 'User' 
    },
    assessmentDate: { 
      type: Date 
    },
    justification: { // Reasoning for the risk assessment
      type: String,
      trim: true
    },
    sourceOfInformation: { // e.g., "Internal Investigation", "Public Record", "Partner Intelligence"
      type: String,
      trim: true
    }
  },
  aiRiskAssessment: { // AI-driven risk assessment
    score: { type: Number, min: 0, max: 100 }, // Example scale
    level: { 
      type: String, 
      enum: ['Low', 'Medium', 'High', 'Critical', 'Unknown', null],
      default: null 
    },
    lastCalculated: { type: Date },
    modelVersion: { type: String, trim: true },
    contributingFactors: [{ type: String, trim: true }],
    derivedFromWalletRisk: { type: Boolean, default: false } // If score aggregates linked wallet AI risks
  },
  contactInformation: {
    emails: [{ type: String, trim: true, lowercase: true }],
    phoneNumbers: [{ type: String, trim: true }],
    websites: [{ type: String, trim: true }]
  },
  physicalAddresses: [{ // Known physical locations
    type: String,
    trim: true 
  }],
  registrationDetails: { // For organizations/exchanges
    registrationNumber: { type: String, trim: true },
    jurisdiction: { type: String, trim: true, index: true }, // Country/Region of registration
    dateOfIncorporation: { type: Date }
  },
  notes: { // General notes or intelligence about the entity
    type: String,
    trim: true
  },
  linkedEntityIds: [{ // For relationships like parent company, known associate
    type: Schema.Types.ObjectId,
    ref: 'Entity'
  }],
  tags: [{ // Similar to wallet tags, but for entities
    type: String,
    trim: true,
    lowercase: true,
    index: true
  }],
  dataSource: { // Where this entity information originated from in our system
      type: String,
      trim: true,
      default: 'Manual Entry' // Could be 'Blockchain Analysis', 'Partner Feed', etc.
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

// Index for wallet addresses within the array for faster searching
EntitySchema.index({ 'associatedWalletAddresses.address': 1, 'associatedWalletAddresses.blockchain': 1 });
EntitySchema.index({ type: 1, category: 1 });
EntitySchema.index({ 'riskAssessment.level': 1 });


// Pre-save hook to update the `updatedAt` field
EntitySchema.pre('save', function(next) {
  if (!this.isNew) {
    this.updatedAt = Date.now();
  }
  next();
});

const Entity = mongoose.model('Entity', EntitySchema);

module.exports = Entity;
