// web_dashboard/backend/routes/amlRoutes.js
const express = require('express');
const router = express.Router();
const AMLCase = require('../models/AMLCase'); // Model for AML Cases
const { protect, authorize } = require('../middleware/authMiddleware'); // Auth protection
const { query, param, body, validationResult } = require('express-validator'); // <<< UPDATED
const { auditLog } = require('../utils/logger'); // <<< ADDED

// GET /api/aml/cases - Fetch AML cases with pagination and filtering
router.get(
  '/cases',
  protect, // Ensure user is authenticated
  authorize(['Analyst', 'Investigator', 'Admin']), // Example roles that can view cases
  [ // Validation rules for query parameters
    query('page').optional().isInt({ min: 1 }).toInt().withMessage('Page must be a positive integer.'),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('Limit must be between 1 and 100.'),
    query('status').optional().trim().escape(),
    query('priority').optional().trim().escape(),
    query('ruleTriggered').optional().trim().escape(),
    query('assignedTo').optional().isMongoId().withMessage('Invalid Assigned User ID format.').trim().escape(),
    query('caseId').optional().trim().escape(),
    query('startDate').optional().isISO8601().toDate().withMessage('Invalid start date format for openedAt.'),
    query('endDate').optional().isISO8601().toDate().withMessage('Invalid end date format for openedAt.'),
    query('sortBy').optional().matches(/^[a-zA-Z_.]+(:(asc|desc))?$/).withMessage('Invalid sortBy format. Use field or field:asc/desc.').trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed.', errors: errors.array() });
    }

    try {
      const {
        page = 1,
        limit = 20,
        status,
        priority,
        ruleTriggered,
        assignedTo,
        caseId,
        startDate,
        endDate,
        sortBy
      } = req.query;

      let queryFilters = {};
      if (status) queryFilters.status = status;
      if (priority) queryFilters.priority = priority;
      if (ruleTriggered) queryFilters.ruleTriggered = { $regex: ruleTriggered, $options: 'i' };
      if (assignedTo) queryFilters.assignedTo = assignedTo; // Assumes assignedTo is a User ObjectId string
      if (caseId) queryFilters.caseId = { $regex: caseId, $options: 'i' };
      
      if (startDate || endDate) {
        queryFilters.openedAt = {};
        if (startDate) queryFilters.openedAt.$gte = startDate;
        if (endDate) queryFilters.openedAt.$lte = endDate;
      }
      
      let sortOptions = { openedAt: -1 }; // Default sort: newest cases first
      if (sortBy) {
        const parts = sortBy.split(':');
        const field = parts[0];
        const direction = parts[1] === 'asc' ? 1 : -1;
        sortOptions = { [field]: direction };
      }

      // Populate referenced fields for better display on the frontend
      // Select specific fields from populated documents to avoid sending sensitive data like user password hashes
      const cases = await AMLCase.find(queryFilters)
        .populate('assignedTo', 'username firstName lastName email') // Populate with selected user fields
        .populate('triggeringTransactions', 'txHash blockchain valueUSD timestamp') // Populate with selected transaction fields
        // .populate('triggeringWalletAddresses', 'address blockchain riskScore tags') // Populate with selected wallet fields - can be heavy
        // .populate('associatedEntities', 'name type category') // Populate with selected entity fields - can be heavy
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      const totalCount = await AMLCase.countDocuments(queryFilters);

      res.json({
        data: cases,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount: totalCount,
      });
    } catch (error) {
      console.error('Error fetching AML cases:', error);
      res.status(500).json({ message: 'Server error while fetching AML cases.', error: error.message });
    }
  }
);

// POST /api/aml/cases/:id/notes - Add an investigation note to an AML case
router.post(
  '/cases/:id/notes',
  protect,
  authorize(['Analyst', 'Investigator', 'Admin']),
  [
    param('id').isMongoId().withMessage('Invalid Case ID format.'),
    body('note').trim().notEmpty().withMessage('Note content cannot be empty.').escape()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed for adding note.', errors: errors.array() });
    }

    try {
      const amlCase = await AMLCase.findById(req.params.id);
      if (!amlCase) {
        return res.status(404).json({ message: 'AML Case not found to add note.' });
      }

      const newNote = {
        note: req.body.note,
        author: req.user._id, // req.user is populated by 'protect' middleware
        timestamp: new Date()
      };

      amlCase.investigationNotes.push(newNote);
      const savedCase = await amlCase.save();
      
      // Retrieve the newly added note, which now has an _id assigned by Mongoose
      const addedNoteEntry = savedCase.investigationNotes[savedCase.investigationNotes.length - 1];

      auditLog('INFO', 'AML_CASE_NOTE_ADDED', req.user._id, {
        caseId: savedCase.caseId,
        caseMongoId: savedCase._id,
        noteId: addedNoteEntry ? addedNoteEntry._id : null // Mongoose assigns _id to subdocuments
      });

      // Repopulate for consistent response
      const populatedCase = await AMLCase.findById(savedCase._id)
        .populate('assignedTo', 'username email')
        .populate('triggeringTransactions', 'txHash blockchain valueUSD timestamp')
        .populate('investigationNotes.author', 'username');

      res.status(201).json(populatedCase); // Return the updated case with the new note

    } catch (error) {
      console.error(`Error adding note to AML case ${req.params.id}:`, error);
      if (error.kind === 'ObjectId') {
          return res.status(400).json({ message: 'Invalid Case ID format for database query.' });
      }
      res.status(500).json({ message: 'Server error while adding note to AML case.', error: error.message });
    }
  }
);

// TODO: Add more specific AML case routes as needed:
// - GET /cases/:caseIdOrMongoID (Get a single case)
// - PUT /cases/:caseIdOrMongoID (Update a case - e.g., status, assignee, notes)
// - POST /cases/:caseIdOrMongoID/notes (Add an investigation note)
// - POST /cases/:caseIdOrMongoID/attachments (Upload an attachment)

// GET /api/aml/cases/:id - Fetch a single AML case by its MongoDB _id
router.get(
  '/cases/:id',
  protect,
  authorize(['Analyst', 'Investigator', 'Admin']),
  [
    param('id').isMongoId().withMessage('Invalid Case ID format.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed.', errors: errors.array() });
    }

    try {
      const amlCase = await AMLCase.findById(req.params.id)
        .populate('assignedTo', 'username email')
        .populate('triggeringTransactions', 'txHash blockchain valueUSD timestamp')
        .populate('investigationNotes.author', 'username'); // Populate author of notes

      if (!amlCase) {
        return res.status(404).json({ message: 'AML Case not found.' });
      }
      res.json(amlCase);
    } catch (error) {
      console.error(`Error fetching AML case ${req.params.id}:`, error);
      if (error.kind === 'ObjectId') { // Handle invalid ObjectId format error during findById
          return res.status(400).json({ message: 'Invalid Case ID format for database query.' });
      }
      res.status(500).json({ message: 'Server error while fetching AML case.', error: error.message });
    }
  }
);

// PUT /api/aml/cases/:id - Update an AML case
router.put(
  '/cases/:id',
  protect,
  authorize(['Analyst', 'Investigator', 'Admin']), // Or more granular roles for specific updates
  [
    param('id').isMongoId().withMessage('Invalid Case ID format.'),
    body('status').optional().isIn(['New', 'Open', 'Under Investigation', 'Pending Review', 'EscalatedToAuthorities', 'SARFiled', 'Closed-FalsePositive', 'Closed-Resolved', 'Closed-Other']).withMessage('Invalid status value.'),
    body('priority').optional().isIn(['Low', 'Medium', 'High', 'Critical']).withMessage('Invalid priority value.'),
    body('summary').optional().trim().escape(),
    body('detailedDescription').optional().trim().escape(),
    body('resolutionDetails').optional().trim().escape(),
    body('assignedTo').optional({ checkFalsy: true }).isMongoId().withMessage('Invalid User ID format for assignment.').trim().escape(), // checkFalsy allows null/empty string to pass as optional
    body('sarFiled.filed').optional().isBoolean().withMessage('SAR filed status must be true or false.'),
    body('sarFiled.dateFiled').optional().if(body('sarFiled.filed').equals('true')).isISO8601().toDate().withMessage('Invalid SAR date filed (must be ISO8601).'),
    body('sarFiled.referenceNumber').optional().if(body('sarFiled.filed').equals('true')).trim().escape()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed for case update.', errors: errors.array() });
    }

    try {
      const amlCase = await AMLCase.findById(req.params.id);
      if (!amlCase) {
        return res.status(404).json({ message: 'AML Case not found for update.' });
      }

      const updatableFields = ['status', 'priority', 'summary', 'detailedDescription', 'assignedTo', 'resolutionDetails', 'sarFiled'];
      const updatedFieldsList = [];

      updatableFields.forEach(field => {
        if (req.body[field] !== undefined) {
          if (field === 'assignedTo' && req.body[field] === '') { // Allow unassigning
            amlCase[field] = null;
          } else if (field === 'sarFiled') {
            // Ensure sarFiled object is properly updated or initialized
            amlCase.sarFiled = amlCase.sarFiled || {}; // Initialize if null
            if (req.body.sarFiled.filed !== undefined) amlCase.sarFiled.filed = req.body.sarFiled.filed;
            if (req.body.sarFiled.dateFiled !== undefined) amlCase.sarFiled.dateFiled = req.body.sarFiled.dateFiled;
            if (req.body.sarFiled.referenceNumber !== undefined) amlCase.sarFiled.referenceNumber = req.body.sarFiled.referenceNumber;
            // If filed is explicitly false, clear other sarFiled fields
            if (req.body.sarFiled.filed === false) {
                amlCase.sarFiled.dateFiled = null;
                amlCase.sarFiled.referenceNumber = null;
            }
          } else {
            amlCase[field] = req.body[field];
          }
          updatedFieldsList.push(field);
        }
      });
      
      // The pre-save hook in AMLCase model handles updatedAt and closedAt based on status
      const updatedCase = await amlCase.save();

      auditLog('INFO', 'AML_CASE_UPDATED', req.user._id, { 
        caseId: updatedCase.caseId, 
        caseMongoId: updatedCase._id, 
        updatedFields: updatedFieldsList 
      });
      
      // Repopulate for consistent response with GET /cases/:id
      const populatedUpdate = await AMLCase.findById(updatedCase._id)
        .populate('assignedTo', 'username email')
        .populate('triggeringTransactions', 'txHash blockchain valueUSD timestamp')
        .populate('investigationNotes.author', 'username');

      res.json(populatedUpdate);
    } catch (error) {
      console.error(`Error updating AML case ${req.params.id}:`, error);
      if (error.kind === 'ObjectId') {
          return res.status(400).json({ message: 'Invalid Case ID format for database query.' });
      }
      res.status(500).json({ message: 'Server error while updating AML case.', error: error.message });
    }
  }
);

module.exports = router;
