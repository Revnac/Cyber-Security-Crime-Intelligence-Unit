// web_dashboard/backend/routes/fiatRoutes.js
const express = require('express');
const router = express.Router();
const FiatTransaction = require('../models/FiatTransaction');
const { protect, authorize } = require('../middleware/authMiddleware');
const { query, validationResult } = require('express-validator');

// GET /api/fiat/transactions - Fetch fiat transactions with pagination and filtering
router.get(
  '/transactions',
  protect,
  authorize(['Analyst', 'Investigator', 'Admin']), // Example roles
  [ // Validation rules for query parameters
    query('page').optional().isInt({ min: 1 }).toInt().withMessage('Page must be a positive integer.'),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('Limit must be between 1 and 100.'),
    query('currencyCode').optional().isAlpha().isLength({ min: 3, max: 3 }).toUpperCase().trim().escape(),
    query('transactionType').optional().trim().escape(),
    query('status').optional().trim().escape(),
    query('startDate').optional().isISO8601().toDate().withMessage('Invalid start date format.'),
    query('endDate').optional().isISO8601().toDate().withMessage('Invalid end date format.'),
    query('minAmount').optional().isFloat({ min: 0 }).toFloat().withMessage('Min amount must be a positive number.'),
    query('maxAmount').optional().isFloat({ min: 0 }).toFloat().withMessage('Max amount must be a positive number.'),
    query('accountNumber').optional().trim().escape(), // Search in sender or receiver account
    query('sortBy').optional().matches(/^[a-zA-Z_.]+(:(asc|desc))?$/).withMessage('Invalid sortBy format. Use field or field:asc/desc.').trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed for fetching fiat transactions.', errors: errors.array() });
    }

    try {
      const {
        page = 1,
        limit = 20,
        currencyCode,
        transactionType,
        status,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        accountNumber,
        sortBy
      } = req.query;

      let queryFilters = {};
      if (currencyCode) queryFilters.currencyCode = currencyCode;
      if (transactionType) queryFilters.transactionType = transactionType;
      if (status) queryFilters.status = status;

      if (startDate || endDate) {
        queryFilters.timestamp = {};
        if (startDate) queryFilters.timestamp.$gte = startDate;
        if (endDate) queryFilters.timestamp.$lte = endDate;
      }

      if (minAmount !== undefined || maxAmount !== undefined) {
        queryFilters.amount = {};
        if (minAmount !== undefined) queryFilters.amount.$gte = minAmount;
        if (maxAmount !== undefined) queryFilters.amount.$lte = maxAmount;
      }
      
      if (accountNumber) {
        const accRegex = { $regex: accountNumber, $options: 'i' };
        queryFilters.$or = [
          { 'senderDetails.accountNumber': accRegex },
          { 'receiverDetails.accountNumber': accRegex }
        ];
      }
      
      let sortOptions = { timestamp: -1 }; // Default sort: newest first
      if (sortBy) {
        const parts = sortBy.split(':');
        const field = parts[0];
        const direction = parts[1] === 'asc' ? 1 : -1;
        sortOptions = { [field]: direction };
      }

      const transactions = await FiatTransaction.find(queryFilters)
        // .populate('linkedCryptoTransactionIds', 'txHash blockchain') // Optional: if needed in list view
        // .populate('linkedAMLCaseIds') // Optional: if needed in list view
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      const totalCount = await FiatTransaction.countDocuments(queryFilters);

      res.json({
        data: transactions,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount: totalCount,
      });
    } catch (error) {
      console.error('Error fetching fiat transactions:', error);
      res.status(500).json({ message: 'Server error while fetching fiat transactions.', error: error.message });
    }
  }
);

// TODO: Add more specific fiat transaction routes as needed:
// - GET /transactions/:internalId (Get a single fiat transaction)
// - POST /transactions (Manually add a fiat transaction - if needed beyond CSV)
// - PUT /transactions/:internalId (Update a fiat transaction)

module.exports = router;
