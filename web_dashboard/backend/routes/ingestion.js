// web_dashboard/backend/routes/ingestion.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cryptoIngestionService = require('../services/cryptoIngestionService');
const { protect, authorize } = require('../middleware/authMiddleware');

// Configure Multer for file storage
// Create an 'uploads/' directory in the backend root if it doesn't exist
const UPLOADS_DIR = path.join(__dirname, '../../uploads'); // Points to backend/uploads/
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    // Use a timestamp to make filenames unique, keep original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only CSV files
  if (file.mimetype === 'text/csv' || file.originalname.match(/\.(csv)$/i)) {
    cb(null, true);
  } else {
    cb(new Error('Only .csv files are allowed!'), false);
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter, limits: { fileSize: 1024 * 1024 * 50 } }); // Limit file size to 50MB

// POST /api/ingest/csv - Endpoint for CSV file upload and processing
router.post(
  '/csv',
  protect, // Ensure user is authenticated
  authorize(['Admin']), // Only allow users with 'Admin' role
  upload.single('transactionsCsv'), // 'transactionsCsv' is the field name in the form-data
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No CSV file uploaded.' });
    }

    try {
      console.log(`File uploaded: ${req.file.path}`);
      const summary = await cryptoIngestionService.ingestTransactionsFromCSV(req.file.path);
      
      // Optionally, delete the file after successful processing
      // fs.unlink(req.file.path, (err) => {
      //   if (err) console.error("Error deleting temporary uploaded file:", err);
      //   else console.log(`Successfully deleted temporary file: ${req.file.path}`);
      // });

      if (summary.success) {
        res.status(200).json({ message: 'CSV processed successfully.', summary });
      } else {
        // If ingestTransactionsFromCSV handles its own errors and returns a summary
        res.status(400).json({ message: 'CSV processing encountered issues.', summary });
      }
    } catch (error) {
      console.error('Error in /api/ingest/csv endpoint:', error);
      // Delete the file if an error occurs during processing
      // fs.unlink(req.file.path, (delErr) => {
      //   if (delErr) console.error("Error deleting file after processing error:", delErr);
      // });
      res.status(500).json({ message: 'Error processing CSV file.', error: error.message });
    }
  }
);

// Middleware to handle multer errors specifically (e.g., file type, size limit)
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading.
        return res.status(400).json({ message: `Multer error: ${err.message}`, field: err.field });
    } else if (err) {
        // An unknown error occurred when uploading.
        if (err.message === 'Only .csv files are allowed!') { // From our fileFilter
             return res.status(400).json({ message: err.message });
        }
        return res.status(500).json({ message: `Unknown upload error: ${err.message}`});
    }
    next();
});


module.exports = router;
