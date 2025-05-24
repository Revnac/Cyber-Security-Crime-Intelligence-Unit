// web_dashboard/backend/routes/cryptoRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // <<< ADD THIS
const CryptoTransaction = require('../models/CryptoTransaction'); // Model for crypto transactions
const WalletAddress = require('../models/WalletAddress'); // <<< ADD THIS
const { traceFunds } = require('../services/cryptoForensicsService'); // <<< ADD THIS
const { protect, authorize } = require('../middleware/authMiddleware'); // <<< UPDATED THIS
const { query, param, body, validationResult } = require('express-validator'); // <<< UPDATED THIS

// GET /api/crypto/transactions - Fetch cryptocurrency transactions with pagination and filtering
router.get(
  '/transactions',
  protect, // Ensure user is authenticated
  [ // Validation rules for query parameters
    query('page').optional().isInt({ min: 1 }).toInt().withMessage('Page must be a positive integer.'),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('Limit must be between 1 and 100.'), // Max 100 for now
    query('blockchain').optional().trim().escape(),
    query('txHash').optional().trim().escape().isLength({ min: 10, max: 128 }).withMessage('Transaction hash search term is invalid length.'), // Basic length check
    query('address').optional().trim().escape().isLength({ min: 10, max: 128 }).withMessage('Address search term is invalid length.'), // For searching in inputs or outputs
    query('startDate').optional().isISO8601().toDate().withMessage('Invalid start date format.'),
    query('endDate').optional().isISO8601().toDate().withMessage('Invalid end date format.'),
    query('valueUSD_min').optional().isFloat({ min: 0 }).toFloat().withMessage('Min USD value must be a positive number.'),
    query('valueUSD_max').optional().isFloat({ min: 0 }).toFloat().withMessage('Max USD value must be a positive number.'),
    query('sortBy').optional().matches(/^[a-zA-Z_.]+(:(asc|desc))?$/).withMessage('Invalid sortBy format. Use field or field:asc/desc.').trim()
    // Example: sortBy=timestamp:desc or sortBy=valueUSD
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed.', errors: errors.array() });
    }

    try {
      const { 
        page = 1, 
        limit = 20, // Default limit
        blockchain, 
        txHash,
        address, // This will search in both inputs and outputs
        startDate, 
        endDate,
        valueUSD_min,
        valueUSD_max,
        sortBy 
      } = req.query;

      let queryFilters = {};
      if (blockchain) queryFilters.blockchain = blockchain;
      if (txHash) queryFilters.txHash = { $regex: txHash, $options: 'i' }; // Case-insensitive search

      if (address) {
        queryFilters.$or = [
          { 'inputs.address': { $regex: address, $options: 'i' } },
          { 'outputs.address': { $regex: address, $options: 'i' } }
        ];
      }

      if (startDate || endDate) {
        queryFilters.timestamp = {};
        if (startDate) queryFilters.timestamp.$gte = startDate;
        if (endDate) queryFilters.timestamp.$lte = endDate;
      }
      
      if (valueUSD_min !== undefined || valueUSD_max !== undefined) {
        queryFilters.valueUSD = {};
        if (valueUSD_min !== undefined) queryFilters.valueUSD.$gte = valueUSD_min;
        if (valueUSD_max !== undefined) queryFilters.valueUSD.$lte = valueUSD_max;
      }
      
      let sortOptions = { timestamp: -1 }; // Default sort: newest first
      if (sortBy) {
        const parts = sortBy.split(':');
        const field = parts[0];
        const direction = parts[1] === 'asc' ? 1 : -1;
        sortOptions = { [field]: direction };
      }

      const transactions = await CryptoTransaction.find(queryFilters)
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(); // Use .lean() for faster queries if not modifying docs

      const totalCount = await CryptoTransaction.countDocuments(queryFilters);

      res.json({
        data: transactions,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount: totalCount,
      });
    } catch (error) {
      console.error('Error fetching crypto transactions:', error);
      res.status(500).json({ message: 'Server error while fetching crypto transactions.', error: error.message });
    }
  }
);

// GET /api/crypto/transactions/:txHashOrId - Fetch a single crypto transaction
router.get(
  '/transactions/:txHashOrId',
  protect,
  [
    param('txHashOrId')
      .trim()
      .escape()
      .notEmpty().withMessage('Transaction hash or ID cannot be empty.')
      .isLength({ min: 20, max: 128 }).withMessage('Transaction hash or ID must be between 20 and 128 characters.')
      // Example of a more specific regex if you want to differentiate between common hash patterns and MongoID
      // .matches(/^(0x[a-fA-F0-9]{64}|[a-fA-F0-9]{64}|[a-fA-F0-9]{24})$/).withMessage('Invalid format for transaction hash or ID.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed.', errors: errors.array() });
    }

    const { txHashOrId } = req.params;

    try {
      let transaction = await CryptoTransaction.findOne({ txHash: txHashOrId }).lean();

      if (!transaction && mongoose.Types.ObjectId.isValid(txHashOrId)) {
        // If not found by txHash and param is a valid ObjectId format, try finding by _id
        transaction = await CryptoTransaction.findById(txHashOrId).lean();
      }

      if (!transaction) {
        return res.status(404).json({ message: 'Crypto transaction not found.' });
      }

      res.json(transaction); // Send the single transaction object directly
    } catch (error) {
      console.error(`Error fetching crypto transaction ${txHashOrId}:`, error);
      res.status(500).json({ message: 'Server error while fetching crypto transaction.', error: error.message });
    }
  }
);

// TODO: Add more specific crypto routes as needed:
// - GET /wallets/:address (Get details for a specific wallet address)
// - GET /entities/:entityId (Get details for a specific entity)

// GET /api/crypto/wallets - Fetch wallet addresses with pagination and filtering
router.get(
  '/wallets',
  protect,
  authorize(['Analyst', 'Investigator', 'Admin']), // Example authorization
  [ // Validation rules for query parameters
    query('page').optional().isInt({ min: 1 }).toInt().withMessage('Page must be a positive integer.'),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('Limit must be between 1 and 100.'),
    query('blockchain').optional().trim().escape(),
    query('address').optional().trim().escape().isLength({ min: 5 }).withMessage('Address search term is too short.'), // Min length for partial search
    query('riskScoreMin').optional().isFloat({ min: 0, max: 100 }).toFloat().withMessage('Min risk score must be between 0 and 100.'),
    query('riskScoreMax').optional().isFloat({ min: 0, max: 100 }).toFloat().withMessage('Max risk score must be between 0 and 100.'),
    query('tag').optional().trim().escape(), // Search for a single tag
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
        blockchain,
        address,
        riskScoreMin,
        riskScoreMax,
        tag,
        sortBy
      } = req.query;

      let queryFilters = {};
      if (blockchain) queryFilters.blockchain = blockchain;
      if (address) queryFilters.address = { $regex: address, $options: 'i' }; // Case-insensitive partial search
      
      if (riskScoreMin !== undefined || riskScoreMax !== undefined) {
        queryFilters.riskScore = {};
        if (riskScoreMin !== undefined) queryFilters.riskScore.$gte = riskScoreMin;
        if (riskScoreMax !== undefined) queryFilters.riskScore.$lte = riskScoreMax;
      }
      
      if (tag) queryFilters.tags = tag; // Check if array contains the tag

      let sortOptions = { lastSeenAt: -1 }; // Default sort: most recently seen first
      if (sortBy) {
        const parts = sortBy.split(':');
        const field = parts[0];
        const direction = parts[1] === 'asc' ? 1 : -1;
        sortOptions = { [field]: direction };
      }

      const wallets = await WalletAddress.find(queryFilters)
        .populate('associatedEntityIds', 'name type category') // Populate with selected entity fields
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      const totalCount = await WalletAddress.countDocuments(queryFilters);

      res.json({
        data: wallets,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount: totalCount,
      });
    } catch (error) {
      console.error('Error fetching wallet addresses:', error);
      res.status(500).json({ message: 'Server error while fetching wallet addresses.', error: error.message });
    }
  }
);

// TODO: Add more specific wallet routes:
// - GET /wallets/:addressOrId (Get a single wallet by its address string + blockchain or _id)
// - PUT /wallets/:addressOrId (Update wallet details, e.g., tags, notes - manual edits)

// POST /api/crypto/trace-funds - Perform funds tracing
router.post(
  '/trace-funds',
  protect,
  authorize(['Analyst', 'Investigator', 'Admin']),
  [
    body('startIdentifier').trim().escape().notEmpty().withMessage('Start identifier is required.').isLength({ min: 10, max: 128 }).withMessage('Start identifier has invalid length.'),
    body('identifierType').isIn(['address', 'tx']).withMessage("Identifier type must be 'address' or 'tx'."),
    body('direction').isIn(['forward', 'backward', 'both']).withMessage("Direction must be 'forward', 'backward', or 'both'."),
    body('blockchain').trim().escape().notEmpty().withMessage('Blockchain is required.'),
    body('maxHops').isInt({ min: 1, max: 5 }).withMessage('Max hops must be an integer between 1 and 5.'),
    body('options').optional().isObject().withMessage('Options must be an object.')
    // TODO: Add more specific validation for fields within 'options' if they become standardized
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed for trace-funds.', errors: errors.array() });
    }

    try {
      const { startIdentifier, identifierType, direction, blockchain, maxHops, options } = req.body;
      
      const traceResults = await traceFunds(startIdentifier, identifierType, direction, blockchain, maxHops, options || {});
      
      res.json(traceResults);

    } catch (error) {
      console.error('Error in /trace-funds endpoint:', error);
      // Handle specific errors from traceFunds if they have a status or particular message
      if (error.message.includes("Missing required parameters") || error.message.includes("Max hops must be between")) {
          return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: 'Server error during fund tracing.', error: error.message });
    }
  }
);

module.exports = router;
