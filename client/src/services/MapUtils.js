/**
 * Map Utility Functions for EONTA
 * Contains helper functions for map operations, distance calculations,
 * polygon operations, and coordinate handling
 */

// Constants
const EARTH_RADIUS = 6371000; // Earth's radius in meters
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const MAX_POLYGON_POINTS = 1000; // Maximum points in a polygon for safety
const DEFAULT_TOLERANCE = 0.00001; // Default simplification tolerance

/**
 * Validates latitude and longitude values
 * @param {Number} lat - Latitude
 * @param {Number} lng - Longitude
 * @returns {Boolean} True if coordinates are valid
 */
export function isValidCoordinate(lat, lng) {
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
 * Calculate distance between two coordinates in meters
 * @param {Object} point1 - {lat, lng} coordinates
 * @param {Object} point2 - {lat, lng} coordinates
 * @returns {Number} Distance in meters
 */
export function calculateDistance(point1, point2) {
  // Validate inputs
  if (!point1 || !point2) {
    console.warn('Invalid points provided to calculateDistance');
    return 0;
  }
  
  if (!isValidCoordinate(point1.lat, point1.lng) || !isValidCoordinate(point2.lat, point2.lng)) {
    console.warn('Invalid coordinates provided to calculateDistance');
    return 0;
  }
  
  // Use Haversine formula to calculate distance between points
  const dLat = toRad(point2.lat - point1.lat);
  const dLon = toRad(point2.lng - point1.lng);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(point1.lat)) * Math.cos(toRad(point2.lat)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = EARTH_RADIUS * c;
  
  return distance; // Distance in meters
}

/**
 * Convert degrees to radians
 * @param {Number} degrees - Angle in degrees
 * @returns {Number} Angle in radians
 */
export function toRad(degrees) {
  return degrees * DEG_TO_RAD;
}

/**
 * Convert radians to degrees
 * @param {Number} radians - Angle in radians
 * @returns {Number} Angle in degrees
 */
export function toDeg(radians) {
  return radians * RAD_TO_DEG;
}

/**
 * Calculate distance from point to line segment in meters
 * @param {Number} x - Point x coordinate (longitude)
 * @param {Number} y - Point y coordinate (latitude)
 * @param {Number} x1 - Line segment start x (longitude)
 * @param {Number} y1 - Line segment start y (latitude)
 * @param {Number} x2 - Line segment end x (longitude)
 * @param {Number} y2 - Line segment end y (latitude)
 * @returns {Number} Distance in meters
 */
export function distanceToLine(x, y, x1, y1, x2, y2) {
  // Validate inputs
  if (
    typeof x !== 'number' || 
    typeof y !== 'number' || 
    typeof x1 !== 'number' || 
    typeof y1 !== 'number' || 
    typeof x2 !== 'number' || 
    typeof y2 !== 'number' ||
    isNaN(x) || isNaN(y) || isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)
  ) {
    console.warn('Invalid coordinates provided to distanceToLine');
    return Infinity;
  }
  
  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  
  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  let param = -1;
  
  if (len_sq !== 0) {
    param = dot / len_sq;
  }
  
  let xx, yy;
  
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }
  
  const dx = x - xx;
  const dy = y - yy;
  
  // Convert to meters using approximate conversion factor
  // 0.00001 in lat/lng ≈ 1.1m at the equator
  const distanceInDegrees = Math.sqrt(dx * dx + dy * dy);
  
  // More accurate conversion based on latitude (coordinates closer to poles are distorted)
  const latFactor = Math.cos(toRad((y1 + y2) / 2)); // Average latitude
  const lngCorrection = latFactor || 0.5; // Avoid division by zero
  
  // Account for different distance scales in latitude vs longitude
  const metersLat = distanceInDegrees * EARTH_RADIUS * DEG_TO_RAD;
  const metersLng = distanceInDegrees * EARTH_RADIUS * DEG_TO_RAD * lngCorrection;
  
  // Simplified approximation
  return (metersLat + metersLng) / 2;
}

/**
 * Calculate the center point of a polygon
 * @param {Array} points - Array of {lat, lng} coordinates
 * @returns {Object|null} Center point as {lat, lng} or null if invalid input
 */
export function calculatePolygonCenter(points) {
  // Validate input
  if (!Array.isArray(points) || points.length === 0) {
    return null;
  }
  
  // Limit the number of points for efficiency and security
  const validPoints = points.slice(0, MAX_POLYGON_POINTS).filter(
    point => isValidCoordinate(point?.lat, point?.lng)
  );
  
  if (validPoints.length === 0) {
    return null;
  }
  
  let sumLat = 0;
  let sumLng = 0;
  
  for (const point of validPoints) {
    sumLat += point.lat;
    sumLng += point.lng;
  }
  
  return {
    lat: sumLat / validPoints.length,
    lng: sumLng / validPoints.length
  };
}

/**
 * Check if a point is inside a polygon
 * @param {Object} point - {lat, lng} coordinates
 * @param {Array} polygon - Array of {lat, lng} coordinates
 * @returns {Boolean} True if point is inside polygon
 */
export function isPointInPolygon(point, polygon) {
  // Validate inputs
  if (!point || !Array.isArray(polygon) || polygon.length < 3) {
    return false;
  }
  
  if (!isValidCoordinate(point.lat, point.lng)) {
    console.warn('Invalid point coordinates provided to isPointInPolygon');
    return false;
  }
  
  // Limit the number of polygon points for security
  const validPolygon = polygon.slice(0, MAX_POLYGON_POINTS).filter(
    p => isValidCoordinate(p?.lat, p?.lng)
  );
  
  if (validPolygon.length < 3) {
    console.warn('Not enough valid points to form a polygon');
    return false;
  }
  
  // Ray casting algorithm
  let inside = false;
  
  for (let i = 0, j = validPolygon.length - 1; i < validPolygon.length; j = i++) {
    const xi = validPolygon[i].lng;
    const yi = validPolygon[i].lat;
    const xj = validPolygon[j].lng;
    const yj = validPolygon[j].lat;
    
    const intersect = ((yi > point.lat) !== (yj > point.lat)) &&
      (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
      
    if (intersect) inside = !inside;
  }
  
  return inside;
}

/**
 * Get distance to polygon edge
 * Negative if inside, positive if outside
 * @param {Object} position - {lat, lng} coordinates
 * @param {Array} polygon - Array of {lat, lng} coordinates
 * @returns {Number} Distance in meters
 */
export function getDistanceToBoundaryEdge(position, polygon) {
  // Validate inputs
  if (!position || !Array.isArray(polygon) || polygon.length < 3) {
    return Infinity;
  }
  
  if (!isValidCoordinate(position.lat, position.lng)) {
    console.warn('Invalid position coordinates provided to getDistanceToBoundaryEdge');
    return Infinity;
  }
  
  // Limit the number of polygon points for security
  const validPolygon = polygon.slice(0, MAX_POLYGON_POINTS).filter(
    p => isValidCoordinate(p?.lat, p?.lng)
  );
  
  if (validPolygon.length < 3) {
    console.warn('Not enough valid points to form a polygon');
    return Infinity;
  }
  
  // Check if point is inside polygon
  const isInside = isPointInPolygon(position, validPolygon);
  
  // Find nearest edge
  let minDistance = Infinity;
  
  for (let i = 0; i < validPolygon.length; i++) {
    const p1 = validPolygon[i];
    const p2 = validPolygon[(i + 1) % validPolygon.length];
    
    const distance = distanceToLine(
      position.lat, position.lng,
      p1.lat, p1.lng,
      p2.lat, p2.lng
    );
    
    minDistance = Math.min(minDistance, distance);
  }
  
  // Return negative if inside, positive if outside
  return isInside ? -minDistance : minDistance;
}

/**
 * Simplify a complex polygon by reducing the number of points
 * while maintaining the general shape
 * @param {Array} points - Array of {lat, lng} coordinates
 * @param {Number} tolerance - Distance tolerance for simplification
 * @returns {Array} Simplified array of coordinates
 */
export function simplifyPolygon(points, tolerance = DEFAULT_TOLERANCE) {
  // Validate inputs
  if (!Array.isArray(points) || points.length < 2) {
    return points || [];
  }
  
  // Ensure tolerance is positive
  const safeTolerance = Math.max(0.000001, tolerance);
  
  // Limit the number of points for security
  const validPoints = points.slice(0, MAX_POLYGON_POINTS).filter(
    p => isValidCoordinate(p?.lat, p?.lng)
  );
  
  if (validPoints.length <= 2) return validPoints;
  
  // Douglas-Peucker algorithm
  const findFurthestPoint = (start, end) => {
    let maxDistance = 0;
    let maxIndex = 0;
    
    for (let i = start + 1; i < end; i++) {
      const distance = distanceToLine(
        validPoints[i].lat, validPoints[i].lng,
        validPoints[start].lat, validPoints[start].lng,
        validPoints[end].lat, validPoints[end].lng
      );
      
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }
    
    return { maxDistance, maxIndex };
  };
  
  const simplifySegment = (start, end, result) => {
    const { maxDistance, maxIndex } = findFurthestPoint(start, end);
    
    if (maxDistance > safeTolerance) {
      // Recursively simplify the segments
      simplifySegment(start, maxIndex, result);
      simplifySegment(maxIndex, end, result);
    } else {
      if (!result.includes(validPoints[end])) {
        result.push(validPoints[end]);
      }
    }
  };
  
  const result = [validPoints[0]];
  simplifySegment(0, validPoints.length - 1, result);
  
  return result;
}

/**
 * Expand a polygon outward by a given distance
 * @param {Array} polygon - Array of {lat, lng} coordinates
 * @param {Number} distance - Distance in meters to expand
 * @returns {Array} Expanded polygon
 */
export function expandPolygon(polygon, distance) {
  // Validate inputs
  if (!Array.isArray(polygon) || polygon.length < 3 || typeof distance !== 'number') {
    return polygon || [];
  }
  
  // Ensure distance is within reasonable limits
  const safeDistance = Math.min(10000, Math.max(0, distance)); // Max 10km expansion
  
  // Limit the number of points for security
  const validPolygon = polygon.slice(0, MAX_POLYGON_POINTS).filter(
    p => isValidCoordinate(p?.lat, p?.lng)
  );
  
  if (validPolygon.length < 3) {
    console.warn('Not enough valid points to form a polygon');
    return validPolygon;
  }
  
  // Convert distance to approximate degrees
  // This is a simplified approach - actual implementation would use
  // a more complex algorithm for proper geodesic calculations
  const distanceDegrees = safeDistance / 111000; // 1 degree ≈ 111km at equator
  
  const center = calculatePolygonCenter(validPolygon);
  if (!center) return validPolygon;
  
  return validPolygon.map(point => {
    // Get vector from center to point
    const dx = point.lng - center.lng;
    const dy = point.lat - center.lat;
    
    // Normalize vector
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return point; // Avoid division by zero
    
    const nx = dx / length;
    const ny = dy / length;
    
    // Adjust expansion based on latitude (coordinates closer to poles are distorted)
    const latFactor = Math.cos(toRad(point.lat)) || 0.5; // Avoid division by zero
    const lngAdjustment = distanceDegrees / latFactor;
    
    // Return expanded point
    return {
      lat: point.lat + ny * distanceDegrees,
      lng: point.lng + nx * lngAdjustment
    };
  });
}

/**
 * Convert geographic coordinates to web mercator coordinates
 * Useful for flat map projections
 * @param {Number} lat - Latitude in degrees
 * @param {Number} lng - Longitude in degrees
 * @returns {Object} {x, y} coordinates in web mercator
 */
export function geoToMercator(lat, lng) {
  // Validate inputs
  if (!isValidCoordinate(lat, lng)) {
    console.warn('Invalid coordinates provided to geoToMercator');
    return { x: 0, y: 0 };
  }
  
  const x = lng * 20037508.34 / 180;
  let y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
  y = y * 20037508.34 / 180;
  
  return { x, y };
}

/**
 * Convert web mercator coordinates to geographic coordinates
 * @param {Number} x - X coordinate in web mercator
 * @param {Number} y - Y coordinate in web mercator
 * @returns {Object} {lat, lng} geographic coordinates
 */
export function mercatorToGeo(x, y) {
  // Validate inputs
  if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
    console.warn('Invalid coordinates provided to mercatorToGeo');
    return { lat: 0, lng: 0 };
  }
  
  const lng = x * 180 / 20037508.34;
  let lat = y * 180 / 20037508.34;
  lat = 180 / Math.PI * (2 * Math.atan(Math.exp(lat * Math.PI / 180)) - Math.PI / 2);
  
  // Ensure output is within valid range
  lat = Math.max(-90, Math.min(90, lat));
  lng = Math.max(-180, Math.min(180, lng));
  
  return { lat, lng };
}

// Export all functions as a default object
export default {
  isValidCoordinate,
  calculateDistance,
  toRad,
  toDeg,
  distanceToLine,
  calculatePolygonCenter,
  isPointInPolygon,
  getDistanceToBoundaryEdge,
  simplifyPolygon,
  expandPolygon,
  geoToMercator,
  mercatorToGeo
};