// web_dashboard/backend/models/crime.js
const mongoose = require('mongoose');

// Define the schema for crime data.
// This is a basic schema. For advanced use, consider adding more fields,
// indexing, and specific data types based on actual data.
const crimeSchema = new mongoose.Schema({
  // A unique identifier for the crime, if not using MongoDB's default _id
  // id: { type: String, unique: true, required: false }, // Or use default _id
  caseNumber: { type: String, unique: true, sparse: true }, // Official case number, might not always exist initially
  description: { type: String, required: false },
  date: { type: Date, required: true, default: Date.now }, // Date and time of the crime or report
  type: { type: String, required: false }, // Type of crime (e.g., theft, assault)
  location: {
    type: {
      type: String,
      enum: ['Point'], // GeoJSON type
      required: false // Becomes required if lat/lng are provided
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: false 
    },
    address: { type: String } // Street address or description of location
  },
  // For direct use with CrimeMap.js, which expects 'lat' and 'lng'
  // These can be virtuals based on location.coordinates or stored directly if preferred.
  lat: { type: Number, required: false }, 
  lng: { type: Number, required: false },

  // Additional fields for advanced analysis
  severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'] }, // Crime severity level
  status: { type: String, enum: ['Reported', 'Under Investigation', 'Resolved', 'Closed'], default: 'Reported' }, // Current status of the case
  narrative: { type: String }, // Detailed description or narrative of the event
  source: { type: String }, // Source of the crime report (e.g., 'Officer Report', 'Public Tip', 'Sensor')

  // Timestamps for record creation and updates
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for geospatial queries if using GeoJSON 'location' field
// crimeSchema.index({ location: '2dsphere' });

// Index for common query fields for performance
crimeSchema.index({ date: -1 });
crimeSchema.index({ type: 1 });
crimeSchema.index({ status: 1 });

// Middleware to update `updatedAt` field before saving
crimeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  // If lat/lng are not set but location.coordinates is, populate them
  if (this.location && this.location.coordinates && this.location.coordinates.length === 2) {
    if (this.lat == null) this.lat = this.location.coordinates[1]; // GeoJSON is [lng, lat]
    if (this.lng == null) this.lng = this.location.coordinates[0];
    if (!this.location.type) this.location.type = 'Point';
  }
  next();
});

// Create the model from the schema.
// The first argument is the singular name of the collection your model is for.
// Mongoose automatically looks for the plural, lowercased version of your model name.
// Thus, for 'Crime', the model will be for the 'crimes' collection.
const Crime = mongoose.model('Crime', crimeSchema);

module.exports = Crime;
