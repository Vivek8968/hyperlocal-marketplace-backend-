/**
 * Geospatial utility functions
 */

/**
 * Calculate bounding box around a point
 * @param {Number} latitude - Center latitude
 * @param {Number} longitude - Center longitude
 * @param {Number} radiusInKm - Radius in kilometers
 * @returns {Object} - Bounding box coordinates
 */
const calculateBoundingBox = (latitude, longitude, radiusInKm) => {
  // Earth's radius in kilometers
  const EARTH_RADIUS = 6371;
  
  // Convert latitude and longitude from degrees to radians
  const lat = latitude * (Math.PI / 180);
  const lon = longitude * (Math.PI / 180);
  
  // Angular distance in radians
  const angularDistance = radiusInKm / EARTH_RADIUS;
  
  // Calculate min and max latitudes
  let minLat = lat - angularDistance;
  let maxLat = lat + angularDistance;
  
  // Calculate min and max longitudes
  let minLon, maxLon;
  
  // Handle pole cases
  if (minLat > -Math.PI / 2 && maxLat < Math.PI / 2) {
    const deltaLon = Math.asin(Math.sin(angularDistance) / Math.cos(lat));
    minLon = lon - deltaLon;
    maxLon = lon + deltaLon;
    
    if (minLon < -Math.PI) {
      minLon += 2 * Math.PI;
    }
    if (maxLon > Math.PI) {
      maxLon -= 2 * Math.PI;
    }
  } else {
    // Near the poles, latitude covers the full range
    minLat = Math.max(minLat, -Math.PI / 2);
    maxLat = Math.min(maxLat, Math.PI / 2);
    minLon = -Math.PI;
    maxLon = Math.PI;
  }
  
  // Convert back to degrees
  return {
    minLat: minLat * (180 / Math.PI),
    maxLat: maxLat * (180 / Math.PI),
    minLon: minLon * (180 / Math.PI),
    maxLon: maxLon * (180 / Math.PI)
  };
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Number} lat1 - Latitude of first point
 * @param {Number} lon1 - Longitude of first point
 * @param {Number} lat2 - Latitude of second point
 * @param {Number} lon2 - Longitude of second point
 * @returns {Number} - Distance in kilometers
 */
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  // Earth's radius in kilometers
  const EARTH_RADIUS = 6371;
  
  // Convert latitude and longitude from degrees to radians
  const lat1Rad = lat1 * (Math.PI / 180);
  const lon1Rad = lon1 * (Math.PI / 180);
  const lat2Rad = lat2 * (Math.PI / 180);
  const lon2Rad = lon2 * (Math.PI / 180);
  
  // Haversine formula
  const dLat = lat2Rad - lat1Rad;
  const dLon = lon2Rad - lon1Rad;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return EARTH_RADIUS * c;
};

/**
 * Convert degrees to radians
 * @param {Number} degrees - Angle in degrees
 * @returns {Number} - Angle in radians
 */
const degreesToRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Convert radians to degrees
 * @param {Number} radians - Angle in radians
 * @returns {Number} - Angle in degrees
 */
const radiansToDegrees = (radians) => {
  return radians * (180 / Math.PI);
};

/**
 * Calculate destination point given a starting point, bearing and distance
 * @param {Number} latitude - Starting latitude
 * @param {Number} longitude - Starting longitude
 * @param {Number} bearing - Bearing in degrees (0 = north, 90 = east, etc.)
 * @param {Number} distanceInKm - Distance in kilometers
 * @returns {Object} - Destination coordinates
 */
const destinationPoint = (latitude, longitude, bearing, distanceInKm) => {
  // Earth's radius in kilometers
  const EARTH_RADIUS = 6371;
  
  // Convert to radians
  const lat1 = degreesToRadians(latitude);
  const lon1 = degreesToRadians(longitude);
  const brng = degreesToRadians(bearing);
  
  // Do the math
  const angularDistance = distanceInKm / EARTH_RADIUS;
  
  let lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
    Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(brng)
  );
  
  let lon2 = lon1 + Math.atan2(
    Math.sin(brng) * Math.sin(angularDistance) * Math.cos(lat1),
    Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
  );
  
  // Normalize longitude to -180 to +180
  lon2 = ((lon2 + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
  
  return {
    latitude: radiansToDegrees(lat2),
    longitude: radiansToDegrees(lon2)
  };
};

/**
 * Calculate bearing between two points
 * @param {Number} lat1 - Latitude of first point
 * @param {Number} lon1 - Longitude of first point
 * @param {Number} lat2 - Latitude of second point
 * @param {Number} lon2 - Longitude of second point
 * @returns {Number} - Bearing in degrees (0-360)
 */
const calculateBearing = (lat1, lon1, lat2, lon2) => {
  // Convert to radians
  const lat1Rad = degreesToRadians(lat1);
  const lon1Rad = degreesToRadians(lon1);
  const lat2Rad = degreesToRadians(lat2);
  const lon2Rad = degreesToRadians(lon2);
  
  const y = Math.sin(lon2Rad - lon1Rad) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
           Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(lon2Rad - lon1Rad);
  
  let brng = Math.atan2(y, x);
  brng = radiansToDegrees(brng);
  
  // Normalize to 0-360
  return (brng + 360) % 360;
};

/**
 * Check if point is inside polygon
 * @param {Array} point - [longitude, latitude]
 * @param {Array} polygon - Array of [longitude, latitude] coordinates
 * @returns {Boolean} - Whether point is inside polygon
 */
const pointInPolygon = (point, polygon) => {
  // Ray casting algorithm
  const x = point[0];
  const y = point[1];
  
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    
    const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  
  return inside;
};

/**
 * Create MongoDB geospatial query for finding points within radius
 * @param {Number} latitude - Center latitude
 * @param {Number} longitude - Center longitude
 * @param {Number} radiusInMeters - Radius in meters
 * @returns {Object} - MongoDB query
 */
const createGeoWithinQuery = (latitude, longitude, radiusInMeters) => {
  return {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: radiusInMeters
      }
    }
  };
};

/**
 * Format coordinate for display
 * @param {Number} coordinate - Latitude or longitude
 * @param {String} type - 'lat' or 'lng'
 * @returns {String} - Formatted coordinate
 */
const formatCoordinate = (coordinate, type) => {
  const absolute = Math.abs(coordinate);
  const degrees = Math.floor(absolute);
  const minutes = Math.floor((absolute - degrees) * 60);
  const seconds = ((absolute - degrees) * 60 - minutes) * 60;
  
  const direction = type === 'lat'
    ? (coordinate >= 0 ? 'N' : 'S')
    : (coordinate >= 0 ? 'E' : 'W');
  
  return `${degrees}° ${minutes}' ${seconds.toFixed(2)}" ${direction}`;
};

module.exports = {
  calculateBoundingBox,
  haversineDistance,
  degreesToRadians,
  radiansToDegrees,
  destinationPoint,
  calculateBearing,
  pointInPolygon,
  createGeoWithinQuery,
