// web_dashboard/backend/models/user.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // For password hashing

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required.'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'Username must be at least 3 characters long.']
  },
  password: {
    type: String,
    required: [true, 'Password is required.'],
    minlength: [8, 'Password must be at least 8 characters long.']
    // Do not select password by default when querying users
    // select: false 
  },
  roles: [{
    type: String,
    enum: ['Analyst', 'Investigator', 'Admin', 'ReadOnly'], // Example roles
    default: ['ReadOnly']
  }],
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  email: {
    type: String,
    required: [true, 'Email is required.'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/.+\@.+\..+/, 'Please fill a valid email address.']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  consent: {
    termsOfService: {
      accepted: { type: Boolean, default: false },
      dateAccepted: { type: Date },
      version: { type: String } // Version of ToS accepted
    },
    privacyPolicy: {
      accepted: { type: Boolean, default: false },
      dateAccepted: { type: Date },
      version: { type: String } // Version of Privacy Policy accepted
    },
    marketingOptIn: { // Example of a specific consent
      accepted: { type: Boolean, default: false },
      dateOptedIn: { type: Date }
    }
  },
  dataProcessingPreferences: {
    allowAnalytics: { type: Boolean, default: true } // Example preference
    // Add other relevant preferences as needed
  },
  // For advanced GRC audit trails, consider adding createdBy/updatedBy fields linking to User IDs,
  // or integrating more deeply with a dedicated audit logging service that captures actor information.
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
  // For advanced GRC audit trails, consider adding createdBy/updatedBy fields linking to User IDs,
  // or integrating more deeply with a dedicated audit logging service that captures actor information.
});

// Middleware to hash password before saving a new user
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare candidate password with the stored hashed password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Middleware to update `updatedAt` field before saving (excluding initial creation)
userSchema.pre('save', function(next) {
  if (!this.isNew) { // Do not run on initial creation as default is Date.now
    this.updatedAt = Date.now();
  }
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
