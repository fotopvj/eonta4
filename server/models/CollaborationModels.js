// server/models/CollaborationSession.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Collaboration Session Schema
 * Represents a collaborative editing session for an EONTA composition
 */
const CollaborationSessionSchema = new Schema({
  // The composition being edited in this session
  compositionId: {
    type: Schema.Types.ObjectId,
    ref: 'Composition',
    required: true,
    index: true
  },
  
  // Session name (defaults to composition name)
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  // Session description
  description: {
    type: String,
    trim: true
  },
  
  // The user who created and owns the session
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // When the owner was last active
  ownerLastActive: {
    type: Date,
    default: Date.now
  },
  
  // Users who can collaborate in this session
  collaborators: [{
    // User ID
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    
    // Display name within session
    displayName: {
      type: String,
      required: true,
      trim: true
    },
    
    // Permission level
    permission: {
      type: String,
      enum: ['viewer', 'editor', 'admin'],
      default: 'viewer'
    },
    
    // User color for cursor and edits
    color: {
      type: String,
      default: '#CCCCCC'
    },
    
    // When this user was last active
    lastActive: {
      type: Date,
      default: Date.now
    },
    
    // When this user was added to the session
    addedAt: {
      type: Date,
      default: Date.now
    },
    
    // Who added this user (null if added by owner)
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Session status
  status: {
    type: String,
    enum: ['active', 'closed'],
    default: 'active'
  },
  
  // Optional session expiration
  expiresAt: {
    type: Date
  },
  
  // Session settings
  settings: {
    // Allow anonymous viewers
    allowAnonymous: {
      type: Boolean,
      default: false
    },
    
    // Auto-approve edit requests
    autoApproveEdits: {
      type: Boolean,
      default: false
    },
    
    // Limit edit regions
    limitEditRegions: {
      type: Boolean,
      default: false
    },
    
    // Require review for changes
    requireReview: {
      type: Boolean,
      default: false
    },
    
    // Track changes
    trackChanges: {
      type: Boolean,
      default: true
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
      return ret;
    }
  }
});

// Virtual for active collaborator count
CollaborationSessionSchema.virtual('activeCollaboratorCount').get(function() {
  if (!this.collaborators || !this.collaborators.length) return 0;
  
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  
  return this.collaborators.filter(c => 
    c.lastActive && c.lastActive > fifteenMinutesAgo
  ).length;
});

// Pre-save hook
CollaborationSessionSchema.pre('save', function(next) {
  // Ensure owner isn't also in collaborators list
  if (this.collaborators) {
    this.collaborators = this.collaborators.filter(c => 
      c.userId.toString() !== this.owner.toString()
    );
  }
  next();
});

// Model method to find active sessions for a user
CollaborationSessionSchema.statics.findActiveForUser = function(userId) {
  return this.find({
    $or: [
      { owner: userId },
      { 'collaborators.userId': userId }
    ],
    status: 'active'
  })
  .sort({ updatedAt: -1 })
  .populate('compositionId', 'title description')
  .exec();
};

// Model method to get session with active users
CollaborationSessionSchema.statics.getWithActiveUsers = async function(sessionId) {
  const session = await this.findById(sessionId)
    .populate('owner', 'name email')
    .populate('collaborators.userId', 'name email')
    .exec();
  
  if (!session) return null;
  
  // Calculate which users are active (active in last 15 minutes)
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  
  // Add active flag to collaborators
  const enrichedCollaborators = session.collaborators.map(c => ({
    ...c.toObject(),
    isActive: c.lastActive > fifteenMinutesAgo
  }));
  
  // Add owner active status
  const isOwnerActive = session.ownerLastActive > fifteenMinutesAgo;
  
  return {
    ...session.toObject(),
    collaborators: enrichedCollaborators,
    isOwnerActive
  };
};

module.exports = mongoose.model('CollaborationSession', CollaborationSessionSchema);

// server/models/CollaborationChange.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Collaboration Change Schema
 * Represents a single change made in a collaborative session
 */
const CollaborationChangeSchema = new Schema({
  // Session this change belongs to
  sessionId: {
    type: Schema.Types.ObjectId,
    ref: 'CollaborationSession',
    required: true,
    index: true
  },
  
  // User who made the change
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // When the change was made
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Type of change
  changeType: {
    type: String,
    required: true,
    enum: [
      'addBoundary',
      'updateBoundary',
      'deleteBoundary',
      'addAudio',
      'updateAudio',
      'deleteAudio',
      'updateComposition',
      'updateSettings'
    ]
  },
  
  // ID of the boundary or object being changed
  targetId: {
    type: String,
    index: true
  },
  
  // Change data specific to the change type
  payload: {
    type: Schema.Types.Mixed,
    required: true
  },
  
  // Status of the change
  status: {
    type: String,
    enum: ['pending', 'applied', 'rejected', 'conflicted'],
    default: 'pending',
    index: true
  },
  
  // Error message if conflicted or rejected
  error: {
    type: String
  },
  
  // User who resolved conflict/approved/rejected (if applicable)
  resolvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // When the change was resolved
  resolvedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Model method to get recent changes for a session
CollaborationChangeSchema.statics.getRecentForSession = function(sessionId, limit = 50) {
  return this.find({ sessionId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'name')
    .exec();
};

module.exports = mongoose.model('CollaborationChange', CollaborationChangeSchema);

// server/models/CollaborationMessage.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Collaboration Message Schema
 * Represents a chat or system message in a collaboration session
 */
const CollaborationMessageSchema = new Schema({
  // Session this message belongs to
  sessionId: {
    type: Schema.Types.ObjectId,
    ref: 'CollaborationSession',
    required: true,
    index: true
  },
  
  // User who sent the message (or 'system' for system messages)
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // When the message was sent
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Message type
  type: {
    type: String,
    enum: ['chat', 'system', 'notification'],
    default: 'chat'
  },
  
  // Message content
  content: {
    type: String,
    required: true,
    trim: true
  },
  
  // Message has been read by users
  readBy: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Model method to get recent messages for a session
CollaborationMessageSchema.statics.getRecentForSession = function(sessionId, limit = 20) {
  return this.find({ sessionId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'name')
    .exec();
};

module.exports = mongoose.model('CollaborationMessage', CollaborationMessageSchema);