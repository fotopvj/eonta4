import { Loader } from '@googlemaps/js-api-loader';

class MapService {
  constructor() {
    this.map = null;
    this.loader = null;
    this.isLoaded = false;
    this.apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  }

  async initializeMap(containerId) {
    if (!this.apiKey) {
      console.error('Google Maps API key is not configured');
      return false;
    }

    try {
      // Initialize the loader if not already done
      if (!this.loader) {
        this.loader = new Loader({
          apiKey: this.apiKey,
          version: 'weekly',
          libraries: ['places', 'geometry']
        });
      }

      // Load the Google Maps API
      await this.loader.load();
      this.isLoaded = true;

      // Create the map instance
      const mapElement = document.getElementById(containerId);
      if (!mapElement) {
        throw new Error(`Map container element '${containerId}' not found`);
      }

      this.map = new google.maps.Map(mapElement, {
        center: { lat: 0, lng: 0 },
        zoom: 2,
        mapTypeId: 'terrain',
        mapTypeControl: true,
        fullscreenControl: true,
        streetViewControl: false
      });

      return true;
    } catch (error) {
      console.error('Error initializing Google Maps:', error);
      return false;
    }
  }

  isGoogleMapsLoaded() {
    return this.isLoaded && typeof google !== 'undefined' && google.maps;
  }

  getGoogleMaps() {
    return this.isLoaded ? google : null;
  }

  getMap() {
    return this.map;
  }

  setCenter(lat, lng) {
    if (this.map && this.isGoogleMapsLoaded()) {
      this.map.setCenter({ lat, lng });
    }
  }

  setZoom(level) {
    if (this.map && this.isGoogleMapsLoaded()) {
      this.map.setZoom(level);
    }
  }

  dispose() {
    this.map = null;
    this.isLoaded = false;
  }
}

export default MapService; 