// Initialize map when Google Maps API loads
let mapService = null;
let audioService = null;
let pathRecorderService = null;
let mobileOptimizer = null;

// Import services
// Note: Import statements would be at the top of the file in the actual implementation
// import MobileOptimizer from './services/MobileOptimizer';
// import PathRecorderService from './services/PathRecorderService';
// import EnhancedAudioServices from './services/EnhancedAudioServices';

function initMap() {
  // Check if Google Maps API is available
  if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
    console.error('Google Maps API not loaded');
    document.getElementById('map-container').innerHTML = 
      '<div style="text-align: center; padding-top: 40vh; color: #666;">' +
      '<p>Could not load Google Maps. Please check your API key.</p>' +
      '</div>';
    return;
  }

  // Create a map centered at a default location
  const map = new google.maps.Map(document.getElementById('map-container'), {
    center: { lat: 40.730610, lng: -73.935242 }, // New York City
    zoom: 13,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    mapTypeControl: true,
    mapTypeControlOptions: {
      style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
      position: google.maps.ControlPosition.TOP_RIGHT
    },
    zoomControl: true,
    zoomControlOptions: {
      position: google.maps.ControlPosition.RIGHT_CENTER
    },
    scaleControl: true,
    streetViewControl: true,
    streetViewControlOptions: {
      position: google.maps.ControlPosition.RIGHT_BOTTOM
    },
    fullscreenControl: true
  });

  // Store map reference in global variable
  mapService = {
    map: map,
    // Add refresh rate control
    refreshRate: 1000,
    updateInterval: null,
    
    // Set the map refresh rate
    setRefreshRate(rate) {
      if (!this.map) return;
      
      // Clear existing update interval if any
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
      
      // Set new update interval if rate is valid
      if (rate > 0) {
        this.refreshRate = rate;
        this.updateInterval = setInterval(() => {
          this.refreshMap();
        }, rate);
      }
    },
    
    // Refresh the map
    refreshMap() {
      if (!this.map) return;
      
      // Trigger a resize event to refresh the map
      google.maps.event.trigger(this.map, 'resize');
    },
    
    // Pause map updates
    pauseUpdates() {
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
    },
    
    // Resume map updates
    resumeUpdates() {
      if (!this.updateInterval && this.refreshRate > 0) {
        this.updateInterval = setInterval(() => {
          this.refreshMap();
        }, this.refreshRate);
      }
    },
    
    // Set map quality (high, medium, low)
    setMapQuality(quality) {
      if (!this.map) return;
      
      let mapStyles = [];
      
      // Apply different styles based on quality setting
      switch(quality) {
        case 'low':
          // Simplified map with fewer features for low-end devices
          mapStyles = [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }]
            },
            {
              featureType: "transit",
              elementType: "labels",
              stylers: [{ visibility: "off" }]
            },
            {
              featureType: "road",
              elementType: "labels.icon",
              stylers: [{ visibility: "off" }]
            },
            {
              featureType: "road.arterial",
              elementType: "geometry.fill",
              stylers: [{ visibility: "simplified" }]
            }
          ];
          break;
          
        case 'medium':
          // Balanced map with moderate detail
          mapStyles = [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "simplified" }]
            }
          ];
          break;
          
        case 'high':
        default:
          // Full detail map (default)
          mapStyles = [];
          break;
      }
      
      this.map.setOptions({
        styles: mapStyles
      });
    }
  };

  // Try HTML5 geolocation to center the map on user's location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        map.setCenter(pos);
        
        // Add a marker at the user's location
        new google.maps.Marker({
          position: pos,
          map: map,
          title: "Your Location"
        });
      },
      () => {
        console.warn("Geolocation failed or was denied by the user");
      }
    );
  }
  
  // Initialize services after map is ready
  initializeServices();
}

// Initialize all services
function initializeServices() {
  // Initialize audio service
  try {
    // In the actual implementation, we would use imports at the top of the file
    // For now, we'll assume these are global variables for the purpose of this example
    if (typeof EnhancedAudioServices !== 'undefined') {
      audioService = new EnhancedAudioServices();
      console.log('Audio service initialized');
    }
  } catch (error) {
    console.error('Error initializing audio service:', error);
  }
  
  // Initialize path recorder service
  try {
    if (typeof PathRecorderService !== 'undefined') {
      pathRecorderService = new PathRecorderService(mapService, audioService);
      console.log('Path recorder service initialized');
    }
  } catch (error) {
    console.error('Error initializing path recorder service:', error);
  }
  
  // Initialize mobile optimizer
  try {
    if (typeof MobileOptimizer !== 'undefined') {
      mobileOptimizer = new MobileOptimizer(pathRecorderService, audioService, mapService);
      console.log('Mobile optimizer initialized');
    }
  } catch (error) {
    console.error('Error initializing mobile optimizer:', error);
  }
}

// Record button functionality with mobile optimization awareness
document.addEventListener('DOMContentLoaded', function() {
  document.querySelector('.record-btn').addEventListener('click', function() {
    this.classList.toggle('recording');
    
    if (this.classList.contains('recording')) {
      // Starting recording
      if (pathRecorderService) {
        const compositionId = new URLSearchParams(window.location.search).get('compositionId') || 'demo';
        pathRecorderService.startRecording(compositionId);
      } else {
        alert('Recording started! In a full implementation, this would track your path.');
      }
      
      // Notify the mobile optimizer if available
      if (mobileOptimizer) {
        // We're recording, so ensure resources are optimized but adequate for recording
        mobileOptimizer.isRecording = true;
        mobileOptimizer.applyBatteryOptimizations();
      }
    } else {
      // Stopping recording
      if (pathRecorderService) {
        pathRecorderService.stopRecording().then(recording => {
          if (recording) {
            console.log('Recording saved:', recording);
          }
        });
      } else {
        alert('Recording stopped! In a full implementation, this would save your path data.');
      }
      
      // Notify the mobile optimizer if available
      if (mobileOptimizer) {
        mobileOptimizer.isRecording = false;
        mobileOptimizer.applyBatteryOptimizations();
      }
    }
  });
});

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(error => {
        console.error('ServiceWorker registration failed: ', error);
      });
  });
}

// Handle application lifecycle events
document.addEventListener('visibilitychange', () => {
  if (mobileOptimizer) {
    if (document.hidden) {
      mobileOptimizer.handleBackgroundState();
    } else {
      mobileOptimizer.handleForegroundState();
    }
  }
});

// Handle device orientation change
window.addEventListener('orientationchange', () => {
  console.log(`Orientation changed to: ${window.orientation}`);
  
  // Let the mobile optimizer handle this
  if (mobileOptimizer) {
    // Already being handled by the mobile optimizer's internal orientation handler
  } else {
    // Fallback for when mobile optimizer isn't available
    if (mapService && mapService.refreshMap) {
      // Small delay to let the orientation change complete
      setTimeout(() => {
        mapService.refreshMap();
      }, 500);
    }
  }
});

// Handle network status changes
if ('connection' in navigator) {
  navigator.connection.addEventListener('change', () => {
    console.log(`Network changed: ${navigator.connection.effectiveType}`);
    if (mobileOptimizer) {
      // Reapply optimizations based on network conditions
      mobileOptimizer.applyInitialOptimizations();
    }
  });
}