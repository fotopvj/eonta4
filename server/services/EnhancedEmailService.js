const nodemailer = require('nodemailer');
const pathMapGenerator = require('./PathMapGenerator');
const { sanitizeHtml } = require('../utils/security'); // Add this utility
const rateLimit = require('express-rate-limit'); // Add this dependency

/**
 * Enhanced Email Service
 * Sends emails with audio compositions and path maps
 */
class EnhancedEmailService {
  constructor() {
    // Configure nodemailer with secure settings
    this.transporter = null;
    this.setupTransporter();
    
    // Track email sending for rate limiting
    this.emailSendAttempts = new Map();
    this.maxEmailsPerHour = 10; // Limit emails per user/IP
  }
  
  /**
   * Set up email transporter with environment variables
   */
  setupTransporter() {
    try {
      // Validate required environment variables
      const requiredEnvVars = [
        'EMAIL_HOST', 
        'EMAIL_PORT', 
        'EMAIL_USER', 
        'EMAIL_PASSWORD',
        'EMAIL_FROM'
      ];
      
      for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
          throw new Error(`Missing required environment variable: ${envVar}`);
        }
      }
      
      // Parse secure flag properly
      const secureConnection = process.env.EMAIL_SECURE === 'true';
      
      // Create transporter with secure settings
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT, 10),
        secure: secureConnection,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        },
        tls: {
          // Require TLS
          rejectUnauthorized: true,
          minVersion: 'TLSv1.2'
        }
      });
      
      // Verify connection configuration
      this.transporter.verify((error) => {
        if (error) {
          console.error('Email service configuration error:', error);
        } else {
          console.log('Email service ready to send messages');
        }
      });
    } catch (error) {
      console.error('Failed to set up email transporter:', error);
      // The service will attempt to reconnect when sending emails
    }
  }
  
  /**
   * Check if email rate limit is exceeded
   * @param {String} identifier - User email or IP address
   * @returns {Boolean} - Whether rate limit is exceeded
   */
  isRateLimited(identifier) {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    
    // Get attempts in the last hour
    if (!this.emailSendAttempts.has(identifier)) {
      this.emailSendAttempts.set(identifier, []);
    }
    
    // Get attempts and filter to last hour only
    let attempts = this.emailSendAttempts.get(identifier);
    attempts = attempts.filter(timestamp => timestamp > hourAgo);
    
    // Update the stored attempts
    this.emailSendAttempts.set(identifier, attempts);
    
    // Check if rate limit exceeded
    return attempts.length >= this.maxEmailsPerHour;
  }
  
  /**
   * Record an email send attempt
   * @param {String} identifier - User email or IP address
   */
  recordEmailAttempt(identifier) {
    if (!this.emailSendAttempts.has(identifier)) {
      this.emailSendAttempts.set(identifier, []);
    }
    
    const attempts = this.emailSendAttempts.get(identifier);
    attempts.push(Date.now());
    
    this.emailSendAttempts.set(identifier, attempts);
  }
  
  /**
   * Validate email format
   * @param {String} email - Email to validate
   * @returns {Boolean} Whether email is valid
   */
  isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    
    // Basic email format validation using regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }
  
  /**
   * Sends an enhanced email with both the audio download link and path map
   * @param {String} email - Recipient email address
   * @param {String} downloadUrl - URL for the audio composition download
   * @param {Date} expiresAt - Expiration date for the download link
   * @param {String} compositionTitle - Title of the original composition
   * @param {Object} recording - The path recording object
   * @param {Object} composition - The original composition object
   * @param {String} requestIp - IP address of the requester (for rate limiting)
   * @returns {Promise} - Result of sending the email
   */
  async sendEnhancedDownloadEmail(email, downloadUrl, expiresAt, compositionTitle, recording, composition, requestIp) {
    // Validate inputs
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email address');
    }
    
    if (!downloadUrl || typeof downloadUrl !== 'string') {
      throw new Error('Invalid download URL');
    }
    
    if (!(expiresAt instanceof Date)) {
      throw new Error('Invalid expiration date');
    }
    
    // Apply rate limiting (using both email and IP for better protection)
    const identifier = `${email}_${requestIp || 'unknown'}`;
    if (this.isRateLimited(identifier)) {
      throw new Error('Email rate limit exceeded. Please try again later.');
    }
    
    // Record this attempt regardless of success or failure
    this.recordEmailAttempt(identifier);
    
    // Ensure transporter is set up
    if (!this.transporter) {
      this.setupTransporter();
      if (!this.transporter) {
        throw new Error('Email service is unavailable');
      }
    }
    
    try {
      // Sanitize inputs to prevent XSS
      const sanitizedTitle = sanitizeHtml(compositionTitle || 'EONTA Composition');
      
      // Generate the path map image
      let pathMapUrl = null;
      try {
        pathMapUrl = await pathMapGenerator.generatePathMapImage(recording, composition);
      } catch (mapError) {
        console.error('Error generating path map:', mapError);
        // Continue without map - non-critical error
      }
      
      // Format duration for display
      const durationMinutes = Math.floor((recording?.duration || 0) / 1000 / 60);
      const durationSeconds = Math.floor(((recording?.duration || 0) / 1000) % 60);
      const formattedDuration = `${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`;
      
      // Format date safely
      const formattedDate = expiresAt.toLocaleDateString();
      
      // Calculate statistics for the email
      const distance = Math.round(recording?.stats?.totalDistance || 0);
      const formattedDistance = distance < 1000 
        ? `${distance} meters` 
        : `${(distance / 1000).toFixed(2)} km`;
      
      const uniqueRegions = recording?.stats?.uniqueRegionsVisited || 0;
      const startTime = new Date(recording?.startTime || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const endTime = new Date(recording?.endTime || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Compose email HTML - use template literal for better readability
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h1 style="color: #4a90e2; margin-bottom: 20px;">Your EONTA Journey</h1>
          
          <p>Thank you for experiencing <strong>${sanitizedTitle}</strong>!</p>
          
          <p>We've created a unique audio composition based on your journey through this sound installation. Below you'll find both your audio composition and a map of your path.</p>
          
          <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin: 25px 0;">
            <h2 style="font-size: 