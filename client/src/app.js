// Initialize map when Google Maps API loads
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
}

// Record button functionality (simulation)
document.addEventListener('DOMContentLoaded', function() {
  document.querySelector('.record-btn').addEventListener('click', function() {
    this.classList.toggle('recording');
    if (this.classList.contains('recording')) {
      alert('Recording started! In a full implementation, this would track your path.');
    } else {
      alert('Recording stopped! In a full implementation, this would save your path data.');
    }
  });
});