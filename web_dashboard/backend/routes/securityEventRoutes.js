// web_dashboard/backend/routes/securityEventRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { body, param, query, validationResult } = require('express-validator');
const securityEventService = require('../services/securityEventService');
const SecurityEvent = require('../models/SecurityEvent'); // <<< ADDED

// GET /api/events - Fetch security events with pagination and filtering
router.get(
  '/', // Path is relative to /api/events defined in app.js
  protect,
  authorize(['Analyst', 'Investigator', 'Admin']),
  [
    query('page').optional().isInt({ min: 1 }).toInt().withMessage('Page must be a positive integer.'),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('Limit must be between 1 and 100.'),
    query('eventSource').optional().trim().escape(),
    query('severity').optional().isIn(['Informational', 'Low', 'Medium', 'High', 'Critical']).withMessage('Invalid severity value.'),
    query('status').optional().isIn(['New', 'UnderInvestigation', 'Correlated', 'Closed']).withMessage('Invalid status value.'),
    query('startDate').optional().isISO8601().toDate().withMessage('Invalid start date format.'),
    query('endDate').optional().isISO8601().toDate().withMessage('Invalid end date format.'),
    query('mitreTacticId').optional().trim().escape().matches(/^TA\d{4}$/).withMessage('Invalid MITRE Tactic ID format (e.g., TA0001).'),
    query('mitreTechniqueId').optional().trim().escape().matches(/^T\d{4}(\.\d{3})?$/).withMessage('Invalid MITRE Technique ID format (e.g., T1234 or T1234.001).'),
    query('sortBy').optional().matches(/^[a-zA-Z_.]+(:(asc|desc))?$/).withMessage('Invalid sortBy format. Use field or field:asc/desc.').trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed for fetching security events.', errors: errors.array() });
    }

    try {
      const {
        page = 1,
        limit = 20,
        eventSource,
        severity,
        status,
        startDate,
        endDate,
        mitreTacticId,
        mitreTechniqueId,
        sortBy
      } = req.query;

      let queryFilters = {};
      if (eventSource) queryFilters.eventSource = { $regex: eventSource, $options: 'i' };
      if (severity) queryFilters.severity = severity;
      if (status) queryFilters.status = status;

      if (startDate || endDate) {
        queryFilters.eventTimestamp = {};
        if (startDate) queryFilters.eventTimestamp.$gte = startDate;
        if (endDate) queryFilters.eventTimestamp.$lte = endDate;
      }

      if (mitreTacticId) queryFilters['mitreAttackMapping.mitre_tactics.id'] = mitreTacticId;
      if (mitreTechniqueId) queryFilters['mitreAttackMapping.mitre_techniques.id'] = mitreTechniqueId;
      
      let sortOptions = { eventTimestamp: -1 }; // Default sort: newest events first
      if (sortBy) {
        const parts = sortBy.split(':');
        const field = parts[0];
        const direction = parts[1] === 'asc' ? 1 : -1;
        sortOptions = { [field]: direction };
      }

      const events = await SecurityEvent.find(queryFilters)
        .populate('assignedTo', 'username') // Populate assigned user with username
        // .populate('relatedCaseId') // If relatedCaseId refers to an _id of another model like AMLCase
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      const totalCount = await SecurityEvent.countDocuments(queryFilters);

      res.json({
        data: events,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount: totalCount,
      });
    } catch (error) {
      console.error('Error fetching security events:', error);
      res.status(500).json({ message: 'Server error while fetching security events.', error: error.message });
    }
  }
);

// GET /api/events/:eventId - Fetch a single security event by its MongoDB _id
router.get(
  '/:eventId', // Path is relative to /api/events
  protect,
  authorize(['Analyst', 'Investigator', 'Admin']),
  [
    param('eventId').isMongoId().withMessage('Invalid Security Event ID format.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed for fetching security event.', errors: errors.array() });
    }

    try {
      // Exclude rawData by default for performance and to reduce exposure. It can be fetched via a specific mechanism if needed.
      const event = await SecurityEvent.findById(req.params.eventId)
        .select('-rawData') 
        .populate('assignedTo', 'username email'); 
        // .populate('relatedCaseId'); // If relatedCaseId is an ObjectId ref to another model

      if (!event) {
        return res.status(404).json({ message: 'Security Event not found.' });
      }
      res.json(event); // Send the single event object
    } catch (error) {
      console.error(`Error fetching security event ${req.params.eventId}:`, error);
      if (error.kind === 'ObjectId') {
          return res.status(400).json({ message: 'Invalid Event ID format for database query.' });
      }
      res.status(500).json({ message: 'Server error while fetching security event.', error: error.message });
    }
  }
);

// POST /api/events/ingest - Ingest a security event
router.post(
  '/ingest',
  protect, // Or a specific API key/token mechanism for automated ingestion
  authorize(['Admin', 'SystemIntegrationRole']), // Example: Define a role for system integrations
  [
    body('eventSource').trim().notEmpty().withMessage('Event source is required.'),
    body('description').trim().notEmpty().withMessage('Event description is required.'),
    body('rawData').notEmpty().withMessage('Raw event data is required.'),
    body('eventTimestamp').optional().isISO8601().toDate().withMessage('Invalid event timestamp.'),
    // Add more validation for mitreAttackMapping structure if desired
    body('mitreAttackMapping.mitre_tactics').optional().isArray(),
    body('mitreAttackMapping.mitre_techniques').optional().isArray()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed for event ingestion.', errors: errors.array() });
    }

    try {
      // req.user might be null if an API key system is used for ingestion without a user context
      const ingestedBy = req.user ? req.user._id : 'AutomatedSource'; 
      const eventData = req.body; // Contains eventSource, description, rawData, mitreAttackMapping, etc.
      
      const savedEvent = await securityEventService.ingestSecurityEvent(eventData, ingestedBy);
      res.status(201).json({ message: 'Security event ingested successfully.', eventId: savedEvent._id });
    } catch (error) {
      console.error('Error in /api/events/ingest endpoint:', error);
      res.status(500).json({ message: 'Error ingesting security event.', error: error.message });
    }
  }
);

// GET /api/events/by-tactic/:tacticId - Placeholder
router.get(
  '/by-tactic/:tacticId',
  protect,
  authorize(['Analyst', 'Investigator', 'Admin']),
  [
    param('tacticId').trim().escape().notEmpty().withMessage('MITRE Tactic ID is required.')
    // Add more validation for tacticId format if needed (e.g., TAXXXX)
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed.', errors: errors.array() });
    }
    try {
      // const { page, limit, startDate, endDate } = req.query; // Example additional filters
      // const options = { page, limit, startDate, endDate };
      const results = await securityEventService.getEventsByMitreTactic(req.params.tacticId /*, options */);
      res.json(results);
    } catch (error) {
      console.error('Error fetching events by tactic:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  }
);

// GET /api/events/by-technique/:techniqueId - Placeholder
router.get(
  '/by-technique/:techniqueId',
  protect,
  authorize(['Analyst', 'Investigator', 'Admin']),
  [
    param('techniqueId').trim().escape().notEmpty().withMessage('MITRE Technique ID is required.')
    // Add more validation for techniqueId format if needed (e.g., TXXXX or TXXXX.XXX)
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed.', errors: errors.array() });
    }
    try {
      // const { page, limit, startDate, endDate } = req.query; // Example additional filters
      // const options = { page, limit, startDate, endDate };
      const results = await securityEventService.getEventsByMitreTechnique(req.params.techniqueId /*, options */);
      res.json(results);
    } catch (error) {
      console.error('Error fetching events by technique:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  }
);

module.exports = router;
