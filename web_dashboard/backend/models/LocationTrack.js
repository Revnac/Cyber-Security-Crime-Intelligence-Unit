// web_dashboard/backend/models/LocationTrack.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LocationTrackSchema = new Schema({
  identifier: { // e.g., cell phone number, device ID, internal subject ID
    type: String,
    required: [true, 'Identifier for the location track is required.'],
    index: true
  },
  identifierType: {
    type: String,
    enum: ['MSISDN', 'IMEI', 'IMSI', 'DeviceID', 'VehicleID', 'InternalSubjectID', 'Other'],
    default: 'MSISDN',
    index: true
  },
  trackName: { // Optional user-defined name for the track
    type: String,
    trim: true,
    default: null
  },
  locationPoints: [{ // Array of references to LocationPoint documents
    type: Schema.Types.ObjectId,
    ref: 'LocationPoint' 
    // Consider adding an index here if querying tracks based on specific points they contain,
    // though it might be less common than querying points by track.
  }],
  startDate: { // Timestamp of the first point in the track
    type: Date,
    required: [true, 'Start date for the track is required.'],
    index: true
  },
  endDate: { // Timestamp of the last point in the track
    type: Date,
    required: [true, 'End date for the track is required.'],
    index: true
  },
  durationMs: { // Calculated duration of the track in milliseconds
    type: Number,
    min: 0,
    default: 0
    // This would typically be calculated and set by the service layer when the track is created or updated.
  },
  totalDistanceKm: { // Calculated total distance of the track in kilometers
    type: Number,
    min: 0,
    default: 0
    // This would typically be calculated (e.g., summing haversine distances between consecutive points)
    // and set by the service layer. Requires geospatial calculations.
  },
  numberOfPoints: {
    type: Number,
    default: 0,
    min: 0
  },
  summary: { // Optional textual summary of the track
    type: String,
    trim: true,
    default: null
  },
  associatedCaseId: { // Link to an AMLCase.caseId or a general investigation ID string
    type: String,
    index: true,
    sparse: true,
    default: null
  },
  associatedSubjectId: { // Link to an internal subject identifier string
    type: String, 
    index: true,
    sparse: true,
    default: null
  },
  dataSource: { // How this track was generated
    type: String,
    trim: true,
    // Examples: 'DerivedFromLocationPoints_UserX', 'ManualRouteCreation_AnalystY', 'VehicleGPS_UnitZ_LogFile'
    default: 'DerivedFromLocationPoints'
  },
  // Conceptual comments for future enhancements:
  // - calculatedAverageSpeedKmph: Number
  // - significantStops: [{ locationPointId: ObjectId, durationMinutes: Number }]
  // - inferredModeOfTransport: String (e.g., 'Walking', 'Driving', 'Stationary')
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

LocationTrackSchema.index({ identifier: 1, startDate: -1, endDate: -1 }); // Common query for tracks of an identifier
LocationTrackSchema.index({ locationPoints: 1 }, { sparse: true }); // If querying by contained points

// Pre-save hook to update the `updatedAt` field and potentially numberOfPoints
LocationTrackSchema.pre('save', function(next) {
  if (this.isModified('locationPoints')) {
    this.numberOfPoints = this.locationPoints ? this.locationPoints.length : 0;
  }
  // Calculate durationMs if startDate and endDate are set and durationMs is not manually provided or needs update
  if (this.startDate && this.endDate && (this.isModified('startDate') || this.isModified('endDate') || this.durationMs === 0)) {
      this.durationMs = this.endDate.getTime() - this.startDate.getTime();
  }

  if (this.isModified() && !this.isNew) {
    this.updatedAt = Date.now();
  }
  next();
});

// TODO: Add comments regarding calculation of `totalDistanceKm`. This would require a service-layer
// function to iterate through populated locationPoints and sum distances (e.g., Haversine formula).
// It's generally not done via a simple Mongoose pre-save hook if it involves fetching related data.

const LocationTrack = mongoose.model('LocationTrack', LocationTrackSchema);

module.exports = LocationTrack;
