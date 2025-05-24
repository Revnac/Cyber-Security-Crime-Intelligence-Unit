// web_dashboard/backend/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user'); // Assuming your User model is here
const { body, validationResult } = require('express-validator');
const { auditLog } = require('../utils/logger'); // Adjust path if necessary

// --- Configuration ---
// Use environment variables for JWT secret and expiration in a real application
const JWT_SECRET = process.env.JWT_SECRET || 'YOUR_REPLACEABLE_JWT_SECRET_KEY_HERE_32_CHARS_LONG';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h'; // Token expiration time (e.g., 1 hour, 7 days)

// --- API Endpoints for Authentication ---

// POST /api/auth/register - User Registration

// Define validation rules for registration
const registerValidationRules = [
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters long.')
    .isAlphanumeric().withMessage('Username must be alphanumeric.'),
  body('email').isEmail().withMessage('Please provide a valid email address.').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.'),
  body('firstName').optional().trim().escape(),
  body('lastName').optional().trim().escape(),
  // Example for roles: ensure it's an array and values are within the enum defined in User model
  // This is a more complex validation, for now, we'll keep it simple or rely on Mongoose validation for roles.
  // body('roles').optional().isArray().withMessage('Roles must be an array.')
  //   .custom(rolesArray => rolesArray.every(role => ['Analyst', 'Investigator', 'Admin', 'ReadOnly'].includes(role)))
  //   .withMessage('Invalid role specified.')
];

router.post('/register', registerValidationRules, async (req, res) => {
  // Check for validation errors first
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation failed.', errors: errors.array() });
  }

  try {
    const { username, password, email, firstName, lastName, roles } = req.body;

    // Check if user already exists
    let existingUser = await User.findOne({ $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }] });
    if (existingUser) {
      return res.status(409).json({ message: 'User with this username or email already exists.' });
    }

    // Create new user object
    const newUser = new User({
      username,
      password, // Password will be hashed by the pre-save hook in userSchema
      email,
      firstName,
      lastName,
      roles // Ensure roles are validated against enum in schema or provide default
    });

    // Save the new user
    const savedUser = await newUser.save();

    // Respond without the password
    const userResponse = {
      _id: savedUser._id,
      username: savedUser.username,
      email: savedUser.email,
      firstName: savedUser.firstName,
      lastName: savedUser.lastName,
      roles: savedUser.roles,
      createdAt: savedUser.createdAt
    };

    auditLog('INFO', 'USER_REGISTERED_SUCCESS', savedUser._id, { username: savedUser.username, email: savedUser.email, registrationIp: req.ip });
    res.status(201).json({ message: 'User registered successfully.', user: userResponse });

  } catch (error) {
    console.error('Registration error:', error);
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: 'Validation Error', errors: error.errors });
    }
    res.status(500).json({ message: 'Server error during registration.', error: error.message });
  }
});

// POST /api/auth/login - User Login

// Define validation rules for login
const loginValidationRules = [
  body('usernameOrEmail').notEmpty().withMessage('Username or email is required.').trim(),
  body('password').notEmpty().withMessage('Password is required.')
];

router.post('/login', loginValidationRules, async (req, res) => {
  // Check for validation errors first
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation failed.', errors: errors.array() });
  }

  try {
    const { usernameOrEmail, password } = req.body;

    // Find user by username or email
    // The 'select: false' on password in userSchema means it's not returned by default.
    // We need to explicitly select it here for comparison.
    const user = await User.findOne({ 
      $or: [{ username: usernameOrEmail.toLowerCase() }, { email: usernameOrEmail.toLowerCase() }] 
    }).select('+password');

    if (!user) {
      auditLog('WARN', 'USER_LOGIN_FAILURE_NOT_FOUND', null, { usernameOrEmailAttempt: usernameOrEmail, loginIp: req.ip });
      return res.status(401).json({ message: 'Invalid credentials. User not found.' });
    }

    // Compare submitted password with stored hashed password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      auditLog('WARN', 'USER_LOGIN_FAILURE_PASSWORD_INCORRECT', user ? user._id : null, { username: user ? user.username : usernameOrEmail, loginIp: req.ip });
      return res.status(401).json({ message: 'Invalid credentials. Password incorrect.' });
    }

    if (!user.isActive) {
        auditLog('WARN', 'USER_LOGIN_FAILURE_INACTIVE_ACCOUNT', user._id, { username: user.username, loginIp: req.ip });
        return res.status(403).json({ message: 'Account is inactive. Please contact administrator.' });
    }

    // User is authenticated, create JWT
    const payload = {
      userId: user._id,
      username: user.username,
      roles: user.roles // Include roles in JWT payload for RBAC
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Update lastLogin timestamp (optional, can be done asynchronously)
    user.lastLogin = Date.now();
    await user.save(); // This will trigger the pre-save hook for updatedAt if not new

    auditLog('INFO', 'USER_LOGIN_SUCCESS', user._id, { username: user.username, loginIp: req.ip });
    res.json({
      message: 'Login successful.',
      token: token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        roles: user.roles,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.', error: error.message });
  }
});

// Placeholder for /api/auth/refresh-token if using refresh tokens
// router.post('/refresh-token', (req, res) => { ... });

// Placeholder for /api/auth/logout (if using server-side token blocklisting)
// router.post('/logout', (req, res) => { ... });


module.exports = router;
