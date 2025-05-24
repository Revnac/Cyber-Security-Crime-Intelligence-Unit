// web_dashboard/backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/user'); // Adjust path as necessary

// Use the same JWT_SECRET as in auth.js, ideally from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'YOUR_REPLACEABLE_JWT_SECRET_KEY_HERE_32_CHARS_LONG';

const protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header (Bearer token)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header (e.g., "Bearer eyJhbGciOiJIUzI1NiIsIn...")
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);

      // Attach user to the request object (excluding password)
      // This makes user information available in subsequent protected route handlers
      req.user = await User.findById(decoded.userId).select('-password');
      
      if (!req.user) {
          return res.status(401).json({ message: 'Not authorized, user not found for this token.' });
      }
      if (!req.user.isActive) {
          return res.status(403).json({ message: 'Not authorized, user account is inactive.' });
      }

      next(); // Proceed to the next middleware or route handler
    } catch (error) {
      console.error('Token verification error:', error.message);
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Not authorized, token expired.' });
      }
      return res.status(401).json({ message: 'Not authorized, token failed verification.' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided.' });
  }
};

// Middleware for role-based access control (RBAC)
// Example: authorize(['Admin', 'Investigator'])
const authorize = (roles = []) => {
  // roles param can be a single role string (e.g., 'Admin') 
  // or an array of roles (e.g., ['Admin', 'Investigator'])
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!req.user) {
        // This should ideally not happen if 'protect' middleware is used first
        return res.status(401).json({ message: 'Not authorized, user information missing.' });
    }
    
    if (roles.length && !req.user.roles.some(userRole => roles.includes(userRole))) {
      // User's role is not authorized
      return res.status(403).json({ 
        message: `Forbidden. User role (${req.user.roles.join(', ')}) is not authorized for this resource. Required roles: ${roles.join(', ')}.` 
      });
    }
    
    // User has at least one of the required roles, or no specific roles were required
    next();
  };
};


module.exports = { protect, authorize };
