// web_dashboard/backend/routes/crime.js
const express = require('express');
const router = express.Router();
const Crime = require('../models/crime'); // Assuming your Mongoose model is here
const { protect, authorize } = require('../middleware/authMiddleware');
const { body, param, query, validationResult } = require('express-validator');

// --- API Endpoints for Crime Data --- //

// GET all crime data (potentially with pagination and filtering for advanced use)
// Example: GET /api/crime?limit=10&page=1&type=Theft&status=Reported&sortBy=date:desc

const getAllCrimesValidationRules = [
  query('page').optional().isInt({ min: 1 }).toInt().withMessage('Page must be a positive integer.'),
  query('limit').optional().isInt({ min: 1, max: 200 }).toInt().withMessage('Limit must be between 1 and 200.'),
  query('type').optional().trim().escape(),
  query('status').optional().isIn(['Reported', 'Under Investigation', 'Resolved', 'Closed']).withMessage('Invalid status for query.'),
  query('severity').optional().isIn(['Low', 'Medium', 'High', 'Critical']).withMessage('Invalid severity for query.'),
  query('startDate').optional().isISO8601().toDate().withMessage('Invalid start date format.'),
  query('endDate').optional().isISO8601().toDate().withMessage('Invalid end date format.'),
  query('sortBy').optional().matches(/^[a-zA-Z_]+:(asc|desc)$/).withMessage('Invalid sortBy format. Use field:asc or field:desc.').trim()
];

router.get('/', protect, getAllCrimesValidationRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation failed for query parameters.', errors: errors.array() });
  }

  try {
    // Access validated query parameters using req.query
    const { page: reqPage, limit: reqLimit, type: reqType, status: reqStatus, severity: reqSeverity, startDate: reqStartDate, endDate: reqEndDate, sortBy: reqSortBy } = req.query;

    // Basic query object
    let queryBuilder = {}; // Renamed to avoid conflict with 'query' from express-validator
    // Advanced Filtering (examples)
    if (reqType) queryBuilder.type = reqType;
    if (reqStatus) queryBuilder.status = reqStatus;
    if (reqSeverity) queryBuilder.severity = reqSeverity;
    if (reqStartDate && reqEndDate) {
      queryBuilder.date = { $gte: reqStartDate, $lte: reqEndDate };
    } else if (reqStartDate) {
      queryBuilder.date = { $gte: reqStartDate };
    } else if (reqEndDate) {
      queryBuilder.date = { $lte: reqEndDate };
    }

    // Pagination (example)
    const page = reqPage || 1;
    const limit = reqLimit || 100;
    const skip = (page - 1) * limit;

    // Sorting (example: 'date:desc' or 'severity:asc')
    let sort = {};
    if (reqSortBy) {
      const parts = reqSortBy.split(':');
      sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    } else {
      sort = { date: -1 }; // Default sort by newest first
    }

    const crimes = await Crime.find(queryBuilder).sort(sort).skip(skip).limit(limit).lean(); // .lean() for faster plain JS objects
    const totalCrimes = await Crime.countDocuments(queryBuilder);

    // For the frontend map, it might expect 'id', 'lat', 'lng'. Ensure model provides these or transform here.
    // The model's pre-save hook should handle lat/lng from location.coordinates.
    // MongoDB's _id is typically used as 'id'.
    const crimesForClient = crimes.map(crime => ({
        id: crime._id.toString(), // Convert ObjectId to string
        caseNumber: crime.caseNumber,
        description: crime.description,
        date: crime.date,
        type: crime.type,
        address: crime.location ? crime.location.address : '',
        lat: crime.lat, // Should be populated by pre-save hook or directly
        lng: crime.lng, // Should be populated by pre-save hook or directly
        severity: crime.severity,
        status: crime.status,
        narrative: crime.narrative,
        source: crime.source
    }));

    res.json({
        data: crimesForClient,
        totalPages: Math.ceil(totalCrimes / limit),
        currentPage: page,
        totalCount: totalCrimes
    });
  } catch (err) {
    console.error('Error fetching crime data:', err);
    res.status(500).json({ message: 'Server error while fetching crime data.', error: err.message });
  }
});

// GET crime data trends (for charts)
// Example: GET /api/crime/trends?period=monthly&crimeType=Theft

const getTrendsValidationRules = [
  query('period').optional().isIn(['daily', 'monthly', 'yearly']).withMessage('Invalid period for trends.'),
  query('crimeType').optional().trim().escape(),
  query('startDate').optional().isISO8601().toDate().withMessage('Invalid start date format.'),
  query('endDate').optional().isISO8601().toDate().withMessage('Invalid end date format.')
];

router.get('/trends', protect, getTrendsValidationRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation failed for trend query parameters.', errors: errors.array() });
  }

  try {
    const { period: reqPeriod, crimeType: reqCrimeType, startDate: reqStartDate, endDate: reqEndDate } = req.query;

    // Advanced: Allow grouping by day, week, month, year, and filtering by crime type, location, etc.
    // For simplicity, this example groups by date (day by default in schema, adjust format for month/year)
    const period = reqPeriod || 'daily'; // daily, monthly, yearly
    let groupByFormat;
    switch (period) {
        case 'yearly': groupByFormat = '%Y'; break;
        case 'monthly': groupByFormat = '%Y-%m'; break;
        case 'daily':
        default: groupByFormat = '%Y-%m-%d'; break;
    }

    // Add match stage for filtering if needed (e.g., by crime type, date range)
    const matchStage = {};
    if (reqCrimeType) {
        matchStage.type = reqCrimeType;
    }
    // Add date range filtering for trends as well
    if (reqStartDate && reqEndDate) {
      matchStage.date = { $gte: reqStartDate, $lte: reqEndDate };
    } else if (reqStartDate) {
      matchStage.date = { $gte: reqStartDate };
    } else if (reqEndDate) {
      matchStage.date = { $lte: reqEndDate };
    }

    const crimeTrends = await Crime.aggregate([
      { $match: matchStage }, // Optional: filter before grouping
      {
        $group: {
          _id: { $dateToString: { format: groupByFormat, date: '$date' } }, // Group by formatted date string
          crimes: { $sum: 1 } // Count occurrences for each group
        }
      },
      { $sort: { _id: 1 } } // Sort by date ascending
    ]);
    // The frontend chart expects 'date' and 'crimes'. _id from group stage is our 'date'.
    res.json(crimeTrends.map(trend => ({ date: trend._id, crimes: trend.crimes })));
  } catch (err) {
    console.error('Error fetching crime trends:', err);
    res.status(500).json({ message: 'Server error while fetching crime trends.', error: err.message });
  }
});

// POST new crime data (for data entry or integration with other systems)
// This is a more advanced endpoint, ensure proper validation and security.

const createCrimeValidationRules = [
  body('date').optional().isISO8601().toDate().withMessage('Invalid date format.'),
  body('type').optional().trim().escape(),
  body('lat').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90.'),
  body('lng').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180.'),
  body('description').optional().trim().escape(),
  body('address').optional().trim().escape(),
  body('severity').optional().isIn(['Low', 'Medium', 'High', 'Critical']).withMessage('Invalid severity level.'),
  body('status').optional().isIn(['Reported', 'Under Investigation', 'Resolved', 'Closed']).withMessage('Invalid status.'),
  body('caseNumber').optional().trim().escape(),
  body('narrative').optional().trim().escape(),
  body('source').optional().trim().escape()
];

router.post('/', protect, authorize(['Admin', 'Investigator']), createCrimeValidationRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation failed for new crime data.', errors: errors.array() });
  }
  try {
    // Use req.body directly as it contains validated and sanitized data (where applicable by validators like toDate, toInt, escape)
    const newCrimeData = { ...req.body };
    // If lat/lng are provided, ensure location.coordinates is set for GeoJSON if that's the primary storage
    if (newCrimeData.lat != null && newCrimeData.lng != null) {
        newCrimeData.location = {
            type: 'Point',
            coordinates: [parseFloat(newCrimeData.lng), parseFloat(newCrimeData.lat)],
            address: newCrimeData.address
        };
    }

    const crime = new Crime(newCrimeData);
    const savedCrime = await crime.save();
    res.status(201).json(savedCrime);
  } catch (err) {
    console.error('Error saving new crime data:', err);
    if (err.name === 'ValidationError') {
        return res.status(400).json({ message: 'Validation Error', error: err.message, details: err.errors });
    }
    res.status(500).json({ message: 'Server error while saving crime data.', error: err.message });
  }
});

// GET a single crime by ID

const getCrimeByIdValidationRules = [
  param('id').isMongoId().withMessage('Invalid crime ID format.')
];

router.get('/:id', protect, getCrimeByIdValidationRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation failed for crime ID.', errors: errors.array() });
  }
  try {
    const crime = await Crime.findById(req.params.id).lean();
    if (!crime) {
      return res.status(404).json({ message: 'Crime not found' });
    }
    res.json(crime);
  } catch (err) {
    console.error(`Error fetching crime with id ${req.params.id}:`, err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT (update) a crime by ID

const updateCrimeValidationRules = [
  param('id').isMongoId().withMessage('Invalid crime ID format.'),
  body('date').optional().isISO8601().toDate().withMessage('Invalid date format.'),
  body('type').optional().trim().escape(),
  body('lat').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90.'),
  body('lng').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180.'),
  body('description').optional().trim().escape(),
  body('address').optional().trim().escape(),
  body('severity').optional().isIn(['Low', 'Medium', 'High', 'Critical']).withMessage('Invalid severity level.'),
  body('status').optional().isIn(['Reported', 'Under Investigation', 'Resolved', 'Closed']).withMessage('Invalid status.'),
  body('caseNumber').optional().trim().escape(),
  body('narrative').optional().trim().escape(),
  body('source').optional().trim().escape()
];

router.put('/:id', protect, authorize(['Admin', 'Investigator']), updateCrimeValidationRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation failed for updating crime data.', errors: errors.array() });
  }
  try {
    // Use req.body for update data, req.params.id for ID
    const updateData = { ...req.body, updatedAt: Date.now() };
    if (updateData.lat != null && updateData.lng != null) {
        updateData.location = {
            type: 'Point',
            coordinates: [parseFloat(updateData.lng), parseFloat(updateData.lat)],
            address: updateData.address || '' // Ensure address is included if location is updated
        };
    }
    const updatedCrime = await Crime.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true }).lean();
    if (!updatedCrime) {
      return res.status(404).json({ message: 'Crime not found for update' });
    }
    res.json(updatedCrime);
  } catch (err) {
    console.error(`Error updating crime with id ${req.params.id}:`, err);
    if (err.name === 'ValidationError') {
        return res.status(400).json({ message: 'Validation Error', error: err.message, details: err.errors });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE a crime by ID

const deleteCrimeValidationRules = [
  param('id').isMongoId().withMessage('Invalid crime ID format.')
];

router.delete('/:id', protect, authorize(['Admin']), deleteCrimeValidationRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation failed for crime ID.', errors: errors.array() });
  }
  try {
    const deletedCrime = await Crime.findByIdAndDelete(req.params.id);
    if (!deletedCrime) {
      return res.status(404).json({ message: 'Crime not found for deletion' });
    }
    res.json({ message: 'Crime deleted successfully' });
  } catch (err) {
    console.error(`Error deleting crime with id ${req.params.id}:`, err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
