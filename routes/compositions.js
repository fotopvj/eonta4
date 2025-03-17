const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
// Composition model will be created later
// const Composition = require('../server/models/Composition');

// Middleware for protected routes
const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'temporary_secret_key');
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// @route   GET api/compositions
// @desc    Get all compositions (or filtered by query params)
// @access  Public
router.get('/', async (req, res) => {
  try {
    // For now, just return success with dummy data
    res.status(200).json({
      success: true,
      compositions: [
        {
          id: '1',
          title: 'Sample Composition 1',
          creator: 'User 1',
          location: 'New York',
          createdAt: new Date()
        },
        {
          id: '2',
          title: 'Sample Composition 2',
          creator: 'User 2',
          location: 'San Francisco',
          createdAt: new Date()
        }
      ],
      message: 'Compositions endpoint reached successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/compositions
// @desc    Create a new composition
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, boundaries, paths } = req.body;

    // Simple validation
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    // For now, just return success
    // In the full implementation, you would:
    // 1. Create a new composition with user as creator
    // 2. Save to database
    
    res.status(201).json({
      success: true,
      composition: {
        id: 'new-composition-id',
        title,
        description,
        creator: req.user.id,
        boundaries,
        paths,
        createdAt: new Date()
      },
      message: 'Composition created successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/compositions/:id
// @desc    Get a composition by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // For now, just return success with dummy data
    res.status(200).json({
      success: true,
      composition: {
        id,
        title: 'Sample Composition',
        description: 'This is a sample composition',
        creator: 'User 1',
        location: 'New York',
        boundaries: [
          { lat: 40.712776, lng: -74.005974 },
          { lat: 40.712976, lng: -74.005674 },
          { lat: 40.713176, lng: -74.006274 }
        ],
        paths: [
          {
            points: [
              { lat: 40.712876, lng: -74.005874, timestamp: new Date() },
              { lat: 40.712976, lng: -74.005774, timestamp: new Date() }
            ],
            audioUrl: 'https://eonta-audio-files.s3.amazonaws.com/sample.mp3'
          }
        ],
        createdAt: new Date()
      },
      message: 'Composition retrieved successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT api/compositions/:id
// @desc    Update a composition
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, boundaries, paths } = req.body;

    // For now, just return success
    res.status(200).json({
      success: true,
      composition: {
        id,
        title,
        description,
        boundaries,
        paths,
        updatedAt: new Date()
      },
      message: 'Composition updated successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE api/compositions/:id
// @desc    Delete a composition
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // For now, just return success
    res.status(200).json({
      success: true,
      message: 'Composition deleted successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/compositions/:id/share
// @desc    Share a composition via email
// @access  Private
router.post('/:id/share', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { recipientEmail } = req.body;

    // Simple validation
    if (!recipientEmail) {
      return res.status(400).json({ message: 'Recipient email is required' });
    }

    // For now, just return success
    // In the full implementation, you would:
    // 1. Verify the composition exists
    // 2. Send an email using your email service
    
    res.status(200).json({
      success: true,
      message: 'Composition shared successfully (email functionality will be implemented later)'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;