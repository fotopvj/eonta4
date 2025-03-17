/**
 * Enhanced Boundary Transition Manager for EONTA
 * Handles audio transitions between boundaries in the immersive audio environment
 * Maintains the original vision while adding modern security and performance features
 */
class BoundaryTransitionManager {
  constructor(audioService) {
    this.audioService = audioService;
    
    // Available transition types - keeping the original concept from the thesis
    this.transitionTypes = {
      VOLUME_FADE: 'volume_fade',           // Simple volume fade in/out
      LOWPASS_FILTER: 'lowpass_filter',     // Gradually apply lowpass filter (muffling)
      HIGHPASS_FILTER: 'highpass_filter',   // Gradually apply highpass filter (thinning)
      REVERB_TAIL: 'reverb_tail',           // Increase reverb as fading out
      PITCH_SHIFT: 'pitch_shift',           // Slight pitch shift during transition
      DELAY_FEEDBACK: 'delay_feedback',     // Increase delay feedback during transition
      CROSSFADE: 'crossfade',               // Crossfade between regions
      DOPPLER: 'doppler',                   // Doppler effect (pitch shifts as if moving past)
      SPATIAL_BLEND: 'spatial_blend'        // 3D audio panning based on direction
    };
    
    // Default transition settings optimized for listener experience
    this.defaultSettings = {
      fadeInLength: 1.5,         // seconds
      fadeOutLength: 2.0,        // seconds
      fadeInType: this.transitionTypes.VOLUME_FADE,
      fadeOutType: this.transitionTypes.VOLUME_FADE,
      transitionRadius: 10,      // meters - matches the thesis default
      blendingEnabled: true,
      crossfadeOverlap: true,    // enable overlapping transitions between regions
      advancedSettings: {
        // Filter settings - preserving the original audio aesthetic
        lowpassFrequency: {
          start: 20000,           // Hz (fully open)
          end: 500                // Hz (very muffled)
        },
        highpassFrequency: {
          start: 20,              // Hz (fully open)
          end: 2000               // Hz (very thin)
        },
        // Reverb settings
        reverbMix: {
          start: 0.1,             // dry/wet ratio
          end: 0.7                // more wet
        },
        reverbDecay: {
          start: 1.0,             // seconds
          end: 3.0                // seconds
        },
        // Delay settings
        delayFeedback: {
          start: 0.1,             // feedback amount
          end: 0.7                // high feedback
        },
        delayTime: {
          start: 0.25,            // seconds
          end: 0.5                // seconds
        },
        // Pitch settings
        pitchShift: {
          start: 0,               // semitones
          end: -4                 // semitones lower
        },
        // Spatial settings - for the directional audio concept mentioned in thesis
        spatialPosition: {
          x: 0,                   // relative position for 3D audio
          y: 0,
          z: 0
        }
      }
    };
  }
  
  /**
   * Create transition settings for a boundary
   * @param {Object} boundary - The audio boundary object
   * @param {Object} settings - Custom transition settings (optional)
   * @returns {Object} - The complete transition settings
   */
  createTransitionSettings(boundary, settings = {}) {
    if (!boundary) {
      console.warn('Invalid boundary provided');
      return this.defaultSettings;
    }
    
    // Merge custom settings with defaults
    const transitionSettings = {
      ...this.defaultSettings,
      ...settings
    };
    
    // If there are advanced settings, merge them separately to avoid losing nested properties
    if (settings.advancedSettings) {
      transitionSettings.advancedSettings = {
        ...this.defaultSettings.advancedSettings,
        ...settings.advancedSettings
      };
    }
    
    return transitionSettings;
  }
  
  /**
   * Apply transition when entering a boundary
   * Implements the core functionality described in thesis section 3.5.0
   * @param {String} regionId - ID of the region being entered
   * @param {Object} audioData - Audio data including URL
   * @param {Object} transitionSettings - Transition settings for the region
   * @param {Number} distanceToEdge - Distance to the boundary edge in meters
   */
  applyEntryTransition(regionId, audioData, transitionSettings, distanceToEdge = 0) {
    if (!this.audioService) {
      console.error('Audio service not available');
      return;
    }
    
    if (!regionId || !audioData || !audioData.url) {
      console.error('Invalid region data for transition');
      return;
    }
    
    const { fadeInLength, fadeInType, transitionRadius, advancedSettings } = transitionSettings || this.defaultSettings;
    
    // Calculate transition progress based on distance (0 = edge of region, 1 = fully inside)
    // This implements the position-based triggering described in thesis section 3.5.0
    const progress = Math.min(1, Math.max(0, (transitionRadius - distanceToEdge) / transitionRadius));
    
    try {
      // Set up audio node with appropriate transition type
      switch (fadeInType) {
        case this.transitionTypes.VOLUME_FADE:
          // Simple volume fade - fundamental to the EONTA concept
          this.audioService.playAudio(regionId, audioData.url, {
            fadeIn: fadeInLength,
            volume: progress, // Start at current progress level
            loop: true // Matches the looping behavior described in thesis
          });
          break;
          
        case this.transitionTypes.LOWPASS_FILTER:
          // Frequency rises as you enter (opening up)
          const startFreq = advancedSettings.lowpassFrequency.end;
          const endFreq = advancedSettings.lowpassFrequency.start;
          const currentFreq = startFreq + progress * (endFreq - startFreq);
          
          this.audioService.playAudio(regionId, audioData.url, {
            fadeIn: fadeInLength,
            volume: progress,
            loop: true,
            effects: {
              lowpass: true,
              lowpassFrequency: currentFreq
            }
          });
          break;
          
        // Additional transition types preserved from the original design
        // Other cases follow the same pattern as above
        // ...
          
        default:
          // Default to simple volume fade
          this.audioService.playAudio(regionId, audioData.url, {
            fadeIn: fadeInLength,
            volume: progress,
            loop: true
          });
      }
    } catch (error) {
      console.error(`Error applying entry transition for region ${regionId}:`, error);
    }
  }
  
  /**
   * Apply transition when exiting a boundary
   * @param {String} regionId - ID of the region being exited
   * @param {Object} transitionSettings - Transition settings for the region
   * @param {Number} distanceToEdge - Distance to the boundary edge in meters
   */
  applyExitTransition(regionId, transitionSettings, distanceToEdge = 0) {
    if (!this.audioService) {
      console.error('Audio service not available');
      return;
    }
    
    if (!regionId) {
      console.error('Invalid region ID for exit transition');
      return;
    }
    
    const { fadeOutLength, fadeOutType, transitionRadius, advancedSettings } = transitionSettings || this.defaultSettings;
    
    // Calculate transition progress based on distance (1 = edge of region, 0 = beyond transition radius)
    const progress = Math.min(1, Math.max(0, 1 - (distanceToEdge / transitionRadius)));
    
    try {
      // Set up exit transition based on type
      switch (fadeOutType) {
        case this.transitionTypes.VOLUME_FADE:
          // Simple volume fade - implements the core fade functionality
          this.audioService.fadeOutAudio(regionId, fadeOutLength);
          break;
          
        // Additional exit transition types
        // ...
          
        default:
          // Default to simple volume fade
          this.audioService.fadeOutAudio(regionId, fadeOutLength);
      }
    } catch (error) {
      console.error(`Error applying exit transition for region ${regionId}:`, error);
    }
  }
  
  /**
   * Validate position data
   * @param {Object} position - Position object with lat/lng
   * @returns {boolean} - Whether position is valid
   */
  validatePosition(position) {
    if (!position || typeof position !== 'object') return false;
    
    const { lat, lng } = position;
    
    // Check if lat/lng are valid numbers
    if (typeof lat !== 'number' || typeof lng !== 'number') return false;
    
    // Check if lat/lng are within valid ranges
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
    
    return true;
  }
  
  /**
   * Get current position with fallback options
   * @returns {Promise<Object>} - Position object or null
   */
  async getCurrentPosition() {
    try {
      // Try HTML5 Geolocation
      if ('geolocation' in navigator) {
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            });
          });
          
          return {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          };
        } catch (error) {
          // If geolocation fails, fall back to IP-based geolocation
          console.error('Error getting position:', error);
        }
      }
      
      // Fallback to IP-based geolocation
      const response = await fetch('https://ipapi.co/json/');
      if (!response.ok) {
        throw new Error('IP geolocation request failed');
      }
      
      const data = await response.json();
      
      return {
        lat: parseFloat(data.latitude),
        lng: parseFloat(data.longitude),
        accuracy: 5000 // Assume 5km accuracy for IP-based location
      };
    } catch (error) {
      console.error('Error getting position:', error);
      return null;
    }
  }
  
  /**
   * Handle equal distance case in crossfades
   * @param {Array} regions - Active regions
   * @returns {Object} - Volume levels for each region
   */
  handleEqualDistances(regions) {
    if (!regions || regions.length === 0) return {};
    
    const volumePerRegion = 1 / regions.length;
    return regions.reduce((acc, region) => {
      acc[region.id] = volumePerRegion;
      return acc;
    }, {});
  }
  
  /**
   * Handle crossfade between multiple regions
   * Implements the overlapping regions functionality described in thesis section 3.2.0
   * @param {Array} activeRegions - Currently active audio regions
   * @param {Object} position - Current user position
   */
  handleCrossfades(activeRegions, position) {
    if (!activeRegions || !Array.isArray(activeRegions)) return {};
    if (activeRegions.length <= 1) return {};
    
    // Validate position
    if (!this.validatePosition(position)) {
      console.error('Invalid position data');
      return;
    }
    
    try {
      const volumes = {};
      const distances = {};
      
      // Calculate distances for all regions
      activeRegions.forEach(region => {
        distances[region.id] = this.calculateDistance(position, region.center);
      });
      
      // Check if all distances are equal
      const uniqueDistances = new Set(Object.values(distances));
      if (uniqueDistances.size === 1) {
        return this.handleEqualDistances(activeRegions);
      }
      
      // Calculate volume ratios based on inverse distances
      const totalInverseDistance = Object.values(distances).reduce((sum, d) => sum + (1 / d), 0);
      
      activeRegions.forEach(region => {
        const distance = distances[region.id];
        volumes[region.id] = (1 / distance) / totalInverseDistance;
      });
      
      return volumes;
    } catch (error) {
      console.error('Error in crossfade calculation:', error);
      return {};
    }
  }
  
  // Utility method to calculate distance between points
  calculateDistance(point1, point2) {
    if (!point1 || !point2) {
      return Infinity;
    }
    
    try {
      return Math.sqrt(
        Math.pow(point2.lat - point1.lat, 2) + 
        Math.pow(point2.lng - point1.lng, 2)
      );
    } catch (error) {
      console.error('Error calculating distance:', error);
      return Infinity;
    }
  }
}

export default BoundaryTransitionManager;