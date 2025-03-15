/**
 * Enhanced Audio Service for EONTA
 * Provides advanced audio playback features with transitions and effects
 * Based on the original EONTA concept with modernized implementation
 */
class EnhancedAudioService {
  constructor() {
    try {
      // Create Web Audio API context as described in thesis section 3.5.0
      this.audioContext = this._createAudioContext();
      this.sources = new Map();
      this.gainNodes = new Map();
      this.effectNodes = new Map();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      
      // Initialize effect factories
      this.effectFactories = {
        lowpass: this.createLowpassFilter.bind(this),
        highpass: this.createHighpassFilter.bind(this),
        reverb: this.createReverb.bind(this),
        delay: this.createDelay.bind(this),
        pitchShift: this.createPitchShifter.bind(this),
        spatialAudio: this.createSpatialAudio.bind(this)
      };
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }
  
  /**
   * Create Audio Context with compatibility checks
   * @private
   * @returns {AudioContext} Web Audio API context
   */
  _createAudioContext() {
    // Check if Web Audio API is supported
    if (typeof window === 'undefined' || 
        (!window.AudioContext && !window.webkitAudioContext)) {
      console.error('Web Audio API is not supported in this browser');
      throw new Error('Web Audio API not supported');
    }
    
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContextClass();
    
    // Handle suspended state (autoplay policy)
    if (context.state === 'suspended') {
      const resumeOnInteraction = () => {
        if (context.state === 'suspended') {
          context.resume().catch(err => {
            console.error('Error resuming audio context:', err);
          });
        }
        
        // Remove listeners after successful resume
        if (context.state === 'running') {
          ['touchend', 'mouseup', 'keydown'].forEach(eventType => {
            document.removeEventListener(eventType, resumeOnInteraction);
          });
        }
      };
      
      ['touchend', 'mouseup', 'keydown'].forEach(eventType => {
        document.addEventListener(eventType, resumeOnInteraction);
      });
    }
    
    return context;
  }
  
  /**
   * Play audio with effects
   * Implements the audio playback described in thesis section 3.5.0
   * @param {String} id - Unique identifier for this audio
   * @param {String} url - URL to audio file
   * @param {Object} options - Playback options
   */
  async playAudio(id, url, options = {}) {
    // Ensure audioContext exists
    if (!this.audioContext) {
      console.error('Audio context not available');
      return false;
    }

    // Default options - matches thesis description
    const defaultOptions = {
      loop: true,  // Essential for continuous playback in boundaries
      volume: 1.0,
      fadeIn: 0.5,
      effects: {}
    };
    
    const settings = { ...defaultOptions, ...options };
    
    try {
      // Validate URL to prevent potential security issues
      const validatedUrl = new URL(url, window.location.origin).toString();
      
      // Fetch audio with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(validatedUrl, { 
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Resume audioContext if it's suspended (handles autoplay policy)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      // Create source - fundamental to the EONTA audio system
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.loop = settings.loop;
      
      // Create gain node for volume control
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 0; // Start at 0 for fade-in
      
      // Store references
      this.sources.set(id, source);
      this.gainNodes.set(id, gainNode);
      this.effectNodes.set(id, new Map());
      
      // Connect source to gain
      source.connect(gainNode);
      
      // Create and connect effect chain
      let lastNode = gainNode;
      
      if (settings.effects) {
        for (const [effectType, enabled] of Object.entries(settings.effects)) {
          if (enabled && this.effectFactories[effectType]) {
            const effectNode = this.effectFactories[effectType](settings.effects);
            
            lastNode.connect(effectNode.input);
            lastNode = effectNode.output;
            
            // Store effect nodes
            this.effectNodes.get(id).set(effectType, effectNode);
          }
        }
      }
      
      // Connect to master gain
      lastNode.connect(this.masterGain);
      
      // Start playback
      source.start(0);
      
      // Fade in - implements the smooth transitions described in thesis
      const now = this.audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(settings.volume, now + settings.fadeIn);
      
      return true;
    } catch (error) {
      console.error(`Error playing audio ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Stop audio with fade out
   * @param {String} id - Audio identifier
   * @param {Number} fadeOut - Fade out duration in seconds
   */
  stopAudio(id, fadeOut = 0.5) {
    if (!this.audioContext) return false;
    
    const source = this.sources.get(id);
    const gainNode = this.gainNodes.get(id);
    
    if (!source || !gainNode) return false;
    
    try {
      const now = this.audioContext.currentTime;
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);
      gainNode.gain.linearRampToValueAtTime(0, now + fadeOut);
      
      // Schedule cleanup after fade
      setTimeout(() => {
        try {
          source.stop();
        } catch (e) {
          // Ignore errors if already stopped
        }
        
        this.sources.delete(id);
        this.gainNodes.delete(id);
        
        // Clean up effect nodes
        const effects = this.effectNodes.get(id);
        if (effects) {
          this.effectNodes.delete(id);
        }
      }, fadeOut * 1000);
      
      return true;
    } catch (error) {
      console.error(`Error stopping audio ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Set volume for an audio source
   * @param {String} id - Audio identifier
   * @param {Number} volume - Volume level (0-1)
   */
  setVolume(id, volume) {
    if (!this.audioContext) return false;
    
    const gainNode = this.gainNodes.get(id);
    if (!gainNode) return false;
    
    try {
      // Validate volume is in range 0-1
      const safeVolume = Math.max(0, Math.min(1, volume));
      
      const now = this.audioContext.currentTime;
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);
      gainNode.gain.linearRampToValueAtTime(safeVolume, now + 0.05);
      
      return true;
    } catch (error) {
      console.error(`Error setting volume for ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Fade out audio
   * @param {String} id - Audio identifier
   * @param {Number} duration - Fade duration in seconds
   */
  fadeOutAudio(id, duration = 1.0) {
    if (!this.audioContext) return false;
    
    const gainNode = this.gainNodes.get(id);
    if (!gainNode) return false;
    
    try {
      const now = this.audioContext.currentTime;
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);
      gainNode.gain.linearRampToValueAtTime(0, now + duration);
      
      // Schedule cleanup after fade
      setTimeout(() => {
        if (this.sources.has(id)) {
          this.stopAudio(id, 0);
        }
      }, duration * 1000);
      
      return true;
    } catch (error) {
      console.error(`Error fading out audio ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Apply an effect to an active audio source
   * Implements the audio effects system described in thesis
   * @param {String} id - Audio identifier
   * @param {String} effectType - Type of effect
   * @param {Object} parameters - Effect parameters
   */
  applyEffect(id, effectType, parameters) {
    if (!this.audioContext) return false;
    
    const effectsMap = this.effectNodes.get(id);
    if (!effectsMap) return false;
    
    const effectNode = effectsMap.get(effectType);
    if (!effectNode) return false;
    
    try {
      // Apply parameters to effect node
      switch (effectType) {
        case 'lowpass':
          if (parameters.frequency) {
            effectNode.filter.frequency.setValueAtTime(
              Math.max(20, Math.min(20000, parameters.frequency)),
              this.audioContext.currentTime
            );
          }
          if (parameters.Q) {
            effectNode.filter.Q.setValueAtTime(
              Math.max(0.0001, Math.min(1000, parameters.Q)),
              this.audioContext.currentTime
            );
          }
          break;
          
        // Other effect parameter applications here...
        // Implementation follows similar pattern
          
        default:
          console.warn(`Unknown effect type: ${effectType}`);
          return false;
      }
      
      return true;
    } catch (error) {
      console.error(`Error applying effect ${effectType} to ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Get all currently active audio sources
   * Essential for the audio overlap functionality described in thesis
   * @returns {Array} Array of active audio information
   */
  getActiveAudio() {
    const activeAudio = [];
    
    try {
      this.sources.forEach((source, id) => {
        const gainNode = this.gainNodes.get(id);
        const currentVolume = gainNode ? gainNode.gain.value : 0;
        
        activeAudio.push({
          id,
          volume: currentVolume,
          effects: Array.from(this.effectNodes.get(id) || []).map(([type]) => type)
        });
      });
    } catch (error) {
      console.error('Error getting active audio:', error);
    }
    
    return activeAudio;
  }
  
  /**
   * Set master volume
   * @param {Number} volume - Master volume level (0-1)
   */
  setMasterVolume(volume) {
    if (!this.audioContext) return false;
    
    try {
      // Validate volume
      const safeVolume = Math.max(0, Math.min(1, volume));
      this.masterGain.gain.setValueAtTime(safeVolume, this.audioContext.currentTime);
      return true;
    } catch (error) {
      console.error('Error setting master volume:', error);
      return false;
    }
  }
  
  /**
   * Utility method to suspend/resume audio context
   * Essential for mobile browser compatibility
   */
  async suspendAudio() {
    if (this.audioContext && this.audioContext.state === 'running') {
      try {
        await this.audioContext.suspend();
        return true;
      } catch (error) {
        console.error('Error suspending audio context:', error);
        return false;
      }
    }
    return false;
  }
  
  async resumeAudio() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        return true;
      } catch (error) {
        console.error('Error resuming audio context:', error);
        return false;
      }
    }
    return false;
  }
  
  /**
   * Clean up resources
   * Essential for preventing memory leaks
   */
  dispose() {
    try {
      // Stop all sounds
      for (const id of this.sources.keys()) {
        this.stopAudio(id, 0);
      }
      
      // Close audio context
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close().catch(err => console.error('Error closing audio context:', err));
      }
      
      // Clear collections
      this.sources.clear();
      this.gainNodes.clear();
      this.effectNodes.clear();
    } catch (error) {
      console.error('Error disposing audio service:', error);
    }
  }
  
  // Effect factory methods here...
  // Implementation follows similar pattern to the original code
}

export default EnhancedAudioService;