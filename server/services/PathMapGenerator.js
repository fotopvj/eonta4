const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');

// AWS SDK v3 imports
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Use promisify for fs operations
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);
const mkdirAsync = promisify(fs.mkdir);

/**
 * Path Map Generator Service
 * Generates visual maps of user paths through audio installations
 * Modified version without canvas dependency
 */
class PathMapGenerator {
  constructor() {
    // Initialize AWS S3 client only if credentials are available
    if (
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_REGION
    ) {
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
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
          console.warn('Google Maps API key not configured. Using fallback URL.');
          return await this.generateFallbackMapUrl(recording);
        }
      } catch (error) {
        console.error('Error with Google Maps image generation:', error);
        return await this.generateFallbackMapUrl(recording);
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
    
    try {
      const imageResponse = await axios.get(staticMapUrl, axiosOptions);
      
      // Generate a secure temporary file path
      const tempDir = path.join(__dirname, '../temp');
      await this.ensureDirExists(tempDir);
      
      const randomSuffix = crypto.randomBytes(8).toString('hex');
      const tempFilePath = path.join(tempDir, `path_${recording.recordingId}_${randomSuffix}.png`);
      
      // Save to temp file
      await writeFileAsync(tempFilePath, imageResponse.data);
      
      // Upload to S3
      const s3Key = `path-maps/${recording.recordingId}.png`;
      const imageUrl = await this.uploadToS3(tempFilePath, s3Key);
      
      // Remove temp file
      try {
        await unlinkAsync(tempFilePath);
      } catch (unlinkError) {
        console.error('Error removing temp file:', unlinkError);
      }
      
      return imageUrl;
    } catch (error) {
      console.error('Error processing Google Maps image:', error);
      return this.generateFallbackMapUrl(recording);
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
    if (!this.s3Client) {
      throw new Error('S3 not configured');
    }
    
    try {
      // Create a readable stream from the file
      const fileStream = fs.createReadStream(filePath);
      
      // Set up the upload parameters
      const uploadParams = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: s3Key,
        Body: fileStream,
        ContentType: 'image/png',
        ACL: 'private'
      };
      
      // Upload the file to S3
      const command = new PutObjectCommand(uploadParams);
      await this.s3Client.send(command);
      
      // Generate a pre-signed URL (valid for 7 days, same as audio)
      const getObjectCommand = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: s3Key
      });
      
      const imageUrl = await getSignedUrl(this.s3Client, getObjectCommand, {
        expiresIn: 7 * 24 * 60 * 60 // 7 days in seconds
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
   * Generates a fallback URL for path maps without using canvas
   * @param {Object} recording - The path recording object
   * @returns {Promise<string>} - A static placeholder URL
   */
  async generateFallbackMapUrl(recording) {
    // If this method is called, we log the reason
    console.log('Using fallback map URL generation for recording:', recording.recordingId);
    
    try {
      // Return a static placeholder URL or generate a simple text-based map
      // and upload it to S3
      
      // Create a simple text representation of the journey
      const recordingStartTime = new Date(recording.startTime || Date.now()).toLocaleString();
      const recordingDuration = recording.duration ? 
        `${Math.floor(recording.duration / 60000)}m ${Math.floor((recording.duration % 60000) / 1000)}s` : 
        'Unknown';
      
      const pointCount = recording.path ? recording.path.length : 0;
      
      const textContent = `
Path Recording: ${recording.recordingId}
Date: ${recordingStartTime}
Duration: ${recordingDuration}
Points: ${pointCount}
Start: ${recording.path && recording.path.length > 0 ? 
        `${recording.path[0].lat.toFixed(6)}, ${recording.path[0].lng.toFixed(6)}` : 
        'Unknown'}
End: ${recording.path && recording.path.length > 1 ? 
      `${recording.path[recording.path.length-1].lat.toFixed(6)}, ${recording.path[recording.path.length-1].lng.toFixed(6)}` : 
      'Unknown'}
`;
      
      // Generate a temp file with this text
      const tempDir = path.join(__dirname, '../temp');
      await this.ensureDirExists(tempDir);
      
      const randomSuffix = crypto.randomBytes(8).toString('hex');
      const tempFilePath = path.join(tempDir, `path_${recording.recordingId}_${randomSuffix}.txt`);
      
      await writeFileAsync(tempFilePath, textContent);
      
      // Upload to S3
      const s3Key = `path-maps/${recording.recordingId}.txt`;
      
      if (this.s3Client) {
        try {
          // Upload the text file
          const uploadParams = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: s3Key,
            Body: fs.createReadStream(tempFilePath),
            ContentType: 'text/plain',
            ACL: 'private'
          };
          
          const command = new PutObjectCommand(uploadParams);
          await this.s3Client.send(command);
          
          // Create a signed URL
          const getObjectCommand = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: s3Key
          });
          
          const textUrl = await getSignedUrl(this.s3Client, getObjectCommand, {
            expiresIn: 7 * 24 * 60 * 60 // 7 days in seconds
          });
          
          // Clean up
          try {
            await unlinkAsync(tempFilePath);
          } catch (err) {
            console.error('Error removing temp file:', err);
          }
          
          return textUrl;
        } catch (error) {
          console.error('Error uploading fallback text map:', error);
        }
      }
      
      // If S3 upload fails or S3 is not configured, return a placeholder URL
      return `https://placeholder.com/map?id=${recording.recordingId}&t=${Date.now()}`;
    } catch (error) {
      console.error('Error generating fallback map URL:', error);
      return `https://placeholder.com/map?id=${recording.recordingId}&error=true`;
    }
  }
}

module.exports = new PathMapGenerator();