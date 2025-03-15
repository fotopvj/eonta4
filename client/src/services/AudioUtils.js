/**
 * Audio Utility Functions for EONTA
 * Contains helper functions for audio processing, effects, and conversions
 */

// Constants
const MIN_FREQUENCY = 20; // Minimum audible frequency
const MAX_FREQUENCY = 20000; // Maximum audible frequency
const MAX_BUFFER_SIZE = 10 * 1024 * 1024; // 10MB maximum audio buffer size
const DEFAULT_SAMPLE_RATE = 44100; // Default sample rate if not specified

/**
 * Create a Web Audio API context with error handling
 * @returns {AudioContext|null} Audio context or null if unavailable
 */
export function createAudioContext() {
  try {
    // Check if Web Audio API is supported
    if (typeof window === 'undefined' || 
        (!window.AudioContext && !window.webkitAudioContext)) {
      console.error('Web Audio API is not supported in this browser');
      return null;
    }
    
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContextClass({
      latencyHint: 'interactive', // Optimize for interactive applications
      sampleRate: DEFAULT_SAMPLE_RATE
    });
    
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
  } catch (error) {
    console.error('Error creating audio context:', error);
    return null;
  }
}

/**
 * Load an audio file from URL with security checks
 * @param {AudioContext} audioContext - Web Audio API context
 * @param {String} url - URL to audio file
 * @param {Object} options - Additional options including timeout
 * @returns {Promise<AudioBuffer>} Decoded audio buffer
 */
export async function loadAudioFile(audioContext, url, options = {}) {
  // Parameter validation
  if (!audioContext) {
    throw new Error('Invalid audio context');
  }
  
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL provided');
  }
  
  const timeout = options.timeout || 30000; // 30 seconds default timeout
  
  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // Fetch with signal
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: options.headers || {}
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to load audio: ${response.status} ${response.statusText}`);
    }
    
    // Check content size
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_BUFFER_SIZE) {
      throw new Error('Audio file too large');
    }
    
    const arrayBuffer = await response.arrayBuffer();
    
    // Double check buffer size
    if (arrayBuffer.byteLength > MAX_BUFFER_SIZE) {
      throw new Error('Audio buffer exceeds maximum size');
    }
    
    // Resume context if suspended (for mobile browsers)
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    return await audioContext.decodeAudioData(arrayBuffer);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Audio loading timed out');
    }
    console.error('Error loading audio file:', error);
    throw error;
  }
}

/**
 * Create a gain node for volume control
 * @param {AudioContext} audioContext - Web Audio API context
 * @param {Number} initialVolume - Initial volume value (0-1)
 * @returns {GainNode} Configured gain node
 */
export function createGainNode(audioContext, initialVolume = 1.0) {
  if (!audioContext) {
    console.error('Invalid audio context provided');
    return null;
  }
  
  try {
    const gainNode = audioContext.createGain();
    
    // Ensure volume is within valid range
    const safeVolume = Math.max(0, Math.min(1, initialVolume));
    gainNode.gain.value = safeVolume;
    
    return gainNode;
  } catch (error) {
    console.error('Error creating gain node:', error);
    return null;
  }
}

/**
 * Validate frequency value to ensure it's within audible range
 * @param {Number} frequency - Frequency value to validate
 * @returns {Number} Validated frequency value
 */
export function validateFrequency(frequency) {
  if (typeof frequency !== 'number' || isNaN(frequency)) {
    return 1000; // Default to 1kHz
  }
  
  return Math.max(MIN_FREQUENCY, Math.min(MAX_FREQUENCY, frequency));
}

/**
 * Create a lowpass filter
 * @param {AudioContext} audioContext - Web Audio API context
 * @param {Number} frequency - Cutoff frequency in Hz
 * @param {Number} Q - Q factor
 * @returns {BiquadFilterNode} Configured filter node
 */
export function createLowpassFilter(audioContext, frequency = 20000, Q = 1.0) {
  if (!audioContext) {
    console.error('Invalid audio context provided');
    return null;
  }
  
  try {
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = validateFrequency(frequency);
    filter.Q.value = Math.max(0.0001, Math.min(1000, Q || 1.0));
    return filter;
  } catch (error) {
    console.error('Error creating lowpass filter:', error);
    return null;
  }
}

/**
 * Create a highpass filter
 * @param {AudioContext} audioContext - Web Audio API context
 * @param {Number} frequency - Cutoff frequency in Hz
 * @param {Number} Q - Q factor
 * @returns {BiquadFilterNode} Configured filter node
 */
export function createHighpassFilter(audioContext, frequency = 20, Q = 1.0) {
  if (!audioContext) {
    console.error('Invalid audio context provided');
    return null;
  }
  
  try {
    const filter = audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = validateFrequency(frequency);
    filter.Q.value = Math.max(0.0001, Math.min(1000, Q || 1.0));
    return filter;
  } catch (error) {
    console.error('Error creating highpass filter:', error);
    return null;
  }
}

/**
 * Validate delay time to ensure it's within reasonable range
 * @param {Number} delayTime - Delay time in seconds
 * @returns {Number} Validated delay time
 */
export function validateDelayTime(delayTime) {
  if (typeof delayTime !== 'number' || isNaN(delayTime)) {
    return 0.3; // Default to 300ms
  }
  
  // Limit delay to between 0.01s and 5s
  return Math.max(0.01, Math.min(5, delayTime));
}

/**
 * Create a simple delay effect
 * @param {AudioContext} audioContext - Web Audio API context
 * @param {Number} delayTime - Delay time in seconds
 * @param {Number} feedback - Feedback amount (0-1)
 * @returns {Object} Object containing input, output, and control nodes
 */
export function createDelay(audioContext, delayTime = 0.3, feedback = 0.3) {
  if (!audioContext) {
    console.error('Invalid audio context provided');
    return null;
  }
  
  try {
    const input = audioContext.createGain();
    const output = audioContext.createGain();
    const delay = audioContext.createDelay(5.0); // Maximum 5 seconds delay
    const feedbackGain = audioContext.createGain();
    
    // Ensure parameters are within safe ranges
    delay.delayTime.value = validateDelayTime(delayTime);
    feedbackGain.gain.value = Math.max(0, Math.min(0.95, feedback)); // Limit feedback to avoid infinite loops
    
    input.connect(output); // Direct signal
    input.connect(delay);
    delay.connect(feedbackGain);
    feedbackGain.connect(delay); // Feedback loop
    delay.connect(output);
    
    return {
      input,
      output,
      delay,
      feedback: feedbackGain
    };
  } catch (error) {
    console.error('Error creating delay effect:', error);
    return null;
  }
}

/**
 * Generate a reverb impulse response
 * @param {AudioContext} audioContext - Web Audio API context
 * @param {Number} duration - Duration in seconds
 * @param {Number} decay - Decay rate
 * @returns {AudioBuffer} Impulse response buffer
 */
export function generateReverbImpulse(audioContext, duration = 2.0, decay = 2.0) {
  if (!audioContext) {
    console.error('Invalid audio context provided');
    return null;
  }
  
  try {
    // Ensure parameters are within safe ranges
    const safeDuration = Math.max(0.1, Math.min(5, duration)); // 0.1s to 5s
    const safeDecay = Math.max(0.1, Math.min(10, decay)); // 0.1 to 10
    
    const sampleRate = audioContext.sampleRate;
    const length = Math.floor(sampleRate * safeDuration);
    const impulse = audioContext.createBuffer(2, length, sampleRate);
    
    const leftChannel = impulse.getChannelData(0);
    const rightChannel = impulse.getChannelData(1);
    
    // Fill with white noise with exponential decay
    for (let i = 0; i < length; i++) {
      const amplitude = Math.random() * 2 - 1;
      const decayFactor = Math.exp(-i / (sampleRate * safeDecay / 6));
      
      leftChannel[i] = amplitude * decayFactor;
      rightChannel[i] = amplitude * decayFactor;
    }
    
    return impulse;
  } catch (error) {
    console.error('Error generating reverb impulse:', error);
    return null;
  }
}

/**
 * Create a reverb effect
 * @param {AudioContext} audioContext - Web Audio API context
 * @param {Number} mix - Dry/wet mix (0-1)
 * @param {Number} decayTime - Reverb decay time in seconds
 * @returns {Promise<Object>} Object containing input, output, and control nodes
 */
export async function createReverb(audioContext, mix = 0.3, decayTime = 2.0) {
  if (!audioContext) {
    console.error('Invalid audio context provided');
    return null;
  }
  
  try {
    const input = audioContext.createGain();
    const output = audioContext.createGain();
    const wetGain = audioContext.createGain();
    const dryGain = audioContext.createGain();
    
    // Simple convolver-based reverb
    const convolver = audioContext.createConvolver();
    
    // Ensure parameters are within safe ranges
    const safeMix = Math.max(0, Math.min(1, mix));
    const safeDecayTime = Math.max(0.1, Math.min(5, decayTime));
    
    // Set mix levels
    wetGain.gain.value = safeMix;
    dryGain.gain.value = 1 - safeMix;
    
    // Connect topology
    input.connect(dryGain);
    input.connect(convolver);
    convolver.connect(wetGain);
    dryGain.connect(output);
    wetGain.connect(output);
    
    // Generate impulse response
    const impulseBuffer = await generateReverbImpulse(audioContext, safeDecayTime);
    if (impulseBuffer) {
      convolver.buffer = impulseBuffer;
    }
    
    return {
      input,
      output,
      wetGain,
      dryGain,
      convolver,
      // Add methods for changing parameters
      setMix: (newMix) => {
        const safeNewMix = Math.max(0, Math.min(1, newMix));
        wetGain.gain.value = safeNewMix;
        dryGain.gain.value = 1 - safeNewMix;
      },
      setDecay: async (newDecay) => {
        const newImpulse = await generateReverbImpulse(audioContext, Math.max(0.1, Math.min(5, newDecay)));
        if (newImpulse) {
          convolver.buffer = newImpulse;
        }
      }
    };
  } catch (error) {
    console.error('Error creating reverb effect:', error);
    return null;
  }
}

/**
 * Linear fade between two values over time
 * @param {AudioParam} param - Audio parameter to fade
 * @param {Number} startValue - Starting value
 * @param {Number} endValue - Ending value
 * @param {Number} duration - Duration in seconds
 * @param {AudioContext} audioContext - Web Audio API context
 */
export function linearFade(param, startValue, endValue, duration, audioContext) {
  if (!param || !audioContext) {
    console.error('Invalid parameters for linearFade');
    return;
  }
  
  try {
    const now = audioContext.currentTime;
    const safeDuration = Math.max(0.01, Math.min(60, duration)); // 10ms to 60s
    
    param.setValueAtTime(startValue, now);
    param.linearRampToValueAtTime(endValue, now + safeDuration);
  } catch (error) {
    console.error('Error performing linear fade:', error);
  }
}

/**
 * Exponential fade between two values over time
 * @param {AudioParam} param - Audio parameter to fade
 * @param {Number} startValue - Starting value
 * @param {Number} endValue - Ending value
 * @param {Number} duration - Duration in seconds
 * @param {AudioContext} audioContext - Web Audio API context
 */
export function exponentialFade(param, startValue, endValue, duration, audioContext) {
  if (!param || !audioContext) {
    console.error('Invalid parameters for exponentialFade');
    return;
  }
  
  try {
    const now = audioContext.currentTime;
    const safeDuration = Math.max(0.01, Math.min(60, duration)); // 10ms to 60s
    
    // Avoid zero values for exponential fades
    const safeStart = Math.max(0.0001, startValue);
    const safeEnd = Math.max(0.0001, endValue);
    
    param.setValueAtTime(safeStart, now);
    param.exponentialRampToValueAtTime(safeEnd, now + safeDuration);
  } catch (error) {
    console.error('Error performing exponential fade:', error);
    
    // Fallback to linear fade if exponential fails
    try {
      linearFade(param, startValue, endValue, duration, audioContext);
    } catch (fallbackError) {
      console.error('Fallback linear fade also failed:', fallbackError);
    }
  }
}

/**
 * Connect audio nodes in sequence
 * @param {...AudioNode} nodes - Audio nodes to connect in sequence
 * @returns {Boolean} - Success status
 */
export function connectNodes(...nodes) {
  if (!nodes || nodes.length < 2) {
    console.error('At least two nodes are required for connection');
    return false;
  }
  
  try {
    for (let i = 0; i < nodes.length - 1; i++) {
      if (!nodes[i] || !nodes[i+1]) {
        console.error(`Invalid node at position ${i} or ${i+1}`);
        return false;
      }
      nodes[i].connect(nodes[i + 1]);
    }
    return true;
  } catch (error) {
    console.error('Error connecting audio nodes:', error);
    return false;
  }
}

/**
 * Create a spatial audio panner
 * @param {AudioContext} audioContext - Web Audio API context
 * @param {Number} pan - Initial pan value (-1 to 1)
 * @returns {StereoPannerNode} Configured panner node
 */
export function createStereoPanner(audioContext, pan = 0) {
  if (!audioContext) {
    console.error('Invalid audio context provided');
    return null;
  }
  
  try {
    const panner = audioContext.createStereoPanner();
    
    // Ensure pan value is within valid range
    const safePan = Math.max(-1, Math.min(1, pan));
    panner.pan.value = safePan;
    
    return panner;
  } catch (error) {
    console.error('Error creating stereo panner:', error);
    
    // Fallback for browsers that don't support StereoPannerNode
    try {
      const fallbackPanner = audioContext.createPanner();
      fallbackPanner.panningModel = 'equalpower';
      
      // Convert pan value (-1 to 1) to position
      const x = pan;
      fallbackPanner.setPosition(x, 0, 1 - Math.abs(x));
      
      return fallbackPanner;
    } catch (fallbackError) {
      console.error('Fallback panner creation also failed:', fallbackError);
      return null;
    }
  }
}

/**
 * Convert seconds to time format (MM:SS)
 * @param {Number} seconds - Time in seconds
 * @returns {String} Formatted time string
 */
export function formatTime(seconds) {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
    return '00:00';
  }
  
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Check if the browser supports specific Web Audio API features
 * @returns {Object} Object with feature support flags
 */
export function checkAudioSupport() {
  const support = {
    webAudio: false,
    audioContext: false,
    analyser: false,
    gainNode: false,
    biquadFilter: false,
    convolver: false,
    delay: false,
    dynamicsCompressor: false,
    oscillator: false,
    panner: false,
    stereoPanner: false,
    waveShaper: false
  };
  
  try {
    // Check basic Web Audio support
    support.webAudio = !!(window.AudioContext || window.webkitAudioContext);
    
    if (support.webAudio) {
      const testContext = new (window.AudioContext || window.webkitAudioContext)();
      support.audioContext = true;
      
      // Check for specific node support
      support.analyser = !!testContext.createAnalyser;
      support.gainNode = !!testContext.createGain;
      support.biquadFilter = !!testContext.createBiquadFilter;
      support.convolver = !!testContext.createConvolver;
      support.delay = !!testContext.createDelay;
      support.dynamicsCompressor = !!testContext.createDynamicsCompressor;
      support.oscillator = !!testContext.createOscillator;
      support.panner = !!testContext.createPanner;
      support.stereoPanner = !!testContext.createStereoPanner;
      support.waveShaper = !!testContext.createWaveShaper;
      
      // Close the test context
      testContext.close();
    }
  } catch (error) {
    console.warn('Error checking audio support:', error);
  }
  
  return support;
}

/**
 * Load and decode an audio file from a Blob or File
 * @param {AudioContext} audioContext - Web Audio API context
 * @param {Blob|File} blob - Audio blob or file
 * @returns {Promise<AudioBuffer>} Decoded audio buffer
 */
export async function loadAudioFromBlob(audioContext, blob) {
  if (!audioContext) {
    throw new Error('Invalid audio context');
  }
  
  if (!blob || !(blob instanceof Blob)) {
    throw new Error('Invalid blob provided');
  }
  
  // Check size
  if (blob.size > MAX_BUFFER_SIZE) {
    throw new Error('Audio file too large');
  }
  
  try {
    const arrayBuffer = await blob.arrayBuffer();
    return await audioContext.decodeAudioData(arrayBuffer);
  } catch (error) {
    console.error('Error decoding audio from blob:', error);
    throw error;
  }
}

/**
 * Check if audio playback is allowed (not blocked by browser policies)
 * @param {AudioContext} audioContext - Web Audio API context
 * @returns {Promise<boolean>} Whether audio playback is allowed
 */
export async function checkAudioPlaybackAllowed(audioContext) {
  if (!audioContext) {
    return false;
  }
  
  if (audioContext.state === 'running') {
    return true;
  }
  
  try {
    // Try to resume the audio context
    await audioContext.resume();
    
    // Create a silent oscillator to test playback
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    gain.gain.value = 0; // Silent
    
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.001); // Very short sound
    
    return audioContext.state === 'running';
  } catch (error) {
    console.error('Audio playback check failed:', error);
    return false;
  }
}

// Export all functions as a default object
export default {
  createAudioContext,
  loadAudioFile,
  createGainNode,
  validateFrequency,
  createLowpassFilter,
  createHighpassFilter,
  validateDelayTime,
  createDelay,
  generateReverbImpulse,
  createReverb,
  linearFade,
  exponentialFade,
  connectNodes,
  createStereoPanner,
  formatTime,
  checkAudioSupport,
  loadAudioFromBlob,
  checkAudioPlaybackAllowed
};