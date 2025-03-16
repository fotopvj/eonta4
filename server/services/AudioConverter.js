const ffmpeg = require('fluent-ffmpeg');
const tmp = require('tmp');
const fs = require('fs');
const path = require('path');

/**
 * AudioConverter service for EONTA
 * Handles conversion of audio files to optimized MP3 format
 */
class AudioConverter {
  /**
   * Convert audio file to optimized MP3 format for web streaming
   * 
   * @param {Buffer} fileBuffer - The original audio file as a buffer
   * @param {string} originalFilename - Original filename
   * @param {string} originalMimetype - Original mimetype
   * @returns {Promise<{buffer: Buffer, filename: string, mimetype: string}>} - Converted file info
   */
  convertToOptimizedFormat(fileBuffer, originalFilename, originalMimetype) {
    return new Promise((resolve, reject) => {
      // Create temporary input file
      const inputTmpFile = tmp.fileSync({ postfix: path.extname(originalFilename) });
      fs.writeFileSync(inputTmpFile.name, fileBuffer);
      
      // Create temporary output file for MP3
      const outputTmpFile = tmp.fileSync({ postfix: '.mp3' });
      
      // Setup conversion based on original file type
      const command = ffmpeg(inputTmpFile.name);
      
      // Set output quality options - 192kbps is a good balance for audio quality and file size
      command
        .noVideo()
        .audioCodec('libmp3lame')
        .audioBitrate(192)
        .audioChannels(2)
        .audioFrequency(44100)
        .format('mp3')
        .output(outputTmpFile.name)
        .on('end', () => {
          // Read the converted file
          try {
            const convertedBuffer = fs.readFileSync(outputTmpFile.name);
            
            // Generate new filename (preserving original name but with mp3 extension)
            const filename = `${path.basename(originalFilename, path.extname(originalFilename))}.mp3`;
            
            // Clean up temp files
            inputTmpFile.removeCallback();
            outputTmpFile.removeCallback();
            
            resolve({
              buffer: convertedBuffer,
              filename: filename,
              mimetype: 'audio/mpeg'
            });
          } catch (err) {
            reject(err);
          }
        })
        .on('error', (err) => {
          // Clean up temp files
          inputTmpFile.removeCallback();
          outputTmpFile.removeCallback();
          reject(err);
        })
        .run();
    });
  }

  /**
   * Determine if file conversion is needed
   * 
   * @param {string} mimetype - The original file's mimetype
   * @returns {boolean} - Whether conversion is needed
   */
  isConversionNeeded(mimetype) {
    // If it's already an MP3, no need to convert
    if (mimetype === 'audio/mpeg' || mimetype === 'audio/mp3') {
      return false;
    }
    
    return true;
  }
}

module.exports = new AudioConverter();