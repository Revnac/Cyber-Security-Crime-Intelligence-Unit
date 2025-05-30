// web_dashboard/backend/routes/fiatIngestionRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer'); // Assumes multer is already a dependency
const fs = require('fs');
const path = require('path');
const fiatIngestionService = require('../services/fiatIngestionService');
const { protect, authorize } = require('../middleware/authMiddleware');
const { auditLog } = require('../utils/logger');

// Configure Multer for file storage (similar to crypto ingestion)
// Ensure UPLOADS_DIR is defined consistently (e.g., relative to backend root)
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
    cb(null, 'fiat-' + file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'text/csv' || file.originalname.match(/\.(csv)$/i)) {
    cb(null, true);
  } else {
    cb(new Error('Only .csv files are allowed for fiat transaction uploads!'), false);
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter, limits: { fileSize: 1024 * 1024 * 50 } }); // 50MB limit

// POST /api/ingest/fiat/csv - Endpoint for Fiat CSV file upload and processing
router.post(
  '/csv',
  protect,
  authorize(['Admin', 'DataEntryClerk']), // Example roles
  upload.single('fiatTransactionsCsv'), // 'fiatTransactionsCsv' is the field name in form-data
  async (req, res) => {
    if (!req.file) {
      auditLog('WARN', 'FIAT_CSV_UPLOAD_NO_FILE', req.user._id, { ip: req.ip });
      return res.status(400).json({ message: 'No CSV file uploaded for fiat transactions.' });
    }

    const ingestedBy = req.user ? req.user._id.toString() : 'System_Unknown';
    try {
      console.log(`Fiat CSV file uploaded: ${req.file.path}`);
      auditLog('INFO', 'FIAT_CSV_UPLOAD_RECEIVED', ingestedBy, { fileName: req.file.originalname, filePath: req.file.path, ip: req.ip });
      
      const summary = await fiatIngestionService.ingestFiatTransactionsFromCSV(req.file.path, ingestedBy);
      
      // Optionally, delete the file after successful processing (or if processing fails partially but summary is generated)
      // fs.unlink(req.file.path, (err) => {
      //   if (err) console.error("Error deleting temporary fiat CSV file:", err);
      //   else console.log(`Successfully deleted temporary fiat CSV file: ${req.file.path}`);
      // });

      if (summary.success) {
        res.status(200).json({ message: 'Fiat CSV processed successfully.', summary });
      } else {
        // If ingestFiatTransactionsFromCSV handles its own errors and returns a summary for partial failures
        res.status(400).json({ message: 'Fiat CSV processing encountered issues.', summary });
      }
    } catch (error) {
      console.error('Error in /api/ingest/fiat/csv endpoint:', error);
      auditLog('ERROR', 'FIAT_CSV_INGESTION_ROUTE_ERROR', ingestedBy, { fileName: req.file ? req.file.originalname : 'N/A', error: error.message, ip: req.ip });
      // Delete the file if a catastrophic error occurs during processing
      // if (req.file && req.file.path) {
      //   fs.unlink(req.file.path, (delErr) => {
      //     if (delErr) console.error("Error deleting fiat CSV file after processing error:", delErr);
      //   });
      // }
      res.status(500).json({ message: 'Error processing Fiat CSV file.', error: error.message });
    }
  }
);

// Multer error handler middleware (should be similar to the one in ingestion.js for crypto)
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        auditLog('WARN', 'FIAT_CSV_UPLOAD_MULTER_ERROR', req.user ? req.user._id.toString() : 'System_Unknown', { error: err.message, field: err.field, ip: req.ip });
        return res.status(400).json({ message: `Multer error for fiat CSV: ${err.message}`, field: err.field });
    } else if (err) {
        // Check for our custom fileFilter error
        if (err.message === 'Only .csv files are allowed for fiat transaction uploads!') {
             auditLog('WARN', 'FIAT_CSV_UPLOAD_INVALID_TYPE', req.user ? req.user._id.toString() : 'System_Unknown', { error: err.message, ip: req.ip });
             return res.status(400).json({ message: err.message });
        }
        auditLog('ERROR', 'FIAT_CSV_UPLOAD_UNKNOWN_ERROR', req.user ? req.user._id.toString() : 'System_Unknown', { error: err.message, ip: req.ip });
        return res.status(500).json({ message: `Unknown upload error for fiat CSV: ${err.message}`});
    }
    next();
});

module.exports = router;
