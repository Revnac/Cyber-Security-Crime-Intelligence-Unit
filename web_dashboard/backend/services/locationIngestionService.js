// web_dashboard/backend/services/locationIngestionService.js
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser'); // Assumes csv-parser is already a dependency
const LocationPoint = require('../models/LocationPoint');
const LocationTrack = require('../models/LocationTrack'); // For placeholder function
const { auditLog } = require('../utils/logger');

/**
 * Processes and saves a single location point data object.
 * Creates a new LocationPoint document for each call.
 * @param {object} locationPointData - An object conforming to the LocationPoint schema.
 * @returns {Promise<object>} - The saved LocationPoint document.
 */
const processLocationPoint = async (locationPointData) => {
  // Basic validation for core fields expected from CSV mapping
  if (!locationPointData.identifier || !locationPointData.timestamp || 
      locationPointData.latitude === undefined || locationPointData.longitude === undefined) {
    throw new Error('Missing required fields for location point (identifier, timestamp, latitude, longitude).');
  }
  // Latitude and longitude validation is in the Mongoose schema

  try {
    // The pre-save hook in LocationPoint model will populate the GeoJSON 'location' field.
    const newLocationPoint = new LocationPoint(locationPointData);
    await newLocationPoint.save();
    // console.log(`Processed location point for identifier: ${newLocationPoint.identifier}`); // Keep minimal in bulk
    return newLocationPoint;
  } catch (error) {
    console.error(`Error processing location point for ${locationPointData.identifier} at ${locationPointData.timestamp}:`, error.message);
    throw error;
  }
};

/**
 * Ingests LocationPoint data from a CSV file.
 * @param {string} filePath - Absolute path to the CSV file.
 * @param {string} ingestedByUserId - ID of user performing ingestion.
 * @param {string} dataSourceFromReq - Optional dataSource string from the request, overrides CSV column if provided.
 * @returns {Promise<object>} - Summary of the ingestion process.
 */
const ingestLocationPointsFromCSV = async (filePath, ingestedByUserId = 'System_CSV_Upload', dataSourceFromReq = null) => {
  console.log(`Starting LocationPoint CSV ingestion from: ${filePath}`);
  if (!fs.existsSync(filePath)) {
    console.error(`LocationPoint CSV file not found: ${filePath}`);
    auditLog('ERROR', 'LOCATION_CSV_INGESTION_FAILURE_FILE_NOT_FOUND', ingestedByUserId, { filePath });
    return { success: false, message: 'CSV file not found.', processed: 0, saved: 0, failed: 0 };
  }

  let processedCount = 0;
  let savedCount = 0;
  let failedCount = 0;

  // Define expected CSV column headers (lowercase and underscore for robustness)
  const columnMapping = {
    identifier: 'identifier', // Required
    identifier_type: 'identifierType', // Enum, defaults in schema
    timestamp: 'timestamp', // Required, ISO8601 format
    latitude: 'latitude', // Required
    longitude: 'longitude', // Required
    accuracy_meters: 'accuracy',
    source_type: 'sourceType', // Enum, defaults in schema
    cell_id: 'cellTowerInfo.cellId',
    lac: 'cellTowerInfo.lac',
    mcc: 'cellTowerInfo.mcc',
    mnc: 'cellTowerInfo.mnc',
    geohash: 'geohash',
    quadkey: 'quadkey',
    event_type: 'eventType',
    source_confidence: 'sourceConfidence', // Number 0-1
    contextual_tags_comma_separated: 'contextualTags', // e.g., "tag1,tag2,tag3"
    altitude_meters: 'altitude',
    speed_mps: 'speed',
    heading_degrees: 'heading',
    associated_case_id: 'associatedCaseId',
    associated_subject_id: 'associatedSubjectId',
    notes: 'notes',
    data_source_in_csv: 'dataSource' // If CSV has a column for data source per row
  };
  console.log("Expected LocationPoint CSV column mapping (after header sanitization):", columnMapping);

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv({
        mapHeaders: ({ header }) => header.trim().toLowerCase().replace(/\s+/g, '_'),
      }))
      .on('data', async (row) => {
        processedCount++;
        const locationPointData = {};
        try {
          for (const csvHeader in columnMapping) {
            const modelPath = columnMapping[csvHeader];
            if (row[csvHeader] !== undefined && row[csvHeader] !== '') {
              const keys = modelPath.split('.');
              let current = locationPointData;
              keys.forEach((key, index) => {
                if (index === keys.length - 1) { // Last key, assign value
                  if (['latitude', 'longitude', 'accuracy', 'sourceConfidence', 'altitude', 'speed', 'heading'].includes(key)) {
                    current[key] = parseFloat(row[csvHeader]);
                    if (isNaN(current[key])) current[key] = null;
                  } else if (modelPath === 'timestamp') {
                    current[key] = new Date(row[csvHeader]);
                    if (isNaN(current[key].getTime())) current[key] = null;
                  } else if (modelPath === 'contextualTags') {
                    current[key] = row[csvHeader].split(',').map(tag => tag.trim()).filter(t => t);
                  } else {
                    current[key] = row[csvHeader];
                  }
                } else { // Not the last key, ensure object path exists
                  current[key] = current[key] || {};
                  current = current[key];
                }
              });
            }
          }
          
          // Override dataSource if provided from request, else use from CSV or schema default
          locationPointData.dataSource = dataSourceFromReq || locationPointData.dataSource || 'CSV_Upload_Generic';
          if (!locationPointData.identifierType && locationPointData.identifier) { // Default identifierType if not in CSV
              locationPointData.identifierType = 'MSISDN'; // Or based on identifier pattern
          }


          await processLocationPoint(locationPointData);
          savedCount++;
        } catch (error) {
          failedCount++;
          console.error(`Error processing LocationPoint CSV row ${processedCount}:`, error.message, "\nRow data:", row);
        }
      })
      .on('end', () => {
        console.log('LocationPoint CSV file successfully processed.');
        auditLog('INFO', 'LOCATION_CSV_INGESTION_SUCCESS', ingestedByUserId, { filePath, processed: processedCount, saved: savedCount, failed: failedCount });
        resolve({ success: true, message: 'LocationPoint CSV ingestion complete.', processed: processedCount, saved: savedCount, failed: failedCount });
      })
      .on('error', (error) => {
        console.error('Error reading LocationPoint CSV file stream:', error);
        auditLog('ERROR', 'LOCATION_CSV_INGESTION_FAILURE_STREAM_ERROR', ingestedByUserId, { filePath, error: error.message });
        reject({ success: false, message: error.message, processed: processedCount, saved: savedCount, failed: failedCount });
      });
  });
};

/**
 * (Conceptual Placeholder) Creates a LocationTrack from an array of LocationPoint data or IDs.
 * @param {string} identifier - The identifier for the track.
 * @param {string} identifierType - The type of the identifier.
 * @param {Array<string|object>} points - Array of LocationPoint ObjectIds or LocationPoint data objects.
 * @param {string} trackName - Optional name for the track.
 * @param {string} dataSource - Source of this track information.
 * @param {string} [associatedCaseId] - Optional case ID.
 * @param {string} [associatedSubjectId] - Optional subject ID.
 * @param {string} createdByUserId - User ID creating the track.
 * @returns {Promise<object|null>} The created LocationTrack document or null.
 */
const createTrackFromPoints = async (identifier, identifierType, points, trackName, dataSource, associatedCaseId, associatedSubjectId, createdByUserId = 'System') => {
  console.log(`Placeholder: Request to create LocationTrack for identifier ${identifier}. Points count: ${points.length}`);
  auditLog('INFO', 'LOCATION_TRACK_CREATION_REQUESTED', createdByUserId, { identifier, pointsCount: points.length, trackName });

  // TODO:
  // 1. Validate inputs.
  // 2. If points are ObjectIds, fetch them. Ensure they are sorted by timestamp.
  // 3. If points are data objects, they should already be sorted or be LocationPoint instances.
  // 4. Determine startDate, endDate from the points.
  // 5. Calculate durationMs.
  // 6. (Advanced) Calculate totalDistanceKm by iterating through points.
  // 7. Create and save new LocationTrack document.
  //    const newTrack = new LocationTrack({ identifier, identifierType, locationPoints: pointIds, startDate, endDate, durationMs, totalDistanceKm, numberOfPoints: points.length, trackName, dataSource, associatedCaseId, associatedSubjectId });
  //    await newTrack.save();
  //    return newTrack;
  
  return Promise.resolve({ 
    message: "LocationTrack creation placeholder. Not implemented.", 
    trackName: trackName || `Track for ${identifier}`,
    identifier,
    numberOfPoints: points.length 
  });
};


module.exports = {
  ingestLocationPointsFromCSV,
  processLocationPoint,
  createTrackFromPoints,
};
