const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
// User model will be created later
// const User = require('../server/models/User');

// Middleware for protected routes
const auth = (req, res, next) => {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user from payload
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// @route   POST api/users/register
// @desc    Register a user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Simple validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    // For now, just return success 
    // In the full implementation, you would:
    // 1. Check if user already exists
    // 2. Create new user with hashed password
    // 3. Save to database
    // 4. Generate JWT token
    
    res.status(200).json({ 
      success: true,
      message: 'Registration endpoint reached successfully'
    });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/users/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Simple validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    // For now, just return success with dummy token
    // In the full implementation, you would:
    // 1. Find user by email
    // 2. Validate password
    // 3. Generate JWT token
    
    const token = jwt.sign(
      { user: { id: 'dummy-user-id' } },
      process.env.JWT_SECRET || 'temporary_secret_key',
      { expiresIn: process.env.JWT_EXPIRATION || '7d' }
    );

    res.status(200).json({
      success: true,
      token,
      message: 'Login endpoint reached successfully'
    });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    // For now, just return success with dummy user data
    // In the full implementation, you would find the user by ID
    
    res.status(200).json({
      success: true,
      user: {
        id: req.user.id,
        name: 'Test User',
        email: 'test@example.com'
      },
      message: 'Profile endpoint reached successfully'
    });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;