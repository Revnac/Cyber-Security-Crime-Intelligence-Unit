// web_dashboard/backend/routes/externalDataSourceRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { body, validationResult } = require('express-validator'); // For validating request body if any
const securityEventService = require('../services/securityEventService'); // To access ingestFetchedSentinelAlerts
const { auditLog } = require('../utils/logger');

// POST /api/external-sources/sentinel/ingest-alerts - Trigger ingestion of Sentinel alerts
router.post(
  '/sentinel/ingest-alerts',
  protect,
  authorize(['Admin', 'SystemAutomationRole']), // Define appropriate roles
  [ // Optional: Add body validation if this endpoint accepts parameters for fetching
    body('fetchParams.top').optional().isInt({ min: 1, max: 1000 }).withMessage('Top N must be between 1 and 1000.'),
    body('fetchParams.$filter').optional().isString().trim().escape(),
    body('fetchParams.$orderby').optional().isString().trim().escape(),
    body('resourceType').optional().isIn(['alerts', 'incidents']).withMessage("Resource type must be 'alerts' or 'incidents'.")
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed for Sentinel ingestion trigger.', errors: errors.array() });
    }

    const triggeredBy = req.user ? req.user._id.toString() : 'System_ManualTrigger';
    // Default fetch parameters if not provided in body
    const defaultFetchParams = { top: 50, $orderby: "createdDateTime desc" };
    const fetchParams = req.body.fetchParams || defaultFetchParams;
    const resourceType = req.body.resourceType || 'alerts';

    try {
      auditLog('INFO', 'SENTINEL_MANUAL_INGESTION_TRIGGERED', triggeredBy, { fetchParams, resourceType, ip: req.ip });
      
      // Intentionally NOT awaiting this, as it could be a long process.
      // The client will get an immediate acknowledgment.
      // The actual status should be monitored via logs or a separate job status mechanism.
      securityEventService.ingestFetchedSentinelAlerts(fetchParams, resourceType, triggeredBy)
        .then(summary => {
          console.log('Sentinel ingestion process completed (background).', summary);
          // Further logging or notification can happen here based on summary
        })
        .catch(error => {
          console.error('Sentinel ingestion process failed (background).', error);
          // Further error logging or notification
        });

      res.status(202).json({ 
        message: 'Sentinel alert ingestion process initiated. This may take some time. Check server logs for progress and completion status.',
        details: { fetchParams, resourceType }
      });

    } catch (error) { // Catch errors from the immediate request setup, not from the async process
      console.error('Error initiating Sentinel alert ingestion:', error);
      auditLog('ERROR', 'SENTINEL_MANUAL_INGESTION_INITIATION_ERROR', triggeredBy, { error: error.message, ip: req.ip });
      res.status(500).json({ message: 'Failed to initiate Sentinel alert ingestion.', error: error.message });
    }
  }
);

module.exports = router;
