// server/services/WebSocketService.js

const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const CollaborationSession = require('../models/CollaborationSession');
const CollaborationChange = require('../models/CollaborationChange');
const CollaborationMessage = require('../models/CollaborationMessage');

/**
 * WebSocket Service for real-time collaboration in EONTA
 */
class WebSocketService {
  constructor(server) {
    // Initialize Socket.IO with CORS config
    this.io = socketIo(server, {
      cors: {
        origin: process.env.CORS_ALLOWED_ORIGINS ? 
          process.env.CORS_ALLOWED_ORIGINS.split(',') : 
          ['http://localhost:3000', 'https://eonta.app'],
        methods: ['GET', 'POST'],
        credentials: true
      }
    });
    
    // Set up authentication middleware
    this.io.use(this.authenticateSocket.bind(this));
    
    // Initialize socket event handlers
    this.setupSocketHandlers();
    
    // Track connected users
    this.connectedUsers = new Map();
    this.userSessions = new Map();
    
    console.log('WebSocket service initialized');
  }
  
  /**
   * Authenticate socket connection using JWT
   * @param {Socket} socket - Socket connection
   * @param {Function} next - Next middleware function
   */
  async authenticateSocket(socket, next) {
    // Get token from handshake auth
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }
    
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Store user info in socket
      socket.user = {
        id: decoded.user.id,
        name: decoded.user.name,
        email: decoded.user.email
      };
      
      // Add to connected users map
      this.connectedUsers.set(decoded.user.id, {
        socketId: socket.id,
        name: decoded.user.name,
        connectedAt: new Date()
      });
      
      return next();
    } catch (error) {
      return next(new Error('Authentication error: Invalid token'));
    }
  }
  
  /**
   * Set up socket event handlers
   */
  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.user.name} (${socket.user.id})`);
      
      // Join a collaboration session
      socket.on('session:join', async (data) => {
        try {
          const { sessionId } = data;
          
          // Check if session exists
          const session = await CollaborationSession.findById(sessionId);
          if (!session) {
            socket.emit('error', { message: 'Session not found' });
            return;
          }
          
          // Check if user has permission to join
          const canJoin = this.checkSessionPermission(session, socket.user.id);
          if (!canJoin) {
            socket.emit('error', { message: 'You do not have permission to join this session' });
            return;
          }
          
          // Join socket room for this session
          socket.join(`session:${sessionId}`);
          
          // Track which session this user is in
          if (!this.userSessions.has(socket.user.id)) {
            this.userSessions.set(socket.user.id, new Set());
          }
          this.userSessions.get(socket.user.id).add(sessionId);
          
          // Get user color from session or assign a new one
          const userColor = this.getUserColor(session, socket.user.id);
          
          // Update user's active status in session
          await this.updateUserActiveStatus(sessionId, socket.user.id);
          
          // Get recent changes and messages
          const recentChanges = await CollaborationChange.find({ sessionId })
            .sort({ timestamp: -1 })
            .limit(50);
            
          const recentMessages = await CollaborationMessage.find({ sessionId })
            .sort({ timestamp: -1 })
            .limit(20);
          
          // Notify other users in the session
          socket.to(`session:${sessionId}`).emit('user:joined', {
            userId: socket.user.id,
            name: socket.user.name,
            color: userColor,
            timestamp: new Date()
          });
          
          // Send session data to the joining user
          socket.emit('session:joined', {
            session,
            recentChanges,
            recentMessages,
            color: userColor,
            activeUsers: await this.getSessionActiveUsers(sessionId)
          });
          
          // Log the join
          console.log(`User ${socket.user.name} joined session ${sessionId}`);
          
          // Add system message about user joining
          await this.addSystemMessage(sessionId, `${socket.user.name} joined the session`);
        } catch (error) {
          console.error('Error joining session:', error);
          socket.emit('error', { message: 'Error joining session', details: error.message });
        }
      });
      
      // Leave a collaboration session
      socket.on('session:leave', async (data) => {
        try {
          const { sessionId } = data;
          
          // Leave socket room
          socket.leave(`session:${sessionId}`);
          
          // Remove from tracking
          if (this.userSessions.has(socket.user.id)) {
            this.userSessions.get(socket.user.id).delete(sessionId);
          }
          
          // Notify other users
          socket.to(`session:${sessionId}`).emit('user:left', {
            userId: socket.user.id,
            name: socket.user.name,
            timestamp: new Date()
          });
          
          // Add system message
          await this.addSystemMessage(sessionId, `${socket.user.name} left the session`);
          
          console.log(`User ${socket.user.name} left session ${sessionId}`);
        } catch (error) {
          console.error('Error leaving session:', error);
        }
      });
      
      // User presence update (cursor position, view state)
      socket.on('user:presence', (data) => {
        const { sessionId, position, viewBounds } = data;
        
        // Broadcast to others in the session
        socket.to(`session:${sessionId}`).emit('user:presence', {
          userId: socket.user.id,
          name: socket.user.name,
          position,
          viewBounds,
          timestamp: new Date()
        });
      });
      
      // Submit a change
      socket.on('change:submit', async (data) => {
        try {
          const { sessionId, changeType, targetId, payload } = data;
          
          // Check if the session exists
          const session = await CollaborationSession.findById(sessionId);
          if (!session) {
            socket.emit('error', { message: 'Session not found' });
            return;
          }
          
          // Check if user has editor or admin permission
          const userPermission = this.getUserPermission(session, socket.user.id);
          if (userPermission === 'viewer') {
            socket.emit('error', { message: 'You do not have permission to make changes' });
            return;
          }
          
          // Create new change
          const change = new CollaborationChange({
            sessionId,
            userId: socket.user.id,
            timestamp: new Date(),
            changeType,
            targetId,
            payload,
            status: 'pending'
          });
          
          // Save to database
          await change.save();
          
          // Broadcast to everyone including sender
          this.io.to(`session:${sessionId}`).emit('change:submitted', {
            change: change.toObject(),
            user: {
              id: socket.user.id,
              name: socket.user.name
            }
          });
          
          // Process the change and apply it if valid
          await this.processChange(change, session);
        } catch (error) {
          console.error('Error submitting change:', error);
          socket.emit('error', { message: 'Error submitting change', details: error.message });
        }
      });
      
      // Lock a boundary for editing
      socket.on('boundary:lock', async (data) => {
        try {
          const { sessionId, boundaryId } = data;
          
          // Notify others about the lock
          socket.to(`session:${sessionId}`).emit('boundary:locked', {
            boundaryId,
            userId: socket.user.id,
            name: socket.user.name,
            timestamp: new Date()
          });
          
          // TODO: Store lock in database or memory cache
        } catch (error) {
          console.error('Error locking boundary:', error);
        }
      });
      
      // Unlock a boundary
      socket.on('boundary:unlock', async (data) => {
        try {
          const { sessionId, boundaryId } = data;
          
          // Notify others about the unlock
          socket.to(`session:${sessionId}`).emit('boundary:unlocked', {
            boundaryId,
            userId: socket.user.id,
            timestamp: new Date()
          });
          
          // TODO: Remove lock from database or memory cache
        } catch (error) {
          console.error('Error unlocking boundary:', error);
        }
      });
      
      // Send a chat message
      socket.on('message:send', async (data) => {
        try {
          const { sessionId, content } = data;
          
          // Create new message
          const message = new CollaborationMessage({
            sessionId,
            userId: socket.user.id,
            timestamp: new Date(),
            type: 'chat',
            content
          });
          
          // Save to database
          await message.save();
          
          // Broadcast to everyone in the session
          this.io.to(`session:${sessionId}`).emit('message:received', {
            message: message.toObject(),
            user: {
              id: socket.user.id,
              name: socket.user.name
            }
          });
        } catch (error) {
          console.error('Error sending message:', error);
          socket.emit('error', { message: 'Error sending message', details: error.message });
        }
      });
      
      // Handle disconnection
      socket.on('disconnect', async () => {
        console.log(`User disconnected: ${socket.user.name} (${socket.user.id})`);
        
        // Remove from connected users
        this.connectedUsers.delete(socket.user.id);
        
        // Handle all active sessions for this user
        if (this.userSessions.has(socket.user.id)) {
          const sessions = this.userSessions.get(socket.user.id);
          
          for (const sessionId of sessions) {
            // Notify others in each session
            this.io.to(`session:${sessionId}`).emit('user:left', {
              userId: socket.user.id,
              name: socket.user.name,
              timestamp: new Date()
            });
            
            // Add system message
            await this.addSystemMessage(sessionId, `${socket.user.name} disconnected`);
          }
          
          this.userSessions.delete(socket.user.id);
        }
      });
    });
  }
  
  /**
   * Add a system message to a session
   * @param {string} sessionId - Session ID
   * @param {string} content - Message content
   */
  async addSystemMessage(sessionId, content) {
    try {
      const message = new CollaborationMessage({
        sessionId,
        userId: 'system',
        timestamp: new Date(),
        type: 'system',
        content
      });
      
      await message.save();
      
      // Broadcast to everyone in the session
      this.io.to(`session:${sessionId}`).emit('message:received', {
        message: message.toObject(),
        user: {
          id: 'system',
          name: 'System'
        }
      });
      
      return message;
    } catch (error) {
      console.error('Error adding system message:', error);
      return null;
    }
  }
  
  /**
   * Check if a user has permission to join a session
   * @param {Object} session - Collaboration session
   * @param {string} userId - User ID
   * @returns {boolean} Whether user has permission
   */
  checkSessionPermission(session, userId) {
    // Session owner always has permission
    if (session.owner === userId) {
      return true;
    }
    
    // Check collaborators list
    const collaborator = session.collaborators.find(c => c.userId === userId);
    return !!collaborator;
  }
  
  /**
   * Get a user's permission level in a session
   * @param {Object} session - Collaboration session
   * @param {string} userId - User ID
   * @returns {string} Permission level ('viewer', 'editor', 'admin')
   */
  getUserPermission(session, userId) {
    // Owner is always admin
    if (session.owner === userId) {
      return 'admin';
    }
    
    // Find in collaborators
    const collaborator = session.collaborators.find(c => c.userId === userId);
    return collaborator ? collaborator.permission : 'viewer';
  }
  
  /**
   * Get or assign a color for a user in a session
   * @param {Object} session - Collaboration session
   * @param {string} userId - User ID
   * @returns {string} Color in hex format
   */
  getUserColor(session, userId) {
    // Check if user already has a color assigned
    const collaborator = session.collaborators.find(c => c.userId === userId);
    if (collaborator && collaborator.color) {
      return collaborator.color;
    }
    
    // Assign a new color
    const colors = [
      '#4A90E2', '#D0021B', '#7ED321', '#9013FE', '#F5A623', 
      '#50E3C2', '#BD10E0', '#00FF00', '#FF9500', '#8B572A'
    ];
    
    // Find used colors
    const usedColors = session.collaborators
      .filter(c => c.color)
      .map(c => c.color);
    
    // Find an unused color
    const availableColors = colors.filter(c => !usedColors.includes(c));
    let newColor;
    
    if (availableColors.length > 0) {
      newColor = availableColors[0];
    } else {
      // If all colors are used, pick a random one
      newColor = colors[Math.floor(Math.random() * colors.length)];
    }
    
    // Update the user's color in the session if they're a collaborator
    if (collaborator) {
      collaborator.color = newColor;
      session.markModified('collaborators');
      session.save().catch(err => console.error('Error saving session color:', err));
    }
    
    return newColor;
  }
  
  /**
   * Update a user's activity status in a session
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID
   */
  async updateUserActiveStatus(sessionId, userId) {
    try {
      const session = await CollaborationSession.findById(sessionId);
      if (!session) return;
      
      // Update owner's last active time if this is the owner
      if (session.owner === userId) {
        session.ownerLastActive = new Date();
      }
      
      // Update collaborator's last active time
      const collaborator = session.collaborators.find(c => c.userId === userId);
      if (collaborator) {
        collaborator.lastActive = new Date();
        session.markModified('collaborators');
      }
      
      await session.save();
    } catch (error) {
      console.error('Error updating user active status:', error);
    }
  }
  
  /**
   * Get active users in a session
   * @param {string} sessionId - Session ID
   * @returns {Array} Array of active users
   */
  async getSessionActiveUsers(sessionId) {
    try {
      const session = await CollaborationSession.findById(sessionId);
      if (!session) return [];
      
      const activeUsers = [];
      
      // Add owner if they're connected
      if (this.connectedUsers.has(session.owner)) {
        activeUsers.push({
          userId: session.owner,
          name: this.connectedUsers.get(session.owner).name,
          color: '#FF0000', // Owner gets red
          permission: 'admin',
          isOwner: true
        });
      }
      
      // Add connected collaborators
      for (const collaborator of session.collaborators) {
        if (this.connectedUsers.has(collaborator.userId)) {
          activeUsers.push({
            userId: collaborator.userId,
            name: this.connectedUsers.get(collaborator.userId).name,
            color: collaborator.color || '#CCCCCC',
            permission: collaborator.permission,
            isOwner: false
          });
        }
      }
      
      return activeUsers;
    } catch (error) {
      console.error('Error getting session active users:', error);
      return [];
    }
  }
  
  /**
   * Process a change and apply it if valid
   * @param {Object} change - The change object
   * @param {Object} session - The session object
   */
  async processChange(change, session) {
    try {
      // For this example, we'll just mark all changes as applied immediately
      // In a real implementation, you'd check for conflicts and validate changes
      
      // Update change status
      change.status = 'applied';
      await change.save();
      
      // Notify everyone about the applied change
      this.io.to(`session:${change.sessionId}`).emit('change:applied', {
        changeId: change._id,
        timestamp: new Date()
      });
      
      // In a real implementation, you would apply the change to the composition model
      // This would involve updating the composition in the database
    } catch (error) {
      console.error('Error processing change:', error);
      
      // Mark as conflicted
      change.status = 'conflicted';
      change.error = error.message;
      await change.save();
      
      // Notify everyone about the conflict
      this.io.to(`session:${change.sessionId}`).emit('change:conflict', {
        changeId: change._id,
        error: error.message,
        timestamp: new Date()
      });
    }
  }
}

module.exports = WebSocketService;
