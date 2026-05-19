/**
 * Google Maps Distance Matrix API Service
 * 
 * This module provides utilities for calculating distances and travel times
 * between origins and destinations using Google Maps Distance Matrix API.
 */

// Types for Distance Matrix API responses
export interface DistanceMatrixElement {
  status: string;
  duration: {
    text: string;
    value: number; // in seconds
  };
  duration_in_traffic?: {
    text: string;
    value: number; // in seconds
  };
  distance: {
    text: string;
    value: number; // in meters
  };
}

export interface DistanceMatrixRow {
  elements: DistanceMatrixElement[];
}

export interface DistanceMatrixResponse {
  status: string;
  origin_addresses: string[];
  destination_addresses: string[];
  rows: DistanceMatrixRow[];
  error_message?: string;
}

/**
 * Calculate travel times and distances between origins and destinations
 * 
 * @param origins Array of origin locations (coordinates or addresses)
 * @param destinations Array of destination locations (coordinates or addresses)
 * @param travelMode Travel mode (driving, walking, bicycling, transit)
 * @param departureTime Optional departure time for traffic consideration
 * @returns Promise with distance matrix response
 */
export async function getDistanceMatrix(
  origins: Array<{ lat: number; lng: number } | string>,
  destinations: Array<{ lat: number; lng: number } | string>,
  travelMode: string = 'driving',
  departureTime?: number // timestamp in seconds
): Promise<DistanceMatrixResponse | null> {
  try {
    // Validate inputs
    if (!origins.length || !destinations.length) {
      console.error('Distance Matrix API: Origins and destinations cannot be empty');
      return null;
    }
    
    // Build request parameters
    const params = new URLSearchParams();
    
    // Format origins
    const originsParam = origins.map(origin => {
      if (typeof origin === 'string') {
        return origin;
      } else {
        return `${origin.lat},${origin.lng}`;
      }
    }).join('|');
    params.append('origins', originsParam);
    
    // Format destinations
    const destinationsParam = destinations.map(destination => {
      if (typeof destination === 'string') {
        return destination;
      } else {
        return `${destination.lat},${destination.lng}`;
      }
    }).join('|');
    params.append('destinations', destinationsParam);
    
    // Add travel mode
    params.append('mode', travelMode.toLowerCase());
    
    // Add departure time if provided
    if (departureTime) {
      params.append('departure_time', departureTime.toString());
    }
    
    // Make API request through our server proxy to protect API key
    const response = await fetch(`/api/google/distance-matrix?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Distance Matrix API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK') {
      console.warn(`Distance Matrix API returned status: ${data.status}`);
      if (data.error_message) {
        console.error(`Error message: ${data.error_message}`);
      }
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error calculating distance matrix:', error);
    return null;
  }
}

/**
 * Find the nearest locations based on travel time
 * 
 * @param userLocation User's current location
 * @param destinations Array of potential destinations
 * @param travelMode Travel mode (driving, walking, bicycling, transit)
 * @param limit Maximum number of results to return
 * @returns Promise with sorted locations by travel time
 */
export async function findNearestByTravelTime(
  userLocation: { lat: number; lng: number },
  destinations: Array<{ lat: number; lng: number; id: number | string; name: string }>,
  travelMode: string = 'driving',
  limit: number = 5
): Promise<Array<{
  id: number | string;
  name: string;
  location: { lat: number; lng: number };
  distance: { text: string; value: number };
  duration: { text: string; value: number };
}>> {
  try {
    if (!destinations.length) {
      return [];
    }
    
    // Calculate distance matrix
    const matrix = await getDistanceMatrix(
      [userLocation],
      destinations.map(dest => ({ lat: dest.lat, lng: dest.lng })),
      travelMode
    );
    
    if (!matrix || !matrix.rows || !matrix.rows[0] || !matrix.rows[0].elements) {
      return [];
    }
    
    // Map distance matrix elements to locations
    const result = destinations.map((destination, index) => {
      const element = matrix.rows[0].elements[index];
      
      if (element.status !== 'OK') {
        return null;
      }
      
      return {
        id: destination.id,
        name: destination.name,
        location: { lat: destination.lat, lng: destination.lng },
        distance: element.distance,
        duration: element.duration
      };
    }).filter(item => item !== null) as Array<{
      id: number | string;
      name: string;
      location: { lat: number; lng: number };
      distance: { text: string; value: number };
      duration: { text: string; value: number };
    }>;
    
    // Sort by travel time (duration)
    result.sort((a, b) => a.duration.value - b.duration.value);
    
    // Limit results if needed
    return limit > 0 ? result.slice(0, limit) : result;
  } catch (error) {
    console.error('Error finding nearest locations by travel time:', error);
    return [];
  }
}

/**
 * Calculate combined travel time + charging time optimization
 * 
 * @param userLocation User's current location
 * @param chargingStations Array of charging stations
 * @param chargingRateKwh Charging rate in kWh
 * @param batteryCapacityKwh Battery capacity in kWh
 * @param currentChargePercent Current battery charge (0-100)
 * @param targetChargePercent Target battery charge (0-100)
 * @returns Promise with stations sorted by total time (travel + charging)
 */
export async function optimizeChargingStations(
  userLocation: { lat: number; lng: number },
  chargingStations: Array<{
    id: number | string;
    name: string;
    location: { lat: number; lng: number };
    powerKw: number;
  }>,
  batteryCapacityKwh: number,
  currentChargePercent: number,
  targetChargePercent: number = 80
): Promise<Array<{
  id: number | string;
  name: string;
  location: { lat: number; lng: number };
  travelTime: { text: string; value: number };
  chargingTime: { text: string; value: number };
  totalTime: { text: string; value: number };
  powerKw: number;
  distanceKm: number;
}>> {
  try {
    if (!chargingStations.length) {
      return [];
    }
    
    // Calculate distance matrix
    const matrix = await getDistanceMatrix(
      [userLocation],
      chargingStations.map(station => station.location),
      'driving'
    );
    
    if (!matrix || !matrix.rows || !matrix.rows[0] || !matrix.rows[0].elements) {
      return [];
    }
    
    // Calculate charging time for each station
    const result = chargingStations.map((station, index) => {
      const element = matrix.rows[0].elements[index];
      
      if (element.status !== 'OK') {
        return null;
      }
      
      // Calculate energy needed in kWh
      const energyNeeded = batteryCapacityKwh * (targetChargePercent - currentChargePercent) / 100;
      
      // Calculate charging time in seconds
      const chargingTimeSeconds = (energyNeeded / station.powerKw) * 3600;
      
      // Format charging time as text (e.g., "35 mins")
      let chargingTimeText = '';
      if (chargingTimeSeconds < 60) {
        chargingTimeText = `${Math.round(chargingTimeSeconds)} secs`;
      } else if (chargingTimeSeconds < 3600) {
        chargingTimeText = `${Math.round(chargingTimeSeconds / 60)} mins`;
      } else {
        const hours = Math.floor(chargingTimeSeconds / 3600);
        const minutes = Math.round((chargingTimeSeconds % 3600) / 60);
        chargingTimeText = `${hours} hr${hours !== 1 ? 's' : ''} ${minutes} min${minutes !== 1 ? 's' : ''}`;
      }
      
      // Calculate total time (travel + charging)
      const totalTimeSeconds = element.duration.value + chargingTimeSeconds;
      
      // Format total time as text
      let totalTimeText = '';
      if (totalTimeSeconds < 60) {
        totalTimeText = `${Math.round(totalTimeSeconds)} secs`;
      } else if (totalTimeSeconds < 3600) {
        totalTimeText = `${Math.round(totalTimeSeconds / 60)} mins`;
      } else {
        const hours = Math.floor(totalTimeSeconds / 3600);
        const minutes = Math.round((totalTimeSeconds % 3600) / 60);
        totalTimeText = `${hours} hr${hours !== 1 ? 's' : ''} ${minutes} min${minutes !== 1 ? 's' : ''}`;
      }
      
      return {
        id: station.id,
        name: station.name,
        location: station.location,
        powerKw: station.powerKw,
        travelTime: element.duration,
        chargingTime: {
          text: chargingTimeText,
          value: Math.round(chargingTimeSeconds)
        },
        totalTime: {
          text: totalTimeText,
          value: Math.round(totalTimeSeconds)
        },
        distanceKm: element.distance.value / 1000 // Convert meters to kilometers
      };
    }).filter(item => item !== null) as Array<{
      id: number | string;
      name: string;
      location: { lat: number; lng: number };
      travelTime: { text: string; value: number };
      chargingTime: { text: string; value: number };
      totalTime: { text: string; value: number };
      powerKw: number;
      distanceKm: number;
    }>;
    
    // Sort by total time (travel + charging)
    result.sort((a, b) => a.totalTime.value - b.totalTime.value);
    
    return result;
  } catch (error) {
    console.error('Error optimizing charging stations:', error);
    return [];
  }
}