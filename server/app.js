// Load environment variables
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Import routes
const userRoutes = require('../routes/users');
const compositionRoutes = require('../routes/compositions');
const audioRoutes = require('../routes/audio');

// Create Express app
const app = express();

// Set port
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ALLOWED_ORIGINS ? 
    process.env.CORS_ALLOWED_ORIGINS.split(',') : 
    ['http://localhost:3000', 'https://eonta.app']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Root route - Welcome page
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to EONTA API',
    version: '1.0.0',
    description: 'API for the EONTA audio-geographic composition platform',
    endpoints: {
      audio: '/api/audio',
      users: '/api/users',
      compositions: '/api/compositions',
      health: '/api/health'
    },
    documentation: '/api/docs',
    status: 'running'
  });
});

// Static files - serve the client build directory in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
}

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/compositions', compositionRoutes);
app.use('/api/audio', audioRoutes);

// API Documentation route
app.get('/api/docs', (req, res) => {
  res.status(200).json({
    title: 'EONTA API Documentation',
    description: 'API endpoints for the EONTA platform',
    version: '1.0.0',
    endpoints: {
      users: {
        register: {
          method: 'POST',
          path: '/api/users/register',
          description: 'Register a new user',
          body: {
            name: 'string',
            email: 'string',
            password: 'string'
          }
        },
        login: {
          method: 'POST',
          path: '/api/users/login',
          description: 'Login a user',
          body: {
            email: 'string',
            password: 'string'
          }
        },
        profile: {
          method: 'GET',
          path: '/api/users/profile',
          description: 'Get user profile information',
          auth: 'Required'
        }
      },
      compositions: {
        getAllCompositions: {
          method: 'GET',
          path: '/api/compositions',
          description: 'Get all compositions or filter by parameters'
        },
        createComposition: {
          method: 'POST',
          path: '/api/compositions',
          description: 'Create a new composition',
          auth: 'Required'
        },
        getCompositionById: {
          method: 'GET',
          path: '/api/compositions/:id',
          description: 'Get a specific composition by ID'
        },
        updateComposition: {
          method: 'PUT',
          path: '/api/compositions/:id',
          description: 'Update a composition',
          auth: 'Required'
        },
        deleteComposition: {
          method: 'DELETE',
          path: '/api/compositions/:id',
          description: 'Delete a composition',
          auth: 'Required'
        },
        shareComposition: {
          method: 'POST',
          path: '/api/compositions/:id/share',
          description: 'Share a composition via email',
          auth: 'Required'
        }
      },
      audio: {
        uploadAudio: {
          method: 'POST',
          path: '/api/audio/upload',
          description: 'Upload an audio file (auto-converts to optimal format)',
          auth: 'Required',
          contentType: 'multipart/form-data',
          formData: {
            audio: 'file'
          }
        },
        getAudioUrl: {
          method: 'GET',
          path: '/api/audio/:fileName',
          description: 'Get a signed URL to access an audio file',
          auth: 'Required'
        }
      }
    }
  });
});

// Basic route for API health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    message: 'EONTA API is running',
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Serve React app for any other routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;