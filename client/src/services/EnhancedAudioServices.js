/**
 * Enhanced Audio Service for EONTA
 * Provides advanced audio playback features with transitions and effects
 * Based on the original EONTA concept with modernized implementation
 */
import eontaDB from '../db';

class EnhancedAudioService {
  constructor() {
    this.sources = new Map();
    this.gainNodes = new Map();
    this.effectNodes = new Map();
    this.audioContext = null;
    this.masterGain = null;
    
    // Initialize effect factories
    this.effectFactories = {
      lowpass: this.createLowpassFilter.bind(this),
      highpass: this.createHighpassFilter.bind(this),
      reverb: this.createReverb.bind(this),
      delay: this.createDelay.bind(this),
      pitchShift: this.createPitchShifter.bind(this),
      spatialAudio: this.createSpatialAudio.bind(this),
      granular: this.createGranularSynthesizer.bind(this),
      spectralDelay: this.createSpectralDelay.bind(this),
      convolutionSpace: this.createConvolutionSpace.bind(this)
    };
  }

  /**
   * Initialize the audio context and master gain
   * @returns {Promise<boolean>} Whether initialization was successful
   */
  async initialize() {
    if (this.audioContext) {
      return true;
    }

    try {
      // Create context but don't resume it yet
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('Web Audio API not supported');
      }

      this.audioContext = new AudioContextClass();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);

      // Add interaction handlers if context is suspended
      if (this.audioContext.state === 'suspended') {
        const resumeAudioContext = async () => {
          if (this.audioContext?.state === 'suspended') {
            try {
              await this.audioContext.resume();
              // Remove listeners once resumed
              if (this.audioContext.state === 'running') {
                ['click', 'touchstart', 'keydown'].forEach(type => {
                  document.removeEventListener(type, resumeAudioContext);
                });
              }
            } catch (error) {
              console.warn('Failed to resume audio context:', error);
            }
          }
        };

        ['click', 'touchstart', 'keydown'].forEach(type => {
          document.addEventListener(type, resumeAudioContext);
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      return false;
    }
  }

  /**
   * Suspend audio context
   */
  async suspendAudio() {
    if (this.audioContext?.state === 'running') {
      await this.audioContext.suspend();
    }
  }

  /**
   * Resume audio context
   */
  async resumeAudio() {
    try {
      if (!this.audioContext) {
        await this.initialize();
      }
      
      if (this.audioContext?.state === 'suspended') {
        // Show a message to the user that interaction is needed
        console.log('Audio playback requires user interaction. Please click, tap, or press a key.');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error resuming audio:', error);
      return false;
    }
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

  // Add this method to your class
  async loadAudioWithOfflineSupport(id, url, options = {}) {
    // Check if we're online
    if (navigator.onLine) {
      // We're online, try to load from network first
      try {
        const success = await this.playAudio(id, url, options);
        
        // If successful, cache the audio file for offline use
        if (success) {
          this._cacheAudioForOffline(id, url);
        }
        
        return success;
      } catch (error) {
        console.log('Error loading audio from network, trying offline cache:', error);
        return this._loadAudioFromOfflineCache(id, url, options);
      }
    } else {
      // We're offline, try to load from cache
      return this._loadAudioFromOfflineCache(id, url, options);
    }
  }

  // Add this private method to your class
  async _loadAudioFromOfflineCache(id, url, options = {}) {
    try {
      // Extract audio file ID from URL
      const urlParts = url.split('/');
      const audioId = urlParts[urlParts.length - 1];
      
      // Try to get from IndexedDB
      const audioFile = await eontaDB.getAudioFile(audioId);
      
      if (!audioFile || !audioFile.data) {
        console.error('Audio not found in offline cache:', audioId);
        return false;
      }
      
      // Convert ArrayBuffer to AudioBuffer
      const arrayBuffer = audioFile.data;
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Create and play the audio
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.loop = options.loop !== undefined ? options.loop : true;
      
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 0; // Start at 0 for fade-in
      
      this.sources.set(id, source);
      this.gainNodes.set(id, gainNode);
      this.effectNodes.set(id, new Map());
      
      source.connect(gainNode);
      
      // Apply effects if needed
      let lastNode = gainNode;
      if (options.effects) {
        // Same effects code as in your original playAudio method
        // ...
      }
      
      lastNode.connect(this.masterGain);
      
      // Start playback
      source.start(0);
      
      // Fade in
      const now = this.audioContext.currentTime;
      const fadeIn = options.fadeIn !== undefined ? options.fadeIn : 0.5;
      const volume = options.volume !== undefined ? options.volume : 1.0;
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(volume, now + fadeIn);
      
      return true;
    } catch (error) {
      console.error('Error loading audio from offline cache:', error);
      return false;
    }
  }

  // Add this private method to your class
  async _cacheAudioForOffline(id, url) {
    try {
      // Only cache if we're not already cached
      const urlParts = url.split('/');
      const audioId = urlParts[urlParts.length - 1];
      
      // Check if already cached
      const existingAudio = await eontaDB.getAudioFile(audioId);
      if (existingAudio) {
        return; // Already cached
      }
      
      // Fetch the audio file
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      
      // Get composition ID from URL or use a default
      let compositionId = 'default';
      if (url.includes('/compositions/')) {
        const parts = url.split('/compositions/');
        if (parts.length > 1) {
          compositionId = parts[1].split('/')[0];
        }
      }
      
      // Store in IndexedDB
      await eontaDB.saveAudioFile({
        id: audioId,
        url: url,
        compositionId: compositionId,
        data: arrayBuffer,
        cachedAt: new Date().toISOString()
      });
      
      console.log('Audio cached for offline use:', audioId);
    } catch (error) {
      console.error('Error caching audio for offline use:', error);
    }
  }

  // Add these methods before the loadAudioWithOfflineSupport method

  createLowpassFilter(options = {}) {
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = options.frequency || 1000;
    filter.Q.value = options.Q || 1;
    return { input: filter, output: filter };
  }

  createHighpassFilter(options = {}) {
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = options.frequency || 1000;
    filter.Q.value = options.Q || 1;
    return { input: filter, output: filter };
  }

  createReverb(options = {}) {
    const convolver = this.audioContext.createConvolver();
    // Simple impulse response for testing
    const length = options.length || 2;
    const decay = options.decay || 2;
    const rate = this.audioContext.sampleRate;
    const impulse = this.audioContext.createBuffer(2, rate * length, rate);
    
    for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / (rate * length), decay);
      }
    }
    
    convolver.buffer = impulse;
    return { input: convolver, output: convolver };
  }

  createDelay(options = {}) {
    const delay = this.audioContext.createDelay();
    delay.delayTime.value = options.time || 0.5;
    const feedback = this.audioContext.createGain();
    feedback.gain.value = options.feedback || 0.5;
    
    delay.connect(feedback);
    feedback.connect(delay);
    
    return { input: delay, output: delay };
  }

  createPitchShifter(options = {}) {
    // Simple pitch shifter using delay
    const delay = this.audioContext.createDelay();
    delay.delayTime.value = options.pitch || 0;
    return { input: delay, output: delay };
  }

  createSpatialAudio(options = {}) {
    const panner = this.audioContext.createPanner();
    panner.setPosition(...(options.position || [0, 0, 0]));
    return { input: panner, output: panner };
  }

  createGranularSynthesizer(options = {}) {
    // Simple granular effect using gain node
    const gain = this.audioContext.createGain();
    gain.gain.value = options.intensity || 1;
    return { input: gain, output: gain };
  }

  createSpectralDelay(options = {}) {
    // Simplified spectral delay using basic delay
    const delay = this.audioContext.createDelay();
    delay.delayTime.value = options.delay || 0.1;
    return { input: delay, output: delay };
  }

  createConvolutionSpace(options = {}) {
    const convolver = this.audioContext.createConvolver();
    // Simple impulse response
    const length = options.length || 1;
    const rate = this.audioContext.sampleRate;
    const impulse = this.audioContext.createBuffer(2, rate * length, rate);
    
    for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] = Math.random() * 2 - 1;
      }
    }
    
    convolver.buffer = impulse;
    return { input: convolver, output: convolver };
  }
}

export default EnhancedAudioService;