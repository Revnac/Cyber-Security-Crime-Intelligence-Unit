// web_dashboard/backend/routes/locationRoutes.js
const express = require('express');
const router = express.Router();
const LocationPoint = require('../models/LocationPoint');
const LocationTrack = require('../models/LocationTrack'); // For future /tracks endpoint
const { protect, authorize } = require('../middleware/authMiddleware');
const { query, validationResult } = require('express-validator');

// GET /api/location/points - Fetch LocationPoint data with pagination and filtering
router.get(
  '/points',
  protect,
  authorize(['Analyst', 'Investigator', 'Admin']), // Example roles
  [ // Validation rules for query parameters
    query('page').optional().isInt({ min: 1 }).toInt().withMessage('Page must be a positive integer.'),
    query('limit').optional().isInt({ min: 1, max: 1000 }).toInt().withMessage('Limit must be between 1 and 1000.'), // Increased limit for potential map displays
    query('identifier').optional().trim().escape(),
    query('identifierType').optional().trim().escape(),
    query('startDate').optional().isISO8601().toDate().withMessage('Invalid start date format.'),
    query('endDate').optional().isISO8601().toDate().withMessage('Invalid end date format.'),
    query('sourceType').optional().trim().escape(),
    query('associatedCaseId').optional().trim().escape(),
    query('associatedSubjectId').optional().trim().escape(),
    query('eventType').optional().trim().escape(),
    // Geospatial filters:
    // Bounding box: ?bbox=minLng,minLat,maxLng,maxLat
    query('bbox').optional().matches(/^(-?\d+(\.\d+)?),(-?\d+(\.\d+)?),(-?\d+(\.\d+)?),(-?\d+(\.\d+)?)$/)
      .withMessage('Invalid bbox format. Use minLng,minLat,maxLng,maxLat.'),
    // Proximity search: ?lat=latitude&lon=longitude&radiusKm=distanceInKm
    query('lat').optional().isFloat({ min: -90, max: 90 }).toFloat(),
    query('lon').optional().isFloat({ min: -180, max: 180 }).toFloat(),
    query('radiusKm').optional().isFloat({ min: 0.01 }).toFloat()
      .custom((value, { req }) => { // Custom validator to ensure lat/lon are present if radiusKm is
        if (req.query.lat === undefined || req.query.lon === undefined) {
          throw new Error('Latitude (lat) and Longitude (lon) are required if radiusKm is specified.');
        }
        return true;
      }),
    query('sortBy').optional().matches(/^[a-zA-Z_.]+(:(asc|desc))?$/).withMessage('Invalid sortBy format.').trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed for fetching location points.', errors: errors.array() });
    }

    try {
      const {
        page = 1, limit = 100, identifier, identifierType, startDate, endDate,
        sourceType, associatedCaseId, associatedSubjectId, eventType,
        bbox, lat, lon, radiusKm, sortBy
      } = req.query;

      let queryFilters = {};
      if (identifier) queryFilters.identifier = { $regex: identifier, $options: 'i' };
      if (identifierType) queryFilters.identifierType = identifierType;
      if (sourceType) queryFilters.sourceType = sourceType;
      if (associatedCaseId) queryFilters.associatedCaseId = associatedCaseId;
      if (associatedSubjectId) queryFilters.associatedSubjectId = associatedSubjectId;
      if (eventType) queryFilters.eventType = { $regex: eventType, $options: 'i' };

      if (startDate || endDate) {
        queryFilters.timestamp = {};
        if (startDate) queryFilters.timestamp.$gte = startDate;
        if (endDate) queryFilters.timestamp.$lte = endDate;
      }
      
      // Geospatial filters
      if (bbox) {
        const [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(parseFloat);
        queryFilters.location = {
          $geoWithin: {
            $box: [[minLng, minLat], [maxLng, maxLat]]
          }
        };
      } else if (lat !== undefined && lon !== undefined && radiusKm !== undefined) {
        queryFilters.location = {
          $nearSphere: {
            $geometry: { type: "Point", coordinates: [lon, lat] },
            $maxDistance: radiusKm * 1000 // Convert km to meters
          }
        };
      }
      
      let sortOptions = { timestamp: -1 }; // Default sort: newest first
      if (sortBy) {
        const parts = sortBy.split(':');
        const field = parts[0];
        const direction = parts[1] === 'asc' ? 1 : -1;
        // Ensure sorting by 'location' is not directly allowed unless specifically handled
        if (field === 'location') { 
            // Potentially sort by distance if $nearSphere is used, but that's implicit in $nearSphere.
            // For other geo sorts, specific handling may be needed. Defaulting to timestamp.
            console.warn("Sorting directly by 'location' field is complex. Defaulting to timestamp sort.");
        } else {
            sortOptions = { [field]: direction };
        }
      }

      const points = await LocationPoint.find(queryFilters)
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      const totalCount = await LocationPoint.countDocuments(queryFilters);

      res.json({
        data: points,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount: totalCount,
      });
    } catch (error) {
      console.error('Error fetching location points:', error);
      res.status(500).json({ message: 'Server error while fetching location points.', error: error.message });
    }
  }
);

// GET /api/location/tracks - Placeholder for fetching LocationTrack data
router.get(
  '/tracks',
  protect,
  authorize(['Analyst', 'Investigator', 'Admin']),
  [ // Basic validation for placeholder
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('identifier').optional().trim().escape(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed.', errors: errors.array() });
    }
    console.log("Placeholder: /api/location/tracks called with query:", req.query);
    // TODO: Implement actual logic to fetch and return LocationTrack documents
    // This would involve querying the LocationTrack model with filters, pagination,
    // and potentially populating some fields from the referenced LocationPoint documents.
    res.json({ 
        data: [], 
        currentPage: parseInt(req.query.page) || 1, 
        totalPages: 0, 
        totalCount: 0, 
        message: "Location tracks endpoint not fully implemented yet." 
    });
  }
);

// TODO: Add more specific location routes as needed:
// - GET /points/:id (Get a single LocationPoint)
// - GET /tracks/:id (Get a single LocationTrack)

module.exports = router;
