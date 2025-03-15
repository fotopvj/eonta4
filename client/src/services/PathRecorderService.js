import { calculateDistance } from './MapUtils';

/**
 * Path Recorder Service
 * Handles GPS path recording, audio capture, and composition generation
 */
class PathRecorderService {
  constructor(mapService, audioService) {
    this.mapService = mapService;
    this.audioService = audioService;
    this.isRecording = false;
    this.recordedPath = [];
    this.recordedAudio = [];
    this.recordingStartTime = null;
    this.watchId = null;
    this.recordingInterval = null;
    this.currentCompositionId = null;
    this.pathPolyline = null;
    
    // Settings
    this.settings = {
      captureInterval: 1000, // ms between position captures
      minDistance: 2, // minimum distance in meters to record a new point
      maxDuration: 3600000, // maximum recording time (1 hour)
      includeAudioSnapshot: true // whether to include audio snapshots
    };
    
    // Bind methods
    this.startRecording = this.startRecording.bind(this);
    this.stopRecording = this.stopRecording.bind(this);
    this.capturePosition = this.capturePosition.bind(this);
    this.captureAudioState = this.captureAudioState.bind(this);
    this.generateComposition = this.generateComposition.bind(this);
  }
  
  /**
   * Start recording the user's path
   * @param {String} compositionId - ID of the composition being experienced
   * @returns {Boolean} Success flag
   */
  startRecording(compositionId) {
    if (this.isRecording) {
      console.warn('Recording already in progress');
      return false;
    }
    
    // Check if geolocation is available
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser');
      this._dispatchError('Geolocation is not supported by this browser. Please try a different browser.');
      return false;
    }
    
    // Validate compositionId
    if (!compositionId || typeof compositionId !== 'string') {
      console.error('Invalid composition ID');
      this._dispatchError('Invalid composition ID provided.');
      return false;
    }
    
    this.currentCompositionId = compositionId;
    this.isRecording = true;
    this.recordedPath = [];
    this.recordedAudio = [];
    this.recordingStartTime = Date.now();
    
    // Create initial path point on the map
    if (this.mapService && this.mapService.map && typeof google !== 'undefined' && google.maps) {
      try {
        this.pathPolyline = new google.maps.Polyline({
          path: [],
          geodesic: true,
          strokeColor: '#FF0000',
          strokeOpacity: 1.0,
          strokeWeight: 3,
          map: this.mapService.map
        });
      } catch (error) {
        console.error('Error creating map polyline:', error);
        // Continue without visualization, not a critical error
      }
    }
    
    // Start watching position
    try {
      this.watchId = navigator.geolocation.watchPosition(
        this.capturePosition,
        error => {
          console.error('Error capturing position:', error);
          // Provide user feedback based on error code
          let errorMessage = 'Unknown error occurred while tracking your location.';
          
          if (error.code) {
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = 'Location permission denied. Please enable location services to record your path.';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = 'Location information is unavailable. Please try again in an open area.';
                break;
              case error.TIMEOUT:
                errorMessage = 'Location request timed out. Please check your connection and try again.';
                break;
            }
          }
          
          this._dispatchError(errorMessage);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10000
        }
      );
    } catch (error) {
      console.error('Error starting geolocation watch:', error);
      this._dispatchError('Could not start location tracking. Please check your browser settings.');
      this.isRecording = false;
      return false;
    }
    
    // Set up interval for regular capture
    this.recordingInterval = setInterval(() => {
      // Capture audio state regularly
      if (this.settings.includeAudioSnapshot) {
        this.captureAudioState();
      }
      
      // Check if we've exceeded maximum recording time
      if (Date.now() - this.recordingStartTime > this.settings.maxDuration) {
        this.stopRecording();
        
        // Notify user
        window.dispatchEvent(new CustomEvent('path-recording-max-duration', {
          detail: { 
            message: 'Maximum recording duration reached. Your path has been automatically saved.' 
          }
        }));
      }
    }, this.settings.captureInterval);
    
    // Notify that recording has started
    window.dispatchEvent(new CustomEvent('path-recording-started', {
      detail: {
        timestamp: this.recordingStartTime,
        compositionId: this.currentCompositionId
      }
    }));
    
    return true;
  }
  
  /**
   * Stop recording the path
   * @returns {Promise<Object>} Recording data and composition info
   */
  async stopRecording() {
    if (!this.isRecording) {
      console.warn('No recording in progress');
      return null;
    }
    
    // Clear watch and interval
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    
    if (this.recordingInterval !== null) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }
    
    // Capture final audio state
    if (this.settings.includeAudioSnapshot) {
      this.captureAudioState();
    }
    
    // Set recording flag to false
    this.isRecording = false;
    
    // Generate and process the recorded composition
    const recordingData = {
      compositionId: this.currentCompositionId,
      startTime: this.recordingStartTime,
      endTime: Date.now(),
      duration: Date.now() - this.recordingStartTime,
      path: this.recordedPath,
      audioEvents: this.recordedAudio
    };
    
    // If we have enough points, generate a composition
    if (this.recordedPath.length >= 2) {
      try {
        const composition = await this.generateComposition(recordingData);
        
        // Notify that recording has finished successfully
        window.dispatchEvent(new CustomEvent('path-recording-completed', {
          detail: {
            recordingData,
            composition
          }
        }));
        
        return composition;
      } catch (error) {
        console.error('Error generating composition:', error);
        this._dispatchError('Failed to generate composition from your path.');
        return null;
      }
    } else {
      // Not enough points to generate a meaningful composition
      this._dispatchError('Not enough movement detected to create a composition.');
      return null;
    }
  }
  
  /**
   * Capture the current position
   * @param {Object} position - Geolocation position
   */
  capturePosition(position) {
    if (!this.isRecording) return;
    
    try {
      const newPoint = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: Date.now(),
        timeSinceStart: Date.now() - this.recordingStartTime
      };
      
      // Add altitude if available
      if (position.coords.altitude !== null) {
        newPoint.alt = position.coords.altitude;
      }
      
      // Validate coordinates
      if (!this._isValidCoordinate(newPoint.lat, newPoint.lng)) {
        console.warn('Invalid coordinates received:', newPoint);
        return;
      }
      
      // Only add the point if it's far enough from the last point
      // This prevents cluttering with redundant points
      if (this.recordedPath.length === 0 || 
          calculateDistance(
            this.recordedPath[this.recordedPath.length - 1], 
            newPoint
          ) >= this.settings.minDistance) {
        
        // Add to our data structure
        this.recordedPath.push(newPoint);
        
        // Update the visible path on the map
        if (this.pathPolyline) {
          const pathCoords = this.recordedPath.map(point => ({
            lat: point.lat,
            lng: point.lng
          }));
          
          this.pathPolyline.setPath(pathCoords);
        }
        
        // Capture audio state when position changes significantly
        if (this.settings.includeAudioSnapshot) {
          this.captureAudioState();
        }
        
        // Notify about position update
        window.dispatchEvent(new CustomEvent('path-position-updated', {
          detail: {
            position: newPoint,
            pointCount: this.recordedPath.length
          }
        }));
      }
    } catch (error) {
      console.error('Error processing position data:', error);
    }
  }
  
  /**
   * Validate geographic coordinates
   * @param {Number} lat - Latitude
   * @param {Number} lng - Longitude
   * @returns {Boolean} Whether coordinates are valid
   */
  _isValidCoordinate(lat, lng) {
    return (
      typeof lat === 'number' && 
      typeof lng === 'number' && 
      !isNaN(lat) && 
      !isNaN(lng) && 
      lat >= -90 && 
      lat <= 90 && 
      lng >= -180 && 
      lng <= 180
    );
  }
  
  /**
   * Capture the current audio playback state
   */
  captureAudioState() {
    if (!this.isRecording || !this.audioService) return;
    
    try {
      // Get currently playing audio from the audio service
      const playingAudio = this.audioService.getActiveAudio();
      
      const audioSnapshot = {
        timestamp: Date.now(),
        timeSinceStart: Date.now() - this.recordingStartTime,
        activeRegions: Array.isArray(playingAudio) ? playingAudio.map(audio => ({
          regionId: audio.id,
          volume: audio.volume,
          effects: audio.effects
        })) : []
      };
      
      this.recordedAudio.push(audioSnapshot);
    } catch (error) {
      console.error('Error capturing audio state:', error);
    }
  }
  
  /**
   * Generate a downloadable composition
   * @param {Object} recordingData - Recording data including path and audio events
   * @returns {Promise<Object>} Composition data including download URL
   */
  async generateComposition(recordingData) {
    if (!recordingData || !recordingData.compositionId) {
      throw new Error('Invalid recording data');
    }
    
    try {
      const authToken = localStorage.getItem('authToken');
      
      if (!authToken) {
        throw new Error('Authentication required');
      }
      
      // Submit the recording data to the server to generate the composition
      const response = await fetch('/api/compositions/generate-from-path', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          compositionId: recordingData.compositionId,
          path: recordingData.path,
          audioEvents: recordingData.audioEvents,
          duration: recordingData.duration,
          startTime: recordingData.startTime,
          endTime: recordingData.endTime,
          userEmail: localStorage.getItem('userEmail') || '' // Optional, for sending email
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate composition: ${response.status} ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error generating composition:', error);
      throw error;
    }
  }
  
  /**
   * Helper method to dispatch error events
   * @param {String} errorMessage - Error message
   */
  _dispatchError(errorMessage) {
    window.dispatchEvent(new CustomEvent('path-recording-error', {
      detail: { error: errorMessage }
    }));
  }
  
  /**
   * Get recording status
   * @returns {Object} Current recording status
   */
  getStatus() {
    if (!this.isRecording) {
      return {
        isRecording: false
      };
    }
    
    return {
      isRecording: true,
      duration: Date.now() - this.recordingStartTime,
      pointsRecorded: this.recordedPath.length,
      audioSnapshotsRecorded: this.recordedAudio.length,
      compositionId: this.currentCompositionId
    };
  }
  
  /**
   * Clean up resources when component unmounts
   */
  dispose() {
    if (this.isRecording) {
      this.stopRecording();
    }
    
    if (this.pathPolyline) {
      this.pathPolyline.setMap(null);
      this.pathPolyline = null;
    }
  }
}

export default PathRecorderService;