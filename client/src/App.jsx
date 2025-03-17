import React, { useEffect, useState, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { ThemeProvider, createTheme } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';
import CircularProgress from '@material-ui/core/CircularProgress';
import { makeStyles } from '@material-ui/core/styles';
import MapControls from './components/MapControls';
import AudioControls from './components/AudioControls';
import MobileOptimizer from './services/MobileOptimizer';
import EnhancedAudioServices from './services/EnhancedAudioServices';
import PathRecorderService from './services/PathRecorderService';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
  },
  mapContainer: {
    flex: 1,
  },
}));

// Create a theme instance
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  const classes = useStyles();
  const [isLoading, setIsLoading] = useState(true);
  const [mapService, setMapService] = useState(null);
  const [audioService, setAudioService] = useState(null);
  const [pathRecorder, setPathRecorder] = useState(null);
  const [mobileOptimizer, setMobileOptimizer] = useState(null);
  const [error, setError] = useState(null);

  const initializeMap = useCallback(async () => {
    try {
      const loader = new Loader({
        apiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
        version: "weekly",
        libraries: ["places"]
      });

      const google = await loader.load();
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

      const newMapService = {
        map,
        refreshRate: 1000,
        updateInterval: null,
        setRefreshRate(rate) {
          if (this.updateInterval) {
            clearInterval(this.updateInterval);
          }
          if (rate > 0) {
            this.refreshRate = rate;
            this.updateInterval = setInterval(() => this.refreshMap(), rate);
          }
        },
        refreshMap() {
          google.maps.event.trigger(this.map, 'resize');
        },
        pauseUpdates() {
          if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
          }
        },
        resumeUpdates() {
          if (!this.updateInterval && this.refreshRate > 0) {
            this.updateInterval = setInterval(() => this.refreshMap(), this.refreshRate);
          }
        },
        setMapQuality(quality) {
          const styles = {
            high: [],
            medium: [
              { featureType: "poi", stylers: [{ visibility: "off" }] },
              { featureType: "transit", stylers: [{ visibility: "off" }] }
            ],
            low: [
              { featureType: "poi", stylers: [{ visibility: "off" }] },
              { featureType: "transit", stylers: [{ visibility: "off" }] },
              { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] },
              { featureType: "road", elementType: "geometry.stroke", stylers: [{ visibility: "off" }] }
            ]
          };
          this.map.setOptions({ styles: styles[quality] || [] });
        }
      };

      setMapService(newMapService);
      return newMapService;
    } catch (error) {
      console.error('Error initializing map:', error);
      setError('Failed to load Google Maps. Please check your API key.');
      return null;
    }
  }, []);

  const initializeServices = useCallback(async (mapService) => {
    try {
      // Initialize audio service
      const audio = new EnhancedAudioServices();
      setAudioService(audio);

      // Initialize path recorder
      const recorder = new PathRecorderService(mapService);
      setPathRecorder(recorder);

      // Initialize mobile optimizer
      const optimizer = new MobileOptimizer(recorder, audio, mapService);
      await optimizer.init();
      setMobileOptimizer(optimizer);

      setIsLoading(false);
    } catch (error) {
      console.error('Error initializing services:', error);
      setError('Failed to initialize application services.');
    }
  }, []);

  useEffect(() => {
    async function initialize() {
      const map = await initializeMap();
      if (map) {
        await initializeServices(map);
      }
    }
    initialize();

    return () => {
      // Cleanup
      if (mapService?.updateInterval) {
        clearInterval(mapService.updateInterval);
      }
      if (audioService) {
        audioService.dispose();
      }
    };
  }, [initializeMap, initializeServices]);

  if (error) {
    return (
      <div className={classes.loading}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className={classes.root}>
        {isLoading ? (
          <div className={classes.loading}>
            <CircularProgress />
          </div>
        ) : (
          <>
            <div id="map-container" className={classes.mapContainer} />
            <MapControls
              mapService={mapService}
              pathRecorder={pathRecorder}
              mobileOptimizer={mobileOptimizer}
            />
            <AudioControls
              audioService={audioService}
              pathRecorder={pathRecorder}
            />
          </>
        )}
      </div>
    </ThemeProvider>
  );
}

export default App; 