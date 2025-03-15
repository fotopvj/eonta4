const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const AWS = require('aws-sdk');
const crypto = require('crypto');
const { promisify } = require('util');

// Use promisify for fs operations
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);
const mkdirAsync = promisify(fs.mkdir);

/**
 * Path Map Generator Service
 * Generates visual maps of user paths through audio installations
 */
class PathMapGenerator {
  constructor() {
    // Initialize AWS only if credentials are available
    if (
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_REGION
    ) {
      this.s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION
      });
    } else {
      console.warn('AWS credentials not configured. S3 uploads will not work.');
    }
  }

  /**
   * Generate a static map image using the Google Maps Static API
   * @param {Object} recording - The path recording object
   * @param {Object} composition - The composition object
   * @returns {Promise<string>} - The URL of the generated map image
   */
  async generatePathMapImage(recording, composition) {
    try {
      // Validate input
      if (!recording || !recording.path || !recording.path.length) {
        throw new Error('Invalid recording data: missing path');
      }

      if (!recording.recordingId) {
        throw new Error('Invalid recording data: missing recordingId');
      }

      // Extract path coordinates from the recording
      const pathCoordinates = recording.path.map(point => {
        // Validate coordinates
        if (typeof point.lat !== 'number' || typeof point.lng !== 'number' ||
            point.lat < -90 || point.lat > 90 || point.lng < -180 || point.lng > 180) {
          throw new Error(`Invalid coordinates: ${JSON.stringify(point)}`);
        }
        return `${point.lat},${point.lng}`;
      });
      
      // If there are too many points for a URL, reduce the number of points
      // Google Maps Static API has URL length limitations
      const simplifiedPath = this.simplifyPath(pathCoordinates, 100); // Max 100 points
      
      try {
        // Try to use Google Maps Static API if API key is available
        if (process.env.GOOGLE_MAPS_API_KEY) {
          return await this.generateGoogleMapsImage(
            simplifiedPath, 
            recording, 
            composition
          );
        } else {
          console.warn('Google Maps API key not configured. Using fallback image generator.');
          return await this.generateFallbackPathImage(recording);
        }
      } catch (error) {
        console.error('Error with Google Maps image generation:', error);
        return await this.generateFallbackPathImage(recording);
      }
    } catch (error) {
      console.error('Error generating path map image:', error);
      return null;
    }
  }

  /**
   * Generate map image using Google Maps Static API
   * @param {Array} simplifiedPath - Simplified array of coordinate strings
   * @param {Object} recording - The path recording object
   * @param {Object} composition - The composition object
   * @returns {Promise<string>} - The URL of the generated map image
   */
  async generateGoogleMapsImage(simplifiedPath, recording, composition) {
    // Create Google Maps Static API URL
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    // Use composition center if available, otherwise use first point from path
    let mapCenter;
    if (composition && composition.location && composition.location.coordinates) {
      mapCenter = composition.location.coordinates.join(',');
    } else {
      const firstPoint = recording.path[0];
      mapCenter = `${firstPoint.lat},${firstPoint.lng}`;
    }
    
    const mapZoom = 15; // Adjust based on path size
    const mapSize = '600x400';
    const mapType = 'roadmap';
    
    // Create path parameter with color and weight
    const pathParam = `path=color:0x0000FFAA|weight:4|${simplifiedPath.join('|')}`;
    
    // Add markers for start (green) and end (red) points
    const firstCoord = recording.path[0];
    const lastCoord = recording.path[recording.path.length - 1];
    const startMarker = `markers=color:green|${firstCoord.lat},${firstCoord.lng}`;
    const endMarker = `markers=color:red|${lastCoord.lat},${lastCoord.lng}`;
    
    // Construct the final URL
    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${mapCenter}&zoom=${mapZoom}&size=${mapSize}&maptype=${mapType}&${pathParam}&${startMarker}&${endMarker}&key=${apiKey}`;
    
    // For higher security, we'll download the image and upload to our own S3 rather than sending Google Maps URL directly
    // Set a timeout for the request
    const axiosOptions = {
      responseType: 'arraybuffer',
      timeout: 15000 // 15 seconds timeout
    };
    
    const imageResponse = await axios.get(staticMapUrl, axiosOptions);
    
    // Generate a secure temporary file path
    const tempDir = path.join(__dirname, '../temp');
    await this.ensureDirExists(tempDir);
    
    const randomSuffix = crypto.randomBytes(8).toString('hex');
    const tempFilePath = path.join(tempDir, `path_${recording.recordingId}_${randomSuffix}.png`);
    
    // Save to temp file
    await writeFileAsync(tempFilePath, imageResponse.data);
    
    try {
      // Upload to S3
      const s3Key = `path-maps/${recording.recordingId}.png`;
      const imageUrl = await this.uploadToS3(tempFilePath, s3Key);
      
      // Remove temp file
      await unlinkAsync(tempFilePath);
      
      return imageUrl;
    } catch (error) {
      console.error('Error uploading to S3:', error);
      // Remove temp file even if upload fails
      try {
        await unlinkAsync(tempFilePath);
      } catch (unlinkError) {
        console.error('Error removing temp file:', unlinkError);
      }
      throw error;
    }
  }
  
  /**
   * Ensure directory exists
   * @param {string} dirPath - Directory path
   */
  async ensureDirExists(dirPath) {
    try {
      await mkdirAsync(dirPath, { recursive: true });
    } catch (error) {
      // Ignore if directory already exists
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }
  
  /**
   * Upload file to S3
   * @param {string} filePath - Path to the file
   * @param {string} s3Key - S3 key for the file
   * @returns {Promise<string>} - Presigned URL
   */
  async uploadToS3(filePath, s3Key) {
    if (!this.s3) {
      throw new Error('S3 not configured');
    }
    
    try {
      await this.s3.upload({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: s3Key,
        Body: fs.createReadStream(filePath),
        ContentType: 'image/png',
        ACL: 'private'
      }).promise();
      
      // Generate pre-signed URL (valid for 7 days, same as audio)
      const imageUrl = this.s3.getSignedUrl('getObject', {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: s3Key,
        Expires: 7 * 24 * 60 * 60 // 7 days in seconds
      });
      
      return imageUrl;
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error('Failed to upload image to S3');
    }
  }

  /**
   * Simplifies a path to have fewer points while maintaining the general shape
   * @param {Array} path - Array of coordinate strings
   * @param {Number} maxPoints - Maximum number of points to keep
   * @returns {Array} - Simplified path
   */
  simplifyPath(path, maxPoints) {
    if (!path || path.length <= maxPoints) {
      return path || [];
    }
    
    // Simple algorithm to reduce points - keep first, last, and evenly spaced points
    const result = [path[0]];
    const step = Math.floor(path.length / (maxPoints - 2));
    
    for (let i = step; i < path.length - step; i += step) {
      result.push(path[i]);
    }
    
    result.push(path[path.length - 1]);
    return result;
  }
  
  /**
   * Generates a fallback path image using HTML Canvas
   * @param {Object} recording - The path recording object
   * @returns {Promise<string>} - The URL of the generated image
   */
  async generateFallbackPathImage(recording) {
    try {
      // Validate input
      if (!recording || !recording.path || recording.path.length < 2) {
        throw new Error('Invalid recording data for fallback image');
      }
      
      // Extract path coordinates
      const pathPoints = recording.path.map(point => ({
        x: point.lng,
        y: point.lat
      }));
      
      // Find min/max coordinates to determine bounds
      const bounds = pathPoints.reduce((acc, point) => {
        return {
          minX: Math.min(acc.minX, point.x),
          maxX: Math.max(acc.maxX, point.x),
          minY: Math.min(acc.minY, point.y),
          maxY: Math.max(acc.maxY, point.y)
        };
      }, {
        minX: Infinity,
        maxX: -Infinity,
        minY: Infinity,
        maxY: -Infinity
      });
      
      // Add padding
      const padding = 0.0002; // Approximately 20 meters in lat/lng
      bounds.minX -= padding;
      bounds.maxX += padding;
      bounds.minY -= padding;
      bounds.maxY += padding;
      
      // Create canvas
      const width = 600;
      const height = 400;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      
      // Fill background
      ctx.fillStyle = '#F0F0F0';
      ctx.fillRect(0, 0, width, height);
      
      // Function to convert geo coordinates to canvas coordinates
      const mapToCanvas = (x, y) => {
        const canvasX = ((x - bounds.minX) / (bounds.maxX - bounds.minX)) * width;
        const canvasY = height - ((y - bounds.minY) / (bounds.maxY - bounds.minY)) * height;
        return { x: canvasX, y: canvasY };
      };
      
      // Draw path
      ctx.beginPath();
      const firstPoint = mapToCanvas(pathPoints[0].x, pathPoints[0].y);
      ctx.moveTo(firstPoint.x, firstPoint.y);
      
      for (let i = 1; i < pathPoints.length; i++) {
        const point = mapToCanvas(pathPoints[i].x, pathPoints[i].y);
        ctx.lineTo(point.x, point.y);
      }
      
      ctx.strokeStyle = 'rgba(0, 0, 255, 0.7)';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Draw start point (green)
      const startPoint = mapToCanvas(pathPoints[0].x, pathPoints[0].y);
      ctx.beginPath();
      ctx.arc(startPoint.x, startPoint.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = 'green';
      ctx.fill();
      
      // Draw end point (red)
      const endPoint = mapToCanvas(pathPoints[pathPoints.length - 1].x, pathPoints[pathPoints.length - 1].y);
      ctx.beginPath();
      ctx.arc(endPoint.x, endPoint.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = 'red';
      ctx.fill();
      
      // Add title and legend
      ctx.font = 'bold 16px Arial';
      ctx.fillStyle = '#333';
      ctx.fillText('Your Path Through the Sound Installation', 20, 30);
      
      ctx.font = '12px Arial';
      ctx.fillStyle = '#333';
      ctx.fillText('Start Point', 30, height - 40);
      ctx.beginPath();
      ctx.arc(20, height - 36, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'green';
      ctx.fill();
      
      ctx.fillStyle = '#333';
      ctx.fillText('End Point', 100, height - 40);
      ctx.beginPath();
      ctx.arc(90, height - 36, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'red';
      ctx.fill();
      
      // Add timestamp
      ctx.fillStyle = '#666';
      ctx.font = '10px Arial';
      ctx.fillText(`Generated: ${new Date().toLocaleString()}`, 20, height - 15);
      
      // Ensure temp directory exists
      const tempDir = path.join(__dirname, '../temp');
      await this.ensureDirExists(tempDir);
      
      // Generate a secure temporary file path
      const randomSuffix = crypto.randomBytes(8).toString('hex');
      const tempFilePath = path.join(tempDir, `path_${recording.recordingId}_${randomSuffix}.png`);
      
      // Save to temp file
      const buffer = canvas.toBuffer('image/png');
      await writeFileAsync(tempFilePath, buffer);
      
      try {
        // Upload to S3
        const s3Key = `path-maps/${recording.recordingId}.png`;
        const imageUrl = await this.uploadToS3(tempFilePath, s3Key);
        
        // Remove temp file
        await unlinkAsync(tempFilePath);
        
        return imageUrl;
      } catch (error) {
        console.error('Error uploading fallback image to S3:', error);
        // Remove temp file even if upload fails
        try {
          await unlinkAsync(tempFilePath);
        } catch (unlinkError) {
          console.error('Error removing temp file:', unlinkError);
        }
        return null;
      }
    } catch (error) {
      console.error('Error generating fallback path image:', error);
      return null;
    }
  }
}

module.exports = new PathMapGenerator();