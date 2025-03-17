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
        spatialAudio: this.createSpatialAudio.bind(this),
        granular: this.createGranularSynthesizer.bind(this),
        spectralDelay: this.createSpectralDelay.bind(this),
        convolutionSpace: this.createConvolutionSpace.bind(this)
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

// Add to EnhancedAudioService.js

import eontaDB from '../db';

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

/**
 * Creates a granular synthesis effect
 * @param {Object} options - Granular synthesis parameters
 * @returns {Object} Effect node with input and output connections
 */
createGranularSynthesizer(options = {}) {
  if (!this.audioContext) return null;
  
  try {
    // Set default parameters
    const grainSize = options.grainSize || 0.1; // seconds
    const density = options.density || 0.8; // 0-1
    const pitch = options.pitch || 1.0; // playback rate
    const randomization = options.randomization || 0.1; // 0-1
    
    // Create nodes
    const input = this.audioContext.createGain();
    const output = this.audioContext.createGain();
    const dryGain = this.audioContext.createGain();
    const wetGain = this.audioContext.createGain();
    
    // Set up direct path with dry/wet mixing
    input.connect(dryGain);
    dryGain.connect(output);
    dryGain.gain.value = 1 - density;
    
    wetGain.connect(output);
    wetGain.gain.value = density;
    
    // Buffer for granular processing
    let grainBuffer = null;
    let grainSourceNodes = [];
    let grainAnalyser = this.audioContext.createAnalyser();
    grainAnalyser.fftSize = 2048;
    let analyserBuffer = new Float32Array(grainAnalyser.fftSize);
    
    // Create processor for capturing input
    const bufferSize = 4096;
    let inputProcessor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
    input.connect(inputProcessor);
    inputProcessor.connect(grainAnalyser);
    
    // Get input data for granular processing
    inputProcessor.onaudioprocess = (e) => {
      grainAnalyser.getFloatTimeDomainData(analyserBuffer);
      
      // Store current buffer for grain creation
      grainBuffer = analyserBuffer.slice(0);
      
      // Pass through unmodified (we'll add grains separately)
      const inputData = e.inputBuffer.getChannelData(0);
      const outputData = e.outputBuffer.getChannelData(0);
      
      for (let i = 0; i < inputData.length; i++) {
        outputData[i] = inputData[i];
      }
    };
    
    // Grain creation interval
    const grainInterval = Math.max(10, Math.min(500, (1 - density) * 500)); // 10-500ms
    let grainTimer = null;
    
    // Function to create a grain
    const createGrain = () => {
      if (!grainBuffer) return;
      
      // Create buffer source for this grain
      const grainSource = this.audioContext.createBufferSource();
      const grainGain = this.audioContext.createGain();
      
      // Create a small buffer for this grain
      const grainDuration = grainSize;
      const sampleRate = this.audioContext.sampleRate;
      const numSamples = Math.floor(grainDuration * sampleRate);
      
      // Create buffer and fill with sample data
      const buffer = this.audioContext.createBuffer(1, numSamples, sampleRate);
      const channelData = buffer.getChannelData(0);
      
      // Get random starting position in our captured buffer
      const startOffset = Math.floor(Math.random() * (grainBuffer.length - numSamples));
      
      // Copy data from our analysis buffer to the grain
      for (let i = 0; i < numSamples; i++) {
        if (i + startOffset < grainBuffer.length) {
          channelData[i] = grainBuffer[i + startOffset];
        } else {
          channelData[i] = 0; // Silence if we run out of buffer
        }
      }
      
      // Apply envelope to avoid clicks (simple raised cosine)
      for (let i = 0; i < numSamples; i++) {
        const position = i / numSamples; // 0 to 1
        const envelope = 0.5 * (1 - Math.cos(2 * Math.PI * position));
        channelData[i] *= envelope;
      }
      
      // Set up the grain source
      grainSource.buffer = buffer;
      grainSource.playbackRate.value = pitch * (1 + (Math.random() * 2 - 1) * randomization);
      
      // Connect and play
      grainSource.connect(grainGain);
      grainGain.connect(wetGain);
      
      // Random panning
      if (options.randomPan) {
        const panner = this.audioContext.createStereoPanner();
        const panValue = (Math.random() * 2 - 1) * options.randomPan;
        panner.pan.value = panValue;
        
        grainSource.connect(panner);
        panner.connect(grainGain);
      }
      
      // Random gain
      grainGain.gain.value = 0.7 + Math.random() * 0.3;
      
      // Keep track of this grain
      grainSourceNodes.push(grainSource);
      
      // Start the grain
      grainSource.start();
      
      // Schedule cleanup
      grainSource.onended = () => {
        grainGain.disconnect();
        grainSource.disconnect();
        
        // Remove from active grains
        const index = grainSourceNodes.indexOf(grainSource);
        if (index !== -1) {
          grainSourceNodes.splice(index, 1);
        }
      };
      
      // Stop the grain after its duration
      grainSource.stop(this.audioContext.currentTime + grainDuration);
    };
    
    // Start grain generation
    const startGrains = () => {
      if (grainTimer) clearInterval(grainTimer);
      grainTimer = setInterval(createGrain, grainInterval);
    };
    
    // Stop grain generation
    const stopGrains = () => {
      if (grainTimer) {
        clearInterval(grainTimer);
        grainTimer = null;
      }
      
      // Stop and disconnect all active grains
      grainSourceNodes.forEach(source => {
        try {
          source.stop();
          source.disconnect();
        } catch (e) {
          // Ignore errors if already stopped
        }
      });
      
      grainSourceNodes = [];
    };
    
    // Start the grain generation
    startGrains();
    
    // Return the effect object with controls
    return {
      input,
      output,
      setDensity(value) {
        const safeValue = Math.max(0, Math.min(1, value));
        wetGain.gain.value = safeValue;
        dryGain.gain.value = 1 - safeValue;
        
        // Update grain interval based on density
        const newInterval = Math.max(10, Math.min(500, (1 - safeValue) * 500));
        if (grainTimer) {
          clearInterval(grainTimer);
          grainTimer = setInterval(createGrain, newInterval);
        }
      },
      setPitch(value) {
        pitch = Math.max(0.1, Math.min(4, value));
      },
      setGrainSize(value) {
        grainSize = Math.max(0.01, Math.min(1, value));
      },
      setRandomization(value) {
        randomization = Math.max(0, Math.min(1, value));
      },
      start: startGrains,
      stop: stopGrains,
      dispose() {
        stopGrains();
        if (inputProcessor) {
          inputProcessor.disconnect();
        }
        input.disconnect();
        output.disconnect();
        dryGain.disconnect();
        wetGain.disconnect();
      }
    };
  } catch (error) {
    console.error('Error creating granular synthesizer:', error);
    return null;
  }
}

/**
 * Creates a spectral delay effect
 * @param {Object} options - Spectral delay parameters
 * @returns {Object} Effect node with input and output connections
 */
createSpectralDelay(options = {}) {
  if (!this.audioContext) return null;
  
  try {
    // Default parameters
    const delayTime = options.delayTime || 0.5; // seconds
    const feedback = Math.min(0.95, options.feedback || 0.3); // 0-0.95
    const bins = options.bins || 32; // Number of frequency bins
    
    // Create nodes
    const input = this.audioContext.createGain();
    const output = this.audioContext.createGain();
    const dryGain = this.audioContext.createGain();
    const wetGain = this.audioContext.createGain();
    
    // Set up parallel dry path
    input.connect(dryGain);
    dryGain.connect(output);
    dryGain.gain.value = 1 - (options.mix || 0.5);
    
    // Set up wet path with spectral processing
    wetGain.connect(output);
    wetGain.gain.value = options.mix || 0.5;
    
    // Create FFT analyser
    const analyser = this.audioContext.createAnalyser();
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    
    // Create the processor nodes
    const inputProcessor = this.audioContext.createScriptProcessor(2048, 1, 1);
    const delayProcessor = this.audioContext.createScriptProcessor(2048, 1, 1);
    
    // Connect the nodes
    input.connect(analyser);
    analyser.connect(inputProcessor);
    inputProcessor.connect(delayProcessor);
    delayProcessor.connect(wetGain);
    
    // Create delay buffers for each frequency bin
    const delayBuffers = [];
    const delayWritePointers = [];
    const delayReadPointers = [];
    
    // Initialize delay buffers
    for (let i = 0; i < bins; i++) {
      const bufferSize = Math.floor(this.audioContext.sampleRate * delayTime);
      delayBuffers[i] = new Float32Array(bufferSize);
      delayWritePointers[i] = 0;
      delayReadPointers[i] = 0;
    }
    
    // Processor to capture input spectrum
    inputProcessor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const outputData = e.outputBuffer.getChannelData(0);
      
      // Get frequency data
      analyser.getFloatFrequencyData(dataArray);
      
      // Bin the spectrum
      const binSize = Math.floor(bufferLength / bins);
      
      // Write to delay buffers
      for (let i = 0; i < bins; i++) {
        const startBin = i * binSize;
        const endBin = (i + 1) * binSize;
        
        // Calculate magnitude from this frequency range
        let binValue = 0;
        for (let j = startBin; j < endBin; j++) {
          binValue += dataArray[j];
        }
        binValue /= binSize;
        
        // Write to delay buffer
        delayBuffers[i][delayWritePointers[i]] = binValue;
        delayWritePointers[i] = (delayWritePointers[i] + 1) % delayBuffers[i].length;
      }
      
      // Simple passthrough for now
      for (let i = 0; i < inputData.length; i++) {
        outputData[i] = inputData[i];
      }
    };
    
    // Processor to apply spectral delay
    delayProcessor.onaudioprocess = (e) => {
      const outputData = e.outputBuffer.getChannelData(0);
      
      // Read from delay buffers and apply feedback
      for (let i = 0; i < bins; i++) {
        // Get delayed value for this bin
        const delayedValue = delayBuffers[i][delayReadPointers[i]];
        
        // Apply feedback
        delayBuffers[i][delayWritePointers[i]] = delayedValue * feedback;
        
        // Update read pointer
        delayReadPointers[i] = (delayReadPointers[i] + 1) % delayBuffers[i].length;
      }
      
      // Output delayed signal
      for (let i = 0; i < outputData.length; i++) {
        outputData[i] = 0;
        for (let j = 0; j < bins; j++) {
          outputData[i] += delayBuffers[j][delayReadPointers[j]];
        }
        outputData[i] /= bins; // Average across bins
      }
    };
    
    return {
      input,
      output,
      setDelayTime(value) {
        // Cannot change delay time without recreating buffers
        console.warn('Changing delay time not supported in real-time');
      },
      setFeedback(value) {
        const safeValue = Math.max(0, Math.min(0.95, value));
        feedback = safeValue;
      },
      setMix(value) {
        const safeValue = Math.max(0, Math.min(1, value));
        wetGain.gain.value = safeValue;
        dryGain.gain.value = 1 - safeValue;
      },
      dispose() {
        input.disconnect();
        output.disconnect();
        dryGain.disconnect();
        wetGain.disconnect();
        analyser.disconnect();
        inputProcessor.disconnect();
        delayProcessor.disconnect();
      }
    };
  } catch (error) {
    console.error('Error creating spectral delay:', error);
    return null;
  }
}

/**
 * Creates a convolution-based space simulator
 * @param {Object} options - Convolution parameters
 * @returns {Object} Effect node with input and output connections
 */
async createConvolutionSpace(options = {}) {
  if (!this.audioContext) return null;
  
  try {
    // Default parameters
    const spaceType = options.spaceType || 'hall'; // hall, room, cave, etc.
    const mix = options.mix !== undefined ? options.mix : 0.3;
    
    // Create nodes
    const input = this.audioContext.createGain();
    const output = this.audioContext.createGain();
    const dryGain = this.audioContext.createGain();
    const wetGain = this.audioContext.createGain();
    const convolver = this.audioContext.createConvolver();
    
    // Set up parallel paths
    input.connect(dryGain);
    dryGain.connect(output);
    dryGain.gain.value = 1 - mix;
    
    input.connect(convolver);
    convolver.connect(wetGain);
    wetGain.connect(output);
    wetGain.gain.value = mix;
    
    // Generate impulse response based on space type
    const impulseResponse = await this._generateSpaceImpulse(spaceType, options);
    convolver.buffer = impulseResponse;
    
    return {
      input,
      output,
      convolver,
      setMix(value) {
        const safeValue = Math.max(0, Math.min(1, value));
        wetGain.gain.value = safeValue;
        dryGain.gain.value = 1 - safeValue;
      },
      async changeSpaceType(type, spaceOptions = {}) {
        try {
          const newImpulse = await this._generateSpaceImpulse(type, spaceOptions);
          convolver.buffer = newImpulse;
          return true;
        } catch (error) {
          console.error('Error changing space type:', error);
          return false;
        }
      },
      dispose() {
        input.disconnect();
        output.disconnect();
        dryGain.disconnect();
        wetGain.disconnect();
        convolver.disconnect();
      }
    };
  } catch (error) {
    console.error('Error creating convolution space:', error);
    return null;
  }
}

/**
 * Generates an impulse response for different space types
 * @private
 * @param {String} spaceType - Type of space (hall, room, cave, etc.)
 * @param {Object} options - Additional options for the impulse response
 * @returns {AudioBuffer} Impulse response buffer
 */
async _generateSpaceImpulse(spaceType, options = {}) {
  if (!this.audioContext) {
    throw new Error('Audio context not available');
  }
  
  const sampleRate = this.audioContext.sampleRate;
  let duration, decay, density, modulation;
  
  // Set parameters based on space type
  switch (spaceType.toLowerCase()) {
    case 'hall':
      duration = options.duration || 3.0;
      decay = options.decay || 2.0;
      density = options.density || 0.8;
      modulation = options.modulation || 0.2;
      break;
    case 'room':
      duration = options.duration || 1.0;
      decay = options.decay || 0.5;
      density = options.density || 0.7;
      modulation = options.modulation || 0.1;
      break;
    case 'cave':
      duration = options.duration || 4.0;
      decay = options.decay || 3.0;
      density = options.density || 0.9;
      modulation = options.modulation || 0.3;
      break;
    case 'plate':
      duration = options.duration || 2.0;
      decay = options.decay || 1.5;
      density = options.density || 0.6;
      modulation = options.modulation || 0.05;
      break;
    default:
      duration = options.duration || 2.0;
      decay = options.decay || 1.0;
      density = options.density || 0.7;
      modulation = options.modulation || 0.1;
  }
  
  // Safety limits
  duration = Math.max(0.1, Math.min(5, duration));
  decay = Math.max(0.1, Math.min(5, decay));
  density = Math.max(0.1, Math.min(1, density));
  modulation = Math.max(0, Math.min(1, modulation));
  
  // Create impulse response buffer
  const length = Math.floor(sampleRate * duration);
  const impulse = this.audioContext.createBuffer(2, length, sampleRate);
  
  // Get channel data
  const leftChannel = impulse.getChannelData(0);
  const rightChannel = impulse.getChannelData(1);
  
  // Generate impulse response based on space type
  for (let i = 0; i < length; i++) {
    const time = i / sampleRate;
    
    // Basic exponential decay
    const decayFactor = Math.exp(-time / decay);
    
    // Increase density with noise bursts
    const densityFactor = Math.random() < density ? 1 : 0.7;
    
    // Modulation effect - slight variation between channels
    const modulationFactor = 1 + (Math.random() * 2 - 1) * modulation;
    
    // Early reflections (more pronounced in rooms)
    const earlyReflections = spaceType === 'room' ? 
      (i < 0.05 * sampleRate ? 0.8 : 0.2) : 0.3;
    
    // Cave-specific long tail with resonance
    const resonance = spaceType === 'cave' ? 
      Math.sin(i / sampleRate * 2) * 0.2 * decayFactor : 0;
    
    // Calculate final value
    const baseValue = (Math.random() * 2 - 1) * decayFactor * densityFactor * earlyReflections;
    
    // Apply a smoothing filter to reduce harshness
    const smoothingFactor = 0.2;
    if (i > 0) {
      leftChannel[i] = baseValue * modulationFactor + resonance + 
                      (leftChannel[i-1] * smoothingFactor);
      rightChannel[i] = baseValue / modulationFactor + resonance + 
                      (rightChannel[i-1] * smoothingFactor);
    } else {
      leftChannel[i] = baseValue * modulationFactor + resonance;
      rightChannel[i] = baseValue / modulationFactor + resonance;
    }
  }
  
  // Normalize to prevent clipping
  let maxValue = 0;
  for (let i = 0; i < length; i++) {
    maxValue = Math.max(maxValue, Math.abs(leftChannel[i]), Math.abs(rightChannel[i]));
  }
  
  if (maxValue > 0) {
    const normalize = 0.98 / maxValue;
    for (let i = 0; i < length; i++) {
      leftChannel[i] *= normalize;
      rightChannel[i] *= normalize;
    }
  }
  
  return impulse;
}