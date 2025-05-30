// web_dashboard/backend/models/LocationPoint.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LocationPointSchema = new Schema({
  identifier: { // e.g., cell phone number, device ID, internal subject ID
    type: String,
    required: [true, 'Identifier for the location point is required.'],
    index: true
  },
  identifierType: {
    type: String,
    enum: ['MSISDN', 'IMEI', 'IMSI', 'DeviceID', 'VehicleID', 'InternalSubjectID', 'Other'],
    default: 'MSISDN',
    index: true
  },
  timestamp: {
    type: Date,
    required: [true, 'Timestamp for the location point is required.'],
    index: true
  },
  latitude: {
    type: Number,
    required: [true, 'Latitude is required.'],
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    required: [true, 'Longitude is required.'],
    min: -180,
    max: 180
  },
  location: { // GeoJSON Point for geospatial queries
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: { // [longitude, latitude]
      type: [Number],
      required: true 
    }
  },
  accuracy: { // Estimated accuracy in meters, if available
    type: Number, 
    min: 0,
    default: null
  },
  sourceType: { // How was this location determined?
    type: String,
    enum: ['CellTowerTriangulation', 'GPS', 'AGPS', 'WiFiHotspot', 'IPAddress', 'ManualInput', 'Other'],
    default: 'Other'
  },
  cellTowerInfo: { // Optional, if sourceType is CellTower
    cellId: { type: String, trim: true },      // Cell Global Identity (CGI) or specific cell ID
    lac: { type: String, trim: true },         // Location Area Code
    mcc: { type: String, trim: true },         // Mobile Country Code
    mnc: { type: String, trim: true }          // Mobile Network Code
  },
  // New Advanced Fields
  geohash: { 
    type: String, 
    index: true, 
    sparse: true, // Allows nulls but indexes if present
    trim: true 
  },
  quadkey: { 
    type: String, 
    index: true, 
    sparse: true, 
    trim: true 
  },
  eventType: { // e.g., 'DevicePings', 'OfficerCheckIn', 'VehicleMovement', 'TransactionLocation', 'CyberAttackOriginIP'
    type: String, 
    trim: true, 
    index: true,
    default: null // Or a more generic default like 'Observation'
  },
  sourceConfidence: { // Confidence in this specific location point data
    type: Number, 
    min: 0, 
    max: 1, // e.g., 0.9 for GPS, 0.5 for cell tower
    default: null 
  },
  contextualTags: [{ // e.g., 'NearHighCrimeZone', 'WithinEventPerimeter', 'AnomalousLocationForUser', 'NightTimeLocation'
    type: String, 
    trim: true, 
    lowercase: true, 
    index: true 
  }],
  altitude: { // In meters
    type: Number, 
    default: null 
  }, 
  speed: { // In meters/second
    type: Number, 
    min: 0, 
    default: null 
  }, 
  heading: { // Degrees from North
    type: Number, 
    min: 0, 
    max: 360, 
    default: null 
  },
  // End New Advanced Fields
  dataSource: { // Source of this data record
    type: String,
    trim: true,
    // Examples: 'MNO_Vodacom_CDR_File_XYZ.csv', 'MNO_MTN_GPS_Dump_API', 'AnalystManualEntry_Case123'
    required: [true, 'Data source for the location point is required.']
  },
  associatedCaseId: { // Link to an AMLCase.caseId or a general investigation ID string
    type: String,
    index: true,
    sparse: true, // Allows nulls, but if present, can be indexed
    default: null
  },
  associatedSubjectId: { // Link to an internal subject identifier string
    type: String, 
    index: true,
    sparse: true,
    default: null
  },
  notes: {
      type: String,
      trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: { // Not frequently updated, but good practice
    type: Date,
    default: Date.now
  }
});

// Create 2dsphere index for geospatial queries on the 'location' field
LocationPointSchema.index({ location: '2dsphere' });
LocationPointSchema.index({ identifier: 1, timestamp: -1 }); // Common query for tracking an identifier
// Indexes for geohash, quadkey, eventType, contextualTags are defined inline in the schema.

// Pre-save hook to ensure 'location' field is populated from latitude/longitude
LocationPointSchema.pre('save', function(next) {
  if (this.isModified('latitude') || this.isModified('longitude') || !this.location) {
    if (typeof this.longitude === 'number' && typeof this.latitude === 'number') {
      this.location = {
        type: 'Point',
        coordinates: [this.longitude, this.latitude]
      };
    } else {
      // Handle cases where lat/lng might not be set, though they are required
      // Or remove this pre-save hook and ensure 'location' is always provided by the application logic
      this.location = undefined; // Or throw error if lat/lng are always expected
    }
  }
  
  if (this.isModified() && !this.isNew) {
    this.updatedAt = Date.now();
  }
  next();
});

const LocationPoint = mongoose.model('LocationPoint', LocationPointSchema);

module.exports = LocationPoint;
