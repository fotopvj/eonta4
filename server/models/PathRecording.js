const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Path Recording Schema
 * Stores GPS path recordings and associated audio data
 */
const PathRecordingSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // Index for better query performance
  },
  composition: {
    type: Schema.Types.ObjectId,
    ref: 'Composition',
    required: true,
    index: true
  },
  recordingId: {
    type: String,
    required: true,
    unique: true,
    trim: true, // Remove whitespace
    validate: {
      validator: function(v) {
        return /^[a-zA-Z0-9_-]+$/.test(v); // Allow only alphanumeric, underscore, and dash
      },
      message: props => `${props.value} is not a valid recording ID!`
    }
  },
  path: [{
    lat: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    lng: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    timeSinceStart: {
      type: Number,
      required: true,
      min: 0
    },
    accuracy: {
      type: Number,
      min: 0
    },
    alt: {
      type: Number
    }
  }],
  audioEvents: [{
    timestamp: {
      type: Date,
      required: true
    },
    timeSinceStart: {
      type: Number,
      required: true,
      min: 0
    },
    activeRegions: [{
      regionId: {
        type: Schema.Types.ObjectId,
        ref: 'AudioRegion'
      },
      volume: {
        type: Number,
        default: 1.0,
        min: 0,
        max: 1.0
      },
      effects: {
        type: Object,
        default: {}
      }
    }]
  }],
  duration: {
    type: Number,
    required: true,
    min: 0
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true,
    validate: {
      validator: function(v) {
        return v >= this.startTime; // End time must be after start time
      },
      message: props => 'End time must be after start time!'
    }
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'error'],
    default: 'processing'
  },
  downloadUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        // Only validate if present
        if (!v) return true;
        
        // Simple URL validation
        try {
          new URL(v);
          return true;
        } catch (e) {
          return false;
        }
      },
      message: props => `${props.value} is not a valid URL!`
    }
  },
  mapImageUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        // Only validate if present
        if (!v) return true;
        
        // Simple URL validation
        try {
          new URL(v);
          return true;
        } catch (e) {
          return false;
        }
      },
      message: props => `${props.value} is not a valid URL!`
    }
  },
  expiresAt: {
    type: Date,
    validate: {
      validator: function(v) {
        // Only validate if present
        if (!v) return true;
        
        return v > new Date(); // Expiration date must be in the future
      },
      message: props => 'Expiration date must be in the future!'
    }
  },
  error: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true // Index for sorting and filtering
  },
  stats: {
    totalDistance: {
      type: Number, // meters
      default: 0,
      min: 0
    },
    averageSpeed: {
      type: Number, // meters per second
      default: 0,
      min: 0
    },
    uniqueRegionsVisited: {
      type: Number,
      default: 0,
      min: 0
    },
    downloadCount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  metadata: {
    device: {
      type: String,
      trim: true,
      maxlength: 200 // Avoid excessively long strings
    },
    browser: {
      type: String,
      trim: true,
      maxlength: 200
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 500
    },
    ipAddress: {
      type: String,
      trim: true,
      // Store hashed IP for privacy
      set: function(v) {
        // Only hash if value is present
        if (!v) return v;
        
        // Use built-in crypto module to hash IP
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(v).digest('hex');
      }
    }
  }
}, {
  // Add timestamps for better auditing
  timestamps: true,
  
  // Add toJSON option to clean up output
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v; // Remove version key
      delete ret.metadata.ipAddress; // Don't expose IP, even in hashed form
      return ret;
    }
  }
});

// Index for quick lookups - combined indices for common queries
PathRecordingSchema.index({ user: 1, createdAt: -1 });
PathRecordingSchema.index({ recordingId: 1 }, { unique: true });
PathRecordingSchema.index({ composition: 1 });
PathRecordingSchema.index({ status: 1, createdAt: -1 }); // For finding processing or error records

// Define virtual for whether the download is still valid
PathRecordingSchema.virtual('isDownloadValid').get(function() {
  if (!this.expiresAt) return false;
  return new Date() < this.expiresAt;
});

// Instance method to calculate total distance
PathRecordingSchema.methods.calculateTotalDistance = function() {
  if (!this.path || this.path.length < 2) return 0;
  
  let totalDistance = 0;
  
  for (let i = 1; i < this.path.length; i++) {
    const point1 = this.path[i - 1];
    const point2 = this.path[i];
    totalDistance += calculateDistance(
      point1.lat, point1.lng,
      point2.lat, point2.lng
    );
  }
  
  return totalDistance;
};

// Instance method to validate path
PathRecordingSchema.methods.validatePath = function() {
  if (!this.path || this.path.length < 2) {
    return { valid: false, message: 'Path must contain at least 2 points' };
  }
  
  // Check for invalid coordinates
  for (const point of this.path) {
    if (point.lat < -90 || point.lat > 90 || point.lng < -180 || point.lng > 180) {
      return { 
        valid: false, 
        message: `Invalid coordinates: lat=${point.lat}, lng=${point.lng}` 
      };
    }
  }
  
  return { valid: true };
};

// Utility function to calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Pre-save hook to calculate statistics and validate data
PathRecordingSchema.pre('save', async function(next) {
  try {
    if (this.isNew || this.isModified('path')) {
      // Validate path
      const pathValidation = this.validatePath();
      if (!pathValidation.valid) {
        return next(new Error(pathValidation.message));
      }
      
      // Calculate total distance
      this.stats.totalDistance = this.calculateTotalDistance();
      
      // Calculate average speed (if duration > 0)
      if (this.duration > 0) {
        this.stats.averageSpeed = this.stats.totalDistance / (this.duration / 1000);
      }
      
      // Count unique regions visited (using set of region IDs)
      const uniqueRegions = new Set();
      this.audioEvents.forEach(event => {
        event.activeRegions.forEach(region => {
          if (region.regionId) {
            uniqueRegions.add(region.regionId.toString());
          }
        });
      });
      
      this.stats.uniqueRegionsVisited = uniqueRegions.size;
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Static method to find recent recordings by user
PathRecordingSchema.statics.findRecentByUser = function(userId, limit = 10) {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('-path -audioEvents') // Exclude large arrays for better performance
    .exec();
};

// Static method to find completed recordings for a composition
PathRecordingSchema.statics.findCompletedForComposition = function(compositionId, limit = 20) {
  return this.find({ 
    composition: compositionId,
    status: 'completed'
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .select('-path -audioEvents')
  .exec();
};

const PathRecording = mongoose.model('PathRecording', PathRecordingSchema);

module.exports = PathRecording;