// web_dashboard/backend/routes/locationIngestionRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer'); // Assumes multer is already a dependency
const fs = require('fs');
const path = require('path');
const locationIngestionService = require('../services/locationIngestionService');
const { protect, authorize } = require('../middleware/authMiddleware');
const { body, validationResult } = require('express-validator'); // For validating body fields like dataSource
const { auditLog } = require('../utils/logger');

// Configure Multer for file storage (consistent with other ingestion routes)
const UPLOADS_DIR = path.join(__dirname, '../../uploads'); // Points to backend/uploads/
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'location-' + file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'text/csv' || file.originalname.match(/\.(csv)$/i)) {
    cb(null, true);
  } else {
    cb(new Error('Only .csv files are allowed for location data uploads!'), false);
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter, limits: { fileSize: 1024 * 1024 * 100 } }); // 100MB limit for potentially large location CSVs

// POST /api/ingest/location/csv - Endpoint for LocationPoint CSV file upload and processing
router.post(
  '/csv',
  protect,
  authorize(['Admin', 'DataEntryClerk', 'GISAnalyst']), // Example roles
  upload.single('locationDataCsv'), // 'locationDataCsv' is the field name in form-data
  [ // Validation for optional form fields sent along with the file
    body('dataSource').optional().trim().escape().isLength({ min: 2, max: 100 }).withMessage('Data source description is invalid length.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // If file was uploaded despite validation error on other fields, delete it.
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, (delErr) => {
          if (delErr) console.error("Error deleting temporary uploaded file after validation error:", delErr);
        });
      }
      return res.status(400).json({ message: 'Validation failed for form fields.', errors: errors.array() });
    }

    if (!req.file) {
      auditLog('WARN', 'LOCATION_CSV_UPLOAD_NO_FILE', req.user._id.toString(), { ip: req.ip });
      return res.status(400).json({ message: 'No CSV file uploaded for location data.' });
    }

    const ingestedBy = req.user._id.toString();
    const dataSourceFromReq = req.body.dataSource || `CSV_Upload_${req.file.originalname}`; // Use filename if not specified

    try {
      console.log(`LocationPoint CSV file uploaded: ${req.file.path}`);
      auditLog('INFO', 'LOCATION_CSV_UPLOAD_RECEIVED', ingestedBy, { fileName: req.file.originalname, filePath: req.file.path, dataSource: dataSourceFromReq, ip: req.ip });
      
      const summary = await locationIngestionService.ingestLocationPointsFromCSV(req.file.path, ingestedBy, dataSourceFromReq);
      
      // Optionally, delete the file after successful processing (or based on summary)
      // fs.unlink(req.file.path, (err) => { /* ... */ });

      if (summary.success) {
        res.status(200).json({ message: 'LocationPoint CSV processed successfully.', summary });
      } else {
        res.status(400).json({ message: 'LocationPoint CSV processing encountered issues.', summary });
      }
    } catch (error) {
      console.error('Error in /api/ingest/location/csv endpoint:', error);
      auditLog('ERROR', 'LOCATION_CSV_INGESTION_ROUTE_ERROR', ingestedBy, { fileName: req.file ? req.file.originalname : 'N/A', error: error.message, ip: req.ip });
      // if (req.file && req.file.path) { fs.unlink(req.file.path, (delErr) => { /* ... */ }); }
      res.status(500).json({ message: 'Error processing LocationPoint CSV file.', error: error.message });
    }
  }
);

// POST /api/ingest/location/track - Placeholder for creating a LocationTrack
router.post(
  '/track',
  protect,
  authorize(['Analyst', 'Investigator', 'Admin']),
  [ // Basic validation for conceptual endpoint
    body('identifier').notEmpty().trim().escape(),
    body('identifierType').optional().trim().escape(),
    body('points').isArray({min: 2}).withMessage('At least two location points are required to form a track.'),
    // TODO: Add validation for structure of objects within 'points' array if they are full data
    // Or if they are ObjectIds: body('points.*').isMongoId()
    body('trackName').optional().trim().escape(),
    body('dataSource').optional().trim().escape()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed for creating location track.', errors: errors.array() });
    }
    
    const { identifier, identifierType, points, trackName, dataSource, associatedCaseId, associatedSubjectId } = req.body;
    const createdBy = req.user._id.toString();

    try {
      console.log(`Request to create LocationTrack for identifier ${identifier} (Placeholder).`);
      auditLog('INFO', 'LOCATION_TRACK_CREATION_API_REQUESTED', createdBy, { identifier, pointsCount: points.length, trackName, ip: req.ip });

      // Call placeholder service function
      const result = await locationIngestionService.createTrackFromPoints(
        identifier, identifierType, points, trackName, 
        dataSource || 'ManualAPIEntry', 
        associatedCaseId, associatedSubjectId, 
        createdBy
      );
      
      // The placeholder currently returns a simple message.
      // When implemented, it would return the created LocationTrack document.
      res.status(201).json(result); 

    } catch (error) {
      console.error('Error in /api/ingest/location/track endpoint:', error);
      auditLog('ERROR', 'LOCATION_TRACK_CREATION_API_ERROR', createdBy, { identifier, error: error.message, ip: req.ip });
      res.status(500).json({ message: 'Error creating location track.', error: error.message });
    }
  }
);


// Multer error handler (consistent with other ingestion routes)
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        const userIdForLog = req.user ? req.user._id.toString() : 'System_Unknown_Multer';
        auditLog('WARN', 'LOCATION_CSV_UPLOAD_MULTER_ERROR', userIdForLog, { error: err.message, field: err.field, ip: req.ip });
        return res.status(400).json({ message: `Multer error for location CSV: ${err.message}`, field: err.field });
    } else if (err) {
        const userIdForLog = req.user ? req.user._id.toString() : 'System_Unknown_UploadErr';
        if (err.message === 'Only .csv files are allowed for location data uploads!') {
             auditLog('WARN', 'LOCATION_CSV_UPLOAD_INVALID_TYPE', userIdForLog, { error: err.message, ip: req.ip });
             return res.status(400).json({ message: err.message });
        }
        auditLog('ERROR', 'LOCATION_CSV_UPLOAD_UNKNOWN_ERROR', userIdForLog, { error: err.message, ip: req.ip });
        return res.status(500).json({ message: `Unknown upload error for location CSV: ${err.message}`});
    }
    next();
});

module.exports = router;
