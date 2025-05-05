const geolib = require('geolib');
const axios = require('axios');
const { GOOGLE_MAPS_API_KEY } = process.env;
const { calculateBoundingBox } = require('../utils/geo');

class LocationService {
  /**
   * Calculate distance between two coordinates in meters
   * @param {Number} lat1 - Latitude of first point
   * @param {Number} lon1 - Longitude of first point
   * @param {Number} lat2 - Latitude of second point
   * @param {Number} lon2 - Longitude of second point
   * @returns {Number} - Distance in meters
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    try {
      return geolib.getDistance(
        { latitude: lat1, longitude: lon1 },
        { latitude: lat2, longitude: lon2 }
      );
    } catch (error) {
      console.error('Error calculating distance:', error);
      return 0;
    }
  }

  /**
   * Calculate bounding box around a point
   * @param {Number} latitude - Center latitude
   * @param {Number} longitude - Center longitude
   * @param {Number} radiusInKm - Radius in kilometers
   * @returns {Object} - Bounding box coordinates
   */
  getBoundingBox(latitude, longitude, radiusInKm) {
    return calculateBoundingBox(latitude, longitude, radiusInKm);
  }

  /**
   * Geocode an address to coordinates
   * @param {String} address - Address to geocode
   * @returns {Object} - Coordinates and address components
   */
  async geocodeAddress(address) {
    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
          address,
          key: GOOGLE_MAPS_API_KEY
        }
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Geocoding failed: ${response.data.status}`);
      }

      const result = response.data.results[0];
      const { lat, lng } = result.geometry.location;

      // Extract address components
      const addressComponents = {};
      result.address_components.forEach(component => {
        component.types.forEach(type => {
          addressComponents[type] = component.long_name;
        });
      });

      return {
        latitude: lat,
        longitude: lng,
        formattedAddress: result.formatted_address,
        addressComponents
      };
    } catch (error) {
      throw new Error(`Geocoding failed: ${error.message}`);
    }
  }

  /**
   * Reverse geocode coordinates to address
   * @param {Number} latitude - Latitude
   * @param {Number} longitude - Longitude
   * @returns {Object} - Address and address components
   */
  async reverseGeocode(latitude, longitude) {
    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
          latlng: `${latitude},${longitude}`,
          key: GOOGLE_MAPS_API_KEY
        }
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Reverse geocoding failed: ${response.data.status}`);
      }

      const result = response.data.results[0];

      // Extract address components
      const addressComponents = {};
      result.address_components.forEach(component => {
        component.types.forEach(type => {
          addressComponents[type] = component.long_name;
        });
      });

      return {
        formattedAddress: result.formatted_address,
        addressComponents
      };
    } catch (error) {
      throw new Error(`Reverse geocoding failed: ${error.message}`);
    }
  }

  /**
   * Get places nearby a location
   * @param {Number} latitude - Latitude
   * @param {Number} longitude - Longitude
   * @param {Number} radius - Radius in meters
   * @param {String} type - Place type
   * @returns {Array} - Array of nearby places
   */
  async getNearbyPlaces(latitude, longitude, radius = 1000, type = null) {
    try {
      const params = {
        location: `${latitude},${longitude}`,
        radius,
        key: GOOGLE_MAPS_API_KEY
      };

      if (type) {
        params.type = type;
      }

      const response = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
        params
      });

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        throw new Error(`Nearby places search failed: ${response.data.status}`);
      }

      return response.data.results.map(place => ({
        id: place.place_id,
        name: place.name,
        address: place.vicinity,
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        types: place.types,
        rating: place.rating,
        userRatingsTotal: place.user_ratings_total
      }));
    } catch (error) {
      throw new Error(`Nearby places search failed: ${error.message}`);
    }
  }

  /**
   * Check if a point is within a specified distance of another point
   * @param {Number} lat1 - Latitude of first point
   * @param {Number} lon1 - Longitude of first point
   * @param {Number} lat2 - Latitude of second point
   * @param {Number} lon2 - Longitude of second point
   * @param {Number} distanceInMeters - Maximum distance in meters
   * @returns {Boolean} - Whether point is within distance
   */
  isWithinDistance(lat1, lon1, lat2, lon2, distanceInMeters) {
    try {
      const distance = this.calculateDistance(lat1, lon1, lat2, lon2);
      return distance <= distanceInMeters;
    } catch (error) {
      console.error('Error checking distance:', error);
      return false;
    }
  }
}

module.exports = new LocationService();

