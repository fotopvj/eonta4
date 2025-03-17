// client/src/services/CollaborationManager.js

import io from 'socket.io-client';

/**
 * Collaboration Manager Service
 * Handles real-time collaboration features for EONTA
 */
class CollaborationManager {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.activeSession = null;
    this.activeUsers = new Map();
    this.boundaries = new Map();
    this.lockedBoundaries = new Map();
    this.userCursors = new Map();
    this.messages = [];
    this.changes = [];
    
    // Callback handlers for events
    this.eventHandlers = {
      onUserJoined: null,
      onUserLeft: null,
      onUserPresenceChanged: null,
      onChangeSubmitted: null,
      onChangeApplied: null,
      onChangeConflict: null,
      onBoundaryLocked: null,
      onBoundaryUnlocked: null,
      onMessageReceived: null,
      onSessionJoined: null,
      onError: null,
      onConnectionChanged: null
    };
    
    // Attempt to restore session from localStorage
    this.restoreSession();
  }
  
  /**
   * Initialize the socket connection
   * @param {string} token - JWT authentication token
   * @returns {Promise} Connection promise
   */
  async connect(token) {
    if (this.socket && this.connected) {
      console.log('Already connected to collaboration server');
      return true;
    }
    
    return new Promise((resolve, reject) => {
      try {
        // Determine the WebSocket URL based on environment
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const host = process.env.REACT_APP_API_URL || window.location.host;
        const wsUrl = `${protocol}://${host}`;
        
        console.log(`Connecting to collaboration server at ${wsUrl}`);
        
        // Initialize socket with authentication
        this.socket = io(wsUrl, {
          auth: { token },
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 10000
        });
        
        // Connection events
        this.socket.on('connect', () => {
          console.log('Connected to collaboration server');
          this.connected = true;
          
          if (this.eventHandlers.onConnectionChanged) {
            this.eventHandlers.onConnectionChanged(true);
          }
          
          // If we have an active session, rejoin it
          if (this.activeSession) {
            this.joinSession(this.activeSession.id);
          }
          
          resolve(true);
        });
        
        this.socket.on('disconnect', () => {
          console.log('Disconnected from collaboration server');
          this.connected = false;
          
          if (this.eventHandlers.onConnectionChanged) {
            this.eventHandlers.onConnectionChanged(false);
          }
        });
        
        this.socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          
          if (this.eventHandlers.onError) {
            this.eventHandlers.onError('Connection error: ' + error.message);
          }
          
          reject(error);
        });
        
        // Set up event handlers
        this.setupEventHandlers();
      } catch (error) {
        console.error('Error initializing socket:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Set up socket event handlers
   */
  setupEventHandlers() {
    if (!this.socket) return;
    
    // Session events
    this.socket.on('session:joined', (data) => {
      console.log('Joined session:', data);
      this.activeSession = data.session;
      this.activeUsers.clear();
      
      // Add active users
      if (data.activeUsers && Array.isArray(data.activeUsers)) {
        data.activeUsers.forEach(user => {
          this.activeUsers.set(user.userId, user);
        });
      }
      
      // Set user color
      this.userColor = data.color;
      
      // Save recent messages and changes
      this.messages = data.recentMessages || [];
      this.changes = data.recentChanges || [];
      
      // Save session to localStorage
      this.saveSession();
      
      // Notify listeners
      if (this.eventHandlers.onSessionJoined) {
        this.eventHandlers.onSessionJoined(data);
      }
    });
    
    // User events
    this.socket.on('user:joined', (data) => {
      console.log('User joined:', data);
      this.activeUsers.set(data.userId, {
        userId: data.userId,
        name: data.name,
        color: data.color
      });
      
      if (this.eventHandlers.onUserJoined) {
        this.eventHandlers.onUserJoined(data);
      }
    });
    
    this.socket.on('user:left', (data) => {
      console.log('User left:', data);
      this.activeUsers.delete(data.userId);
      this.userCursors.delete(data.userId);
      
      if (this.eventHandlers.onUserLeft) {
        this.eventHandlers.onUserLeft(data);
      }
    });
    
    this.socket.on('user:presence', (data) => {
      if (data.position) {
        this.userCursors.set(data.userId, data.position);
      }
      
      if (this.eventHandlers.onUserPresenceChanged) {
        this.eventHandlers.onUserPresenceChanged(data);
      }
    });
    
    // Change events
    this.socket.on('change:submitted', (data) => {
      console.log('Change submitted:', data);
      
      // Add to local changes list
      if (data.change) {
        this.changes.unshift(data.change);
        
        // Limit to 50 changes in memory
        if (this.changes.length > 50) {
          this.changes.pop();
        }
      }
      
      if (this.eventHandlers.onChangeSubmitted) {
        this.eventHandlers.onChangeSubmitted(data);
      }
    });
    
    this.socket.on('change:applied', (data) => {
      console.log('Change applied:', data);
      
      // Update change status in local list
      const change = this.changes.find(c => c._id === data.changeId);
      if (change) {
        change.status = 'applied';
      }
      
      if (this.eventHandlers.onChangeApplied) {
        this.eventHandlers.onChangeApplied(data);
      }
    });
    
    this.socket.on('change:conflict', (data) => {
      console.log('Change conflict:', data);
      
      // Update change status in local list
      const change = this.changes.find(c => c._id === data.changeId);
      if (change) {
        change.status = 'conflicted';
        change.error = data.error;
      }
      
      if (this.eventHandlers.onChangeConflict) {
        this.eventHandlers.onChangeConflict(data);
      }
    });
    
    // Boundary lock events
    this.socket.on('boundary:locked', (data) => {
      console.log('Boundary locked:', data);
      this.lockedBoundaries.set(data.boundaryId, {
        userId: data.userId,
        name: data.name,
        timestamp: new Date(data.timestamp)
      });
      
      if (this.eventHandlers.onBoundaryLocked) {
        this.eventHandlers.onBoundaryLocked(data);
      }
    });
    
    this.socket.on('boundary:unlocked', (data) => {
      console.log('Boundary unlocked:', data);
      this.lockedBoundaries.delete(data.boundaryId);
      
      if (this.eventHandlers.onBoundaryUnlocked) {
        this.eventHandlers.onBoundaryUnlocked(data);
      }
    });
    
    // Message events
    this.socket.on('message:received', (data) => {
      console.log('Message received:', data);
      
      // Add to local messages list
      if (data.message) {
        this.messages.unshift(data.message);
        
        // Limit to 50 messages in memory
        if (this.messages.length > 50) {
          this.messages.pop();
        }
      }
      
      if (this.eventHandlers.onMessageReceived) {
        this.eventHandlers.onMessageReceived(data);
      }
    });
    
    // Error events
    this.socket.on('error', (data) => {
      console.error('Socket error:', data);
      
      if (this.eventHandlers.onError) {
        this.eventHandlers.onError(data.message || 'Unknown error');
      }
    });
  }
  
  /**
   * Join a collaboration session
   * @param {string} sessionId - Session to join
   */
  joinSession(sessionId) {
    if (!this.socket || !this.connected) {
      console.error('Not connected to collaboration server');
      return false;
    }
    
    // Leave current session if any
    if (this.activeSession && this.activeSession.id !== sessionId) {
      this.leaveSession();
    }
    
    console.log(`Joining session ${sessionId}...`);
    this.socket.emit('session:join', { sessionId });
    return true;
  }
  
  /**
   * Leave the current session
   */
  leaveSession() {
    if (!this.socket || !this.connected || !this.activeSession) {
      return false;
    }
    
    console.log(`Leaving session ${this.activeSession.id}...`);
    this.socket.emit('session:leave', { sessionId: this.activeSession.id });
    
    this.activeSession = null;
    this.activeUsers.clear();
    this.userCursors.clear();
    this.lockedBoundaries.clear();
    this.messages = [];
    this.changes = [];
    
    // Clear from localStorage
    localStorage.removeItem('eonta_active_session');
    
    return true;
  }
  
  /**
   * Update user presence (cursor position, view state)
   * @param {Object} position - Map position {lat, lng}
   * @param {Object} viewBounds - Map view bounds
   */
  updatePresence(position, viewBounds) {
    if (!this.socket || !this.connected || !this.activeSession) {
      return false;
    }
    
    this.socket.emit('user:presence', {
      sessionId: this.activeSession.id,
      position,
      viewBounds
    });
    
    return true;
  }
  
  /**
   * Submit a change to the composition
   * @param {string} changeType - Type of change
   * @param {string} targetId - ID of the boundary/element being changed
   * @param {Object} payload - Change data
   */
  submitChange(changeType, targetId, payload) {
    if (!this.socket || !this.connected || !this.activeSession) {
      return false;
    }
    
    console.log(`Submitting change: ${changeType} for ${targetId}`);
    this.socket.emit('change:submit', {
      sessionId: this.activeSession.id,
      changeType,
      targetId,
      payload
    });
    
    return true;
  }
  
  /**
   * Lock a boundary for editing
   * @param {string} boundaryId - Boundary ID
   */
  lockBoundary(boundaryId) {
    if (!this.socket || !this.connected || !this.activeSession) {
      return false;
    }
    
    console.log(`Locking boundary: ${boundaryId}`);
    this.socket.emit('boundary:lock', {
      sessionId: this.activeSession.id,
      boundaryId
    });
    
    return true;
  }
  
  /**
   * Unlock a boundary
   * @param {string} boundaryId - Boundary ID
   */
  unlockBoundary(boundaryId) {
    if (!this.socket || !this.connected || !this.activeSession) {
      return false;
    }
    
    console.log(`Unlocking boundary: ${boundaryId}`);
    this.socket.emit('boundary:unlock', {
      sessionId: this.activeSession.id,
      boundaryId
    });
    
    return true;
  }
  
  /**
   * Send a chat message
   * @param {string} content - Message content
   */
  sendMessage(content) {
    if (!this.socket || !this.connected || !this.activeSession) {
      return false;
    }
    
    if (!content || content.trim() === '') {
      return false;
    }
    
    console.log(`Sending message: ${content}`);
    this.socket.emit('message:send', {
      sessionId: this.activeSession.id,
      content: content.trim()
    });
    
    return true;
  }
  
  /**
   * Check if a boundary is locked by another user
   * @param {string} boundaryId - Boundary ID
   * @returns {Object|null} Lock info or null if not locked
   */
  getBoundaryLock(boundaryId) {
    return this.lockedBoundaries.get(boundaryId) || null;
  }
  
  /**
   * Check if a boundary is locked by the current user
   * @param {string} boundaryId - Boundary ID
   * @returns {boolean} Whether boundary is locked by current user
   */
  isBoundaryLockedByMe(boundaryId) {
    const lock = this.lockedBoundaries.get(boundaryId);
    if (!lock) return false;
    
    // In a real implementation, you would get the current user ID from auth service
    // For now, we'll use a dummy user ID
    const currentUserId = localStorage.getItem('userId') || 'unknown';
    return lock.userId === currentUserId;
  }
  
  /**
   * Get all active users in the session
   * @returns {Array} Array of active users
   */
  getActiveUsers() {
    return Array.from(this.activeUsers.values());
  }
  
  /**
   * Get recent messages
   * @returns {Array} Array of recent messages
   */
  getRecentMessages() {
    return this.messages;
  }
  
  /**
   * Get recent changes
   * @returns {Array} Array of recent changes
   */
  getRecentChanges() {
    return this.changes;
  }
  
  /**
   * Register event handlers
   * @param {string} eventName - Event name
   * @param {Function} callback - Event callback
   */
  on(eventName, callback) {
    if (this.eventHandlers.hasOwnProperty(eventName)) {
      this.eventHandlers[eventName] = callback;
    } else {
      console.warn(`Unknown event: ${eventName}`);
    }
  }
  
  /**
   * Save active session to localStorage
   */
  saveSession() {
    if (!this.activeSession) return;
    
    try {
      localStorage.setItem('eonta_active_session', JSON.stringify({
        id: this.activeSession.id,
        name: this.activeSession.name,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error saving session to localStorage:', error);
    }
  }
  
  /**
   * Restore session from localStorage
   */
  restoreSession() {
    try {
      const savedSession = localStorage.getItem('eonta_active_session');
      if (savedSession) {
        const session = JSON.parse(savedSession);
        
        // Check if session isn't too old (max 24 hours)
        const timestamp = new Date(session.timestamp);
        const now = new Date();
        const ageHours = (now - timestamp) / (1000 * 60 * 60);
        
        if (ageHours < 24) {
          this.activeSession = {
            id: session.id,
            name: session.name
          };
          
          console.log(`Restored session: ${this.activeSession.name}`);
          return true;
        } else {
          // Session too old, remove it
          localStorage.removeItem('eonta_active_session');
        }
      }
    } catch (error) {
      console.error('Error restoring session from localStorage:', error);
    }
    
    return false;
  }
  
  /**
   * Disconnect from the collaboration server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.connected = false;
    this.activeSession = null;
    this.activeUsers.clear();
    this.userCursors.clear();
    this.lockedBoundaries.clear();
  }
  
  /**
   * Dispose of resources
   */
  dispose() {
    this.disconnect();
    this.eventHandlers = {};
  }
}

// Export a singleton instance
export default new CollaborationManager();
