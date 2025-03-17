// client/src/services/MobileOptimizer.js

/**
 * Mobile Optimizer for EONTA
 * Handles battery-efficient geolocation, background state management, 
 * and performance optimizations
 */
class MobileOptimizer {
    constructor(pathRecorderService, audioService, mapService) {
      this.pathRecorderService = pathRecorderService;
      this.audioService = audioService;
      this.mapService = mapService;
      
      this.batteryLevel = 1.0;
      this.isLowPowerMode = false;
      this.isBackgroundState = false;
      this.originalSettings = null;
      this.batteryManager = null;
      
      // Store original settings immediately
      if (this.pathRecorderService && this.pathRecorderService.settings) {
        this.originalSettings = { ...this.pathRecorderService.settings };
      }
    }
    
    /**
     * Initialize mobile optimizations
     */
    async init() {
      try {
        // Set up battery monitoring
        await this.setupBatteryMonitoring();
        
        // Set up background state detection
        this.setupBackgroundDetection();
        
        // Set up device orientation change handler
        this.setupOrientationHandler();
        
        // Apply initial optimizations based on device capabilities
        await this.applyInitialOptimizations();
      } catch (error) {
        console.warn('Error during initialization:', error);
      }
    }
    
    /**
     * Set up battery monitoring
     */
    async setupBatteryMonitoring() {
      if (typeof navigator === 'undefined') return;
      
      if ('getBattery' in navigator) {
        try {
          this.batteryManager = await navigator.getBattery();
          
          if (!this.batteryManager) {
            console.warn('Battery API returned null manager');
            return;
          }
          
          // Get initial battery level
          this.batteryLevel = this.batteryManager.level;
          
          // Set up event listeners
          this.batteryManager.addEventListener('levelchange', async () => {
            this.batteryLevel = this.batteryManager.level;
            await this.applyBatteryOptimizations();
          });
          
          this.batteryManager.addEventListener('chargingchange', async () => {
            await this.applyBatteryOptimizations();
          });
          
          // Apply initial battery optimizations
          await this.applyBatteryOptimizations();
        } catch (error) {
          console.warn('Battery API error:', error);
        }
      } else {
        console.log('Battery API not supported in this browser');
      }
    }
    
    /**
     * Apply optimizations based on battery level
     */
    async applyBatteryOptimizations() {
      if (!this.batteryManager || !this.pathRecorderService) return;
      
      const isCharging = this.batteryManager.charging;
      const level = this.batteryManager.level;
      
      // If charging, use original settings
      if (isCharging) {
        this.isLowPowerMode = false;
        await this.restoreOriginalSettings();
        return;
      }
      
      // Apply power optimizations based on battery level
      if (level <= 0.15) {
        // Critical battery - aggressive power saving
        this.isLowPowerMode = true;
        this.pathRecorderService.settings.captureInterval = 3000; // 3 seconds
        this.pathRecorderService.settings.minDistance = 8; // 8 meters
        
        // Reduce map refresh rate
        if (this.mapService && this.mapService.setRefreshRate) {
          this.mapService.setRefreshRate(3000); // 3 seconds
        }
        
        // Reduce audio quality if needed
        if (this.audioService && !this.isBackgroundState) {
          // Only apply if app is in foreground
          await this.reduceAudioQuality(true);
        }
      } 
      else if (level <= 0.3) {
        // Low battery - moderate power saving
        this.isLowPowerMode = true;
        this.pathRecorderService.settings.captureInterval = 2000; // 2 seconds
        this.pathRecorderService.settings.minDistance = 5; // 5 meters
        
        // Reduce map refresh rate
        if (this.mapService && this.mapService.setRefreshRate) {
          this.mapService.setRefreshRate(2000); // 2 seconds
        }
        
        // Slight audio quality reduction
        if (this.audioService && !this.isBackgroundState) {
          await this.reduceAudioQuality(false);
        }
      } 
      else {
        // Normal battery level
        this.isLowPowerMode = false;
        await this.restoreOriginalSettings();
      }
      
      // Update geolocation options
      if (this.pathRecorderService) {
        this.pathRecorderService.locationOptions = {
          enableHighAccuracy: !this.isLowPowerMode,
          maximumAge: this.isLowPowerMode ? 5000 : 0,
          timeout: this.isLowPowerMode ? 15000 : 10000
        };
      }
    }
    
    /**
     * Set up background state detection
     */
    setupBackgroundDetection() {
      if (typeof document === 'undefined') return;
      
      document.addEventListener('visibilitychange', () => {
        this.isBackgroundState = document.hidden;
        
        if (document.hidden) {
          // App went to background
          this.handleBackgroundState();
        } else {
          // App came to foreground
          this.handleForegroundState();
        }
      });
      
      // Handle page unload
      if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', () => {
          this.handleAppClose();
        });
      }
    }
    
    /**
     * Handle app going to background
     */
    handleBackgroundState() {
      // Suspend audio context
      if (this.audioService) {
        this.audioService.suspendAudio();
      }
      
      // Pause GPS tracking if not recording
      if (this.pathRecorderService) {
        if (!this.pathRecorderService.isRecording) {
          this.pathRecorderService.pauseGPSTracking();
        } else {
          // If recording, reduce tracking frequency
          this.pathRecorderService.settings.captureInterval = 5000; // 5 seconds
          this.pathRecorderService.settings.minDistance = 10; // 10 meters
        }
      }
      
      // Stop map updates
      if (this.mapService && this.mapService.pauseUpdates) {
        this.mapService.pauseUpdates();
      }
    }
    
    /**
     * Handle app coming to foreground
     */
    handleForegroundState() {
      // Resume audio context
      if (this.audioService) {
        this.audioService.resumeAudio();
      }
      
      // Resume GPS tracking
      if (this.pathRecorderService) {
        if (this.pathRecorderService.wasTrackingBeforePause) {
          this.pathRecorderService.resumeGPSTracking();
        }
        
        // Apply appropriate settings based on battery level
        this.applyBatteryOptimizations();
      }
      
      // Resume map updates
      if (this.mapService && this.mapService.resumeUpdates) {
        this.mapService.resumeUpdates();
      }
    }
    
    /**
     * Handle app close/unload
     */
    handleAppClose() {
      // Save recording state if needed
      if (this.pathRecorderService && this.pathRecorderService.isRecording) {
        // Save current recording state to be restored later
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem('eonta_recording_in_progress', 'true');
          }
        } catch (error) {
          console.warn('Error saving to localStorage:', error);
        }
      }
      
      // Stop audio immediately
      if (this.audioService) {
        this.audioService.dispose();
      }
    }
    
    /**
     * Apply initial optimizations based on device capabilities
     */
    async applyInitialOptimizations() {
      // Detect device capabilities
      const isLowEndDevice = this.detectLowEndDevice();
      
      if (isLowEndDevice) {
        // Apply optimizations for low-end devices
        if (this.pathRecorderService) {
          this.pathRecorderService.settings.captureInterval = 2000;
          this.pathRecorderService.settings.minDistance = 5;
        }
        
        // Simplify map rendering
        if (this.mapService && this.mapService.setMapQuality) {
          this.mapService.setMapQuality('low');
        }
      }
      
      // Apply initial battery optimizations
      await this.applyBatteryOptimizations();
    }
    
    /**
     * Set up orientation change handler
     */
    setupOrientationHandler() {
      if (typeof window === 'undefined') return;
      
      // Handle orientation changes
      window.addEventListener('orientationchange', () => {
        // Pause updates briefly during orientation change
        if (this.mapService && this.mapService.pauseUpdates) {
          this.mapService.pauseUpdates();
          
          // Resume after orientation change completes
          setTimeout(() => {
            if (this.mapService.resumeUpdates) {
              this.mapService.resumeUpdates();
            }
          }, 500);
        }
      });
    }
    
    /**
     * Detect if the device is low-end
     * @returns {Boolean} True if device is low-end
     */
    detectLowEndDevice() {
      if (typeof navigator === 'undefined') return false;
      
      // Basic hardware detection
      const isLowRAM = navigator.deviceMemory ? navigator.deviceMemory < 4 : false;
      const isSlowCPU = navigator.hardwareConcurrency ? navigator.hardwareConcurrency < 4 : false;
      
      // Check for low-end connection
      const connection = navigator.connection;
      const isSlowConnection = connection ? (
        connection.type === 'cellular' || 
        connection.effectiveType === 'slow-2g' ||
        connection.effectiveType === '2g' ||
        (typeof connection.downlink === 'number' && connection.downlink < 1)
      ) : false;
                             
      return isLowRAM || isSlowCPU || isSlowConnection;
    }
    
    /**
     * Reduce audio quality to save battery
     * @param {Boolean} aggressive - Whether to apply aggressive reduction
     */
    async reduceAudioQuality(aggressive) {
      if (!this.audioService) return;
      
      // Apply a master lowpass filter to reduce high-frequency content
      if (!this.powerSavingFilter) {
        this.powerSavingFilter = this.audioService.createLowpassFilter(
          this.audioService.audioContext,
          aggressive ? 8000 : 12000, // Lower cutoff for aggressive mode
          0.5
        );
        
        if (this.powerSavingFilter) {
          this.audioService.masterGain.disconnect();
          this.audioService.masterGain.connect(this.powerSavingFilter);
          this.powerSavingFilter.connect(this.audioService.audioContext.destination);
        }
      } else {
        // Update existing filter
        if (this.powerSavingFilter.frequency) {
          this.powerSavingFilter.frequency.value = aggressive ? 8000 : 12000;
        }
      }
    }
    
    /**
     * Restore original settings
     */
    async restoreOriginalSettings() {
      if (!this.originalSettings) return;
      
      // Restore path recorder settings
      if (this.pathRecorderService) {
        this.pathRecorderService.settings = { ...this.originalSettings };
      }
      
      // Remove power saving audio filter
      if (this.powerSavingFilter && this.audioService) {
        this.audioService.masterGain.disconnect();
        this.powerSavingFilter.disconnect();
        this.audioService.masterGain.connect(this.audioService.audioContext.destination);
        this.powerSavingFilter = null;
      }
      
      // Restore map settings
      if (this.mapService) {
        if (this.mapService.setRefreshRate) {
          this.mapService.setRefreshRate(1000); // Default 1 second
        }
        
        if (this.mapService.setMapQuality) {
          this.mapService.setMapQuality('high');
        }
      }
    }
}

export default MobileOptimizer;