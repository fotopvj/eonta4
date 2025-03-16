/**
 * Audio configuration settings for EONTA
 */
module.exports = {
  /**
   * Target audio format for web streaming
   */
  targetFormat: {
    codec: 'libmp3lame',          // MP3 codec
    bitrate: 192,                 // 192kbps - good quality for most music
    channels: 2,                  // Stereo
    sampleRate: 44100,            // 44.1 kHz
    extension: '.mp3',
    mimeType: 'audio/mpeg'
  },

  /**
   * List of mime types that need conversion
   * MP3 files don't need conversion, everything else does
   */
  conversionNeeded: [
    'audio/wav',
    'audio/x-wav',
    'audio/flac',
    'audio/x-flac',
    'audio/ogg',
    'audio/vorbis',
    'audio/aac',
    'audio/m4a',
    'audio/x-m4a',
    'audio/x-aiff',
    'audio/aiff'
  ],

  /**
   * Common MIME types for audio files
   */
  mimeTypes: {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
    '.aac': 'audio/aac',
    '.m4a': 'audio/x-m4a',
    '.aiff': 'audio/aiff'
  },

  /**
   * Maximum file size in MB
   * This is overridden by the MAX_AUDIO_FILE_SIZE_MB environment variable if set
   */
  maxFileSizeMB: 30,

  /**
   * Default caching settings for audio files
   */
  caching: {
    maxAge: 31536000 // 1 year in seconds
  }
};