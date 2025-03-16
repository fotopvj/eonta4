const express = require('express');
const router = express.Router();
const multer = require('multer');
const AWS = require('aws-sdk');
const path = require('path');
const jwt = require('jsonwebtoken');
const AudioConverter = require('../server/services/AudioConverter');
const audioConfig = require('../server/config/audio');

// Configure AWS S3
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

// Configure Multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: process.env.MAX_AUDIO_FILE_SIZE_MB * 1024 * 1024 || audioConfig.maxFileSizeMB * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    // Accept all audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'), false);
    }
  }
});

// Middleware for protected routes
const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// @route   POST api/audio/upload
// @desc    Upload audio file to S3 with automatic conversion to optimal format
// @access  Private
router.post('/upload', auth, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    let fileBuffer = req.file.buffer;
    let fileName = req.file.originalname;
    let fileMimetype = req.file.mimetype;
    let wasConverted = false;

    // Check if conversion is needed
    if (AudioConverter.isConversionNeeded(req.file.mimetype)) {
      try {
        console.log(`Converting file from ${req.file.mimetype} to MP3 format...`);
        const convertedFile = await AudioConverter.convertToOptimizedFormat(
          req.file.buffer, 
          req.file.originalname,
          req.file.mimetype
        );
        
        fileBuffer = convertedFile.buffer;
        fileName = convertedFile.filename;
        fileMimetype = convertedFile.mimetype;
        wasConverted = true;
        
        console.log(`Conversion complete. New file size: ${fileBuffer.length / 1024} KB`);
      } catch (conversionError) {
        console.error('Error converting audio file:', conversionError);
        // Fall back to original file if conversion fails
        console.log('Using original file instead');
      }
    }

    // Create unique filename with timestamp
    const uniqueFileName = `${Date.now()}-${path.basename(fileName)}`;
    
    // Set up S3 upload parameters
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: uniqueFileName,
      Body: fileBuffer,
      ContentType: fileMimetype,
      ACL: 'private', // Restrict public access
      CacheControl: `max-age=${audioConfig.caching.maxAge}` // Cache based on config
    };

    // Upload to S3
    const uploadResult = await s3.upload(params).promise();
    
    res.status(200).json({
      success: true,
      file: {
        name: uniqueFileName,
        originalName: fileName,
        url: uploadResult.Location,
        size: fileBuffer.length,
        type: fileMimetype,
        converted: wasConverted
      },
      message: `File upload successful${wasConverted ? ' (converted to MP3)' : ''}`
    });
  } catch (err) {
    console.error('Error in audio upload:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route   GET api/audio/:fileName
// @desc    Get a signed URL to access an audio file
// @access  Private
router.get('/:fileName', auth, async (req, res) => {
  try {
    const { fileName } = req.params;
    
    // Set up S3 params for generating a signed URL
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileName,
      Expires: 3600 // URL expiration time in seconds (1 hour)
    };

    // Generate a signed URL for the file
    const signedUrl = await s3.getSignedUrlPromise('getObject', params);
    
    res.status(200).json({
      success: true,
      url: signedUrl,
      expires: new Date(Date.now() + 3600 * 1000).toISOString()
    });
  } catch (err) {
    console.error('Error generating signed URL:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;