/**
 * Google Maps Services Integration
 * 
 * This module provides utilities for interacting with Google Maps API services
 * including Geocoding, Directions, Places, and more.
 */

// Geocoding types
interface GeocodingResult {
  address: string;
  formattedAddress: string;
  placeId: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  landmark?: string;
  neighborhood?: string;
}

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

// Directions types
interface DirectionsRouteStep {
  distance: {
    text: string;
    value: number; // in meters
  };
  duration: {
    text: string;
    value: number; // in seconds
  };
  endLocation: {
    lat: number;
    lng: number;
  };
  startLocation: {
    lat: number;
    lng: number;
  };
  htmlInstructions: string;
  maneuver?: string;
  travelMode: string;
}

interface DirectionsRoute {
  summary: string;
  distance: {
    text: string;
    value: number; // in meters
  };
  duration: {
    text: string;
    value: number; // in seconds
  };
  steps: DirectionsRouteStep[];
  startAddress: string;
  endAddress: string;
  startLocation: {
    lat: number;
    lng: number;
  };
  endLocation: {
    lat: number;
    lng: number;
  };
  waypoints?: Array<{
    location: {
      lat: number;
      lng: number;
    };
    stopover: boolean;
  }>;
}

interface DirectionsResponse {
  routes: DirectionsRoute[];
  status: string;
}

/**
 * Forward geocoding - Converting address to coordinates
 * 
 * @param address The address to geocode
 * @returns Promise with the geocoding result
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  try {
    const response = await fetch(`/api/google/geocode?address=${encodeURIComponent(address)}`);
    
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.warn(`Geocoding API returned status: ${data.status}`);
      if (data.error_message) {
        console.error(`Error message: ${data.error_message}`);
      }
      return null;
    }
    
    const result = data.results[0];
    const components = result.address_components;
    const addressComponents: {[key: string]: string} = {};
    
    // Extract address components
    components.forEach((component: AddressComponent) => {
      if (component.types.includes('locality') || component.types.includes('administrative_area_level_2')) {
        addressComponents.city = component.long_name;
      } else if (component.types.includes('administrative_area_level_1')) {
        addressComponents.state = component.long_name;
      } else if (component.types.includes('country')) {
        addressComponents.country = component.long_name;
      } else if (component.types.includes('postal_code')) {
        addressComponents.postalCode = component.long_name;
      } else if (component.types.includes('point_of_interest') || component.types.includes('establishment')) {
        addressComponents.landmark = component.long_name;
      } else if (component.types.includes('neighborhood')) {
        addressComponents.neighborhood = component.long_name;
      }
    });
    
    return {
      address: result.formatted_address,
      formattedAddress: result.formatted_address,
      placeId: result.place_id,
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      city: addressComponents.city || '',
      state: addressComponents.state || '',
      country: addressComponents.country || '',
      postalCode: addressComponents.postalCode || '',
      landmark: addressComponents.landmark,
      neighborhood: addressComponents.neighborhood
    };
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}

/**
 * Reverse geocoding - Converting coordinates to address
 * 
 * @param latitude Latitude coordinate
 * @param longitude Longitude coordinate
 * @returns Promise with the reverse geocoding result
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<GeocodingResult | null> {
  try {
    const response = await fetch(`/api/google/reverse-geocode?lat=${latitude}&lng=${longitude}`);
    
    if (!response.ok) {
      throw new Error(`Reverse Geocoding API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.warn(`Reverse Geocoding API returned status: ${data.status}`);
      if (data.error_message) {
        console.error(`Error message: ${data.error_message}`);
      }
      return null;
    }
    
    const result = data.results[0];
    const components = result.address_components;
    const addressComponents: {[key: string]: string} = {};
    
    // Extract address components
    components.forEach((component: AddressComponent) => {
      if (component.types.includes('locality') || component.types.includes('administrative_area_level_2')) {
        addressComponents.city = component.long_name;
      } else if (component.types.includes('administrative_area_level_1')) {
        addressComponents.state = component.long_name;
      } else if (component.types.includes('country')) {
        addressComponents.country = component.long_name;
      } else if (component.types.includes('postal_code')) {
        addressComponents.postalCode = component.long_name;
      } else if (component.types.includes('point_of_interest') || component.types.includes('establishment')) {
        addressComponents.landmark = component.long_name;
      } else if (component.types.includes('neighborhood')) {
        addressComponents.neighborhood = component.long_name;
      }
    });
    
    return {
      address: result.formatted_address,
      formattedAddress: result.formatted_address,
      placeId: result.place_id,
      latitude: latitude,
      longitude: longitude,
      city: addressComponents.city || '',
      state: addressComponents.state || '',
      country: addressComponents.country || '',
      postalCode: addressComponents.postalCode || '',
      landmark: addressComponents.landmark,
      neighborhood: addressComponents.neighborhood
    };
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return null;
  }
}

/**
 * Search for nearby landmarks or points of interest
 * 
 * @param latitude Latitude coordinate of the center
 * @param longitude Longitude coordinate of the center
 * @param radius Search radius in meters
 * @param types Optional array of place types to filter by
 * @returns Promise with array of nearby landmarks
 */
export async function searchNearbyLandmarks(
  latitude: number,
  longitude: number,
  radius: number = 1000,
  types: string[] = []
): Promise<any[]> {
  try {
    let url = `/api/google/charging-stations?latitude=${latitude}&longitude=${longitude}&radius=${radius}`;
    
    if (types && types.length > 0) {
      url += `&types=${types.join(',')}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Places API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error searching nearby landmarks:', error);
    return [];
  }
}

/**
 * Get detailed information about a landmark or point of interest
 * 
 * @param placeId The Google Place ID
 * @returns Promise with detailed place information
 */
export async function getLandmarkDetails(placeId: string): Promise<any | null> {
  try {
    // TODO: Implement once we have an API endpoint for place details
    console.warn('getLandmarkDetails is not yet implemented');
    return null;
  } catch (error) {
    console.error('Error getting landmark details:', error);
    return null;
  }
}

/**
 * Search for places by keyword or text query
 * 
 * @param query The search query
 * @param latitude Optional latitude for location-based search
 * @param longitude Optional longitude for location-based search
 * @param radius Optional radius in meters for location-based search
 * @returns Promise with array of search results
 */
export async function searchPlaces(
  query: string,
  latitude?: number,
  longitude?: number,
  radius: number = 5000
): Promise<any[]> {
  try {
    let url = `/api/locations?query=${encodeURIComponent(query)}`;
    
    if (latitude !== undefined && longitude !== undefined) {
      url += `&latitude=${latitude}&longitude=${longitude}&radius=${radius}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Search API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error searching places:', error);
    return [];
  }
}