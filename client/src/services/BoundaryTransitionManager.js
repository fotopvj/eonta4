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
   * Handle crossfade between multiple regions
   * Implements the overlapping regions functionality described in thesis section 3.2.0
   * @param {Array} activeRegions - Currently active audio regions
   * @param {Object} position - Current user position
   */
  handleCrossfades(activeRegions, position) {
    if (!activeRegions || activeRegions.length <= 1 || !position) {
      return;
    }
    
    try {
      // For each pair of active regions, calculate crossfade settings
      for (let i = 0; i < activeRegions.length; i++) {
        for (let j = i + 1; j < activeRegions.length; j++) {
          const region1 = activeRegions[i];
          const region2 = activeRegions[j];
          
          // Skip if either region doesn't have crossfade enabled
          if (!region1.settings?.crossfadeOverlap || !region2.settings?.crossfadeOverlap) {
            continue;
          }
          
          // Calculate distances to both region centers
          const distance1 = this.calculateDistance(position, region1.center);
          const distance2 = this.calculateDistance(position, region2.center);
          
          // Calculate crossfade ratio based on relative distances
          const totalDistance = distance1 + distance2;
          if (totalDistance === 0) continue;
          
          const ratio1 = 1 - (distance1 / totalDistance);
          const ratio2 = 1 - (distance2 / totalDistance);
          
          // Apply volume adjustments for crossfade
          // This creates an inverse relationship - as you move toward one region,
          // its volume increases while the other decreases proportionally
          const baseVolume1 = region1.settings?.volume || 1.0;
          const baseVolume2 = region2.settings?.volume || 1.0;
          
          const crossfadeVolume1 = baseVolume1 * (0.7 + 0.3 * ratio1);
          const crossfadeVolume2 = baseVolume2 * (0.7 + 0.3 * ratio2);
          
          this.audioService.setVolume(region1.id, crossfadeVolume1);
          this.audioService.setVolume(region2.id, crossfadeVolume2);
        }
      }
    } catch (error) {
      console.error('Error handling crossfades:', error);
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