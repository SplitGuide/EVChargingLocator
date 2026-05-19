/**
 * Google Maps Directions API Service
 * 
 * This module provides utilities for working with Google Maps Directions API
 * to enable turn-by-turn navigation and route planning for EV charging.
 */

// Types for Directions API response
export interface DirectionsLeg {
  start_address: string;
  end_address: string;
  start_location: { lat: number; lng: number };
  end_location: { lat: number; lng: number };
  steps: DirectionsStep[];
  distance: { text: string; value: number }; // value in meters
  duration: { text: string; value: number }; // value in seconds
}

export interface DirectionsStep {
  html_instructions: string;
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  start_location: { lat: number; lng: number };
  end_location: { lat: number; lng: number };
  travel_mode: string;
  maneuver?: string;
}

export interface DirectionsRoute {
  legs: DirectionsLeg[];
  overview_polyline: { points: string };
  summary: string;
  warnings: string[];
  bounds: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
  copyrights: string;
}

export interface DirectionsResponse {
  routes: DirectionsRoute[];
  status: string;
  error_message?: string;
  geocoded_waypoints: Array<{
    geocoder_status: string;
    place_id: string;
    types: string[];
  }>;
}

export interface WaypointLocation {
  lat: number;
  lng: number;
  stopover?: boolean;
  name?: string;
}

/**
 * Get directions from origin to destination
 * 
 * @param origin Starting location coordinates {lat, lng} or address string
 * @param destination Ending location coordinates {lat, lng} or address string
 * @param waypoints Optional array of waypoints to include in the route
 * @param travelMode Travel mode (DRIVING, BICYCLING, TRANSIT, WALKING)
 * @returns Promise with directions result
 */
export async function getDirections(
  origin: { lat: number; lng: number } | string,
  destination: { lat: number; lng: number } | string,
  waypoints: WaypointLocation[] = [],
  travelMode: string = 'DRIVING'
): Promise<DirectionsResponse | null> {
  try {
    // Build request params
    const params = new URLSearchParams();
    
    // Format origin
    if (typeof origin === 'string') {
      params.append('origin', origin);
    } else {
      params.append('origin', `${origin.lat},${origin.lng}`);
    }
    
    // Format destination
    if (typeof destination === 'string') {
      params.append('destination', destination);
    } else {
      params.append('destination', `${destination.lat},${destination.lng}`);
    }
    
    // Format waypoints if provided
    if (waypoints.length > 0) {
      const waypointsStr = waypoints.map(wp => {
        const location = `${wp.lat},${wp.lng}`;
        return wp.stopover === false ? `via:${location}` : location;
      }).join('|');
      
      params.append('waypoints', waypointsStr);
    }
    
    // Add travel mode
    params.append('mode', travelMode.toLowerCase());
    
    // Make API request through our server proxy to protect API key
    const response = await fetch(`/api/google/directions?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Directions API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK') {
      console.warn(`Directions API returned status: ${data.status}`);
      if (data.error_message) {
        console.error(`Error message: ${data.error_message}`);
      }
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching directions:', error);
    return null;
  }
}

/**
 * Get optimized route between origin and destination, considering multiple stops
 * 
 * @param origin Starting location coordinates {lat, lng} or address string
 * @param destination Ending location coordinates {lat, lng} or address string
 * @param waypoints Array of waypoints to include in the route
 * @param optimizeWaypoints Whether to optimize the waypoint order (default: true)
 * @param travelMode Travel mode (DRIVING, BICYCLING, TRANSIT, WALKING)
 * @returns Promise with optimized directions result
 */
export async function getOptimizedRoute(
  origin: { lat: number; lng: number } | string,
  destination: { lat: number; lng: number } | string,
  waypoints: WaypointLocation[],
  optimizeWaypoints: boolean = true,
  travelMode: string = 'DRIVING'
): Promise<DirectionsResponse | null> {
  try {
    // Build request params
    const params = new URLSearchParams();
    
    // Format origin
    if (typeof origin === 'string') {
      params.append('origin', origin);
    } else {
      params.append('origin', `${origin.lat},${origin.lng}`);
    }
    
    // Format destination
    if (typeof destination === 'string') {
      params.append('destination', destination);
    } else {
      params.append('destination', `${destination.lat},${destination.lng}`);
    }
    
    // Format waypoints if provided
    if (waypoints.length > 0) {
      const waypointsStr = waypoints.map(wp => {
        const location = `${wp.lat},${wp.lng}`;
        return wp.stopover === false ? `via:${location}` : location;
      }).join('|');
      
      params.append('waypoints', optimizeWaypoints ? `optimize:true|${waypointsStr}` : waypointsStr);
    }
    
    // Add travel mode
    params.append('mode', travelMode.toLowerCase());
    
    // Make API request through our server proxy to protect API key
    const response = await fetch(`/api/google/directions?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Directions API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK') {
      console.warn(`Directions API returned status: ${data.status}`);
      if (data.error_message) {
        console.error(`Error message: ${data.error_message}`);
      }
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching optimized route:', error);
    return null;
  }
}

/**
 * Calculate EV-specific route with charging stops
 * 
 * @param origin Starting location
 * @param destination Ending location
 * @param vehicleRange Vehicle range in kilometers
 * @param currentBatteryPercent Current battery percentage (0-100)
 * @param chargingLocations Array of available charging locations
 * @returns Promise with route including charging stops
 */
export async function calculateEVRoute(
  origin: { lat: number; lng: number } | string,
  destination: { lat: number; lng: number } | string,
  vehicleRange: number, // in kilometers
  currentBatteryPercent: number, // 0-100
  chargingLocations: Array<{ lat: number; lng: number; name: string }>
): Promise<{
  route: DirectionsResponse | null;
  chargingStops: Array<{ location: { lat: number; lng: number }; name: string }>;
}> {
  try {
    // Convert vehicle range to meters
    const rangeInMeters = vehicleRange * 1000;
    
    // Calculate current range based on battery percentage
    const currentRangeInMeters = rangeInMeters * (currentBatteryPercent / 100);
    
    // Get direct route first to see total distance
    const directRoute = await getDirections(origin, destination);
    
    if (!directRoute || !directRoute.routes || directRoute.routes.length === 0) {
      throw new Error('Could not calculate direct route');
    }
    
    // Calculate total distance of direct route
    const totalDistanceInMeters = directRoute.routes[0].legs.reduce(
      (sum, leg) => sum + leg.distance.value, 0
    );
    
    // If we can make it on current charge, return direct route
    if (currentRangeInMeters >= totalDistanceInMeters) {
      return {
        route: directRoute,
        chargingStops: []
      };
    }
    
    // We need charging stops - calculate potential stops
    const chargingStops: Array<{ location: { lat: number; lng: number }; name: string }> = [];
    let remainingRangeInMeters = currentRangeInMeters;
    let currentPosition = typeof origin === 'string' 
      ? directRoute.routes[0].legs[0].start_location 
      : origin;
    
    const routePoints = [
      currentPosition
    ];
    
    // Extract all points along the route
    let allRoutePoints: Array<{ lat: number; lng: number }> = [];
    directRoute.routes[0].legs.forEach(leg => {
      leg.steps.forEach(step => {
        allRoutePoints.push(step.start_location);
        allRoutePoints.push(step.end_location);
      });
    });
    
    // Remove duplicates
    allRoutePoints = allRoutePoints.filter((point, index, self) =>
      index === self.findIndex(p => p.lat === point.lat && p.lng === point.lng)
    );
    
    // Find charging stops along route
    for (let i = 0; i < allRoutePoints.length; i++) {
      const point = allRoutePoints[i];
      
      // Calculate distance from current position to this point
      const pointRoute = await getDirections(
        { lat: currentPosition.lat, lng: currentPosition.lng },
        { lat: point.lat, lng: point.lng }
      );
      
      if (!pointRoute || !pointRoute.routes || pointRoute.routes.length === 0) {
        continue;
      }
      
      const distanceToPoint = pointRoute.routes[0].legs[0].distance.value;
      
      // If we can't reach this point, we need to find a charging station before it
      if (distanceToPoint > remainingRangeInMeters) {
        // Find nearest charging station to current position
        const nearestStation = findNearestChargingStation(
          currentPosition,
          chargingLocations
        );
        
        if (!nearestStation) {
          continue; // No nearby charging station found
        }
        
        // Add charging station as waypoint
        chargingStops.push({
          location: { lat: nearestStation.lat, lng: nearestStation.lng },
          name: nearestStation.name
        });
        
        routePoints.push({ lat: nearestStation.lat, lng: nearestStation.lng });
        
        // Update current position and reset range (assuming full charge)
        currentPosition = { lat: nearestStation.lat, lng: nearestStation.lng };
        remainingRangeInMeters = rangeInMeters;
      } else {
        // Update remaining range
        remainingRangeInMeters -= distanceToPoint;
        currentPosition = point;
      }
    }
    
    // Add destination to route points
    routePoints.push(
      typeof destination === 'string' 
        ? directRoute.routes[0].legs[directRoute.routes[0].legs.length - 1].end_location 
        : destination
    );
    
    // Calculate final route with all charging stops
    const waypoints = routePoints.slice(1, -1).map(point => ({
      lat: point.lat,
      lng: point.lng,
      stopover: true
    }));
    
    const finalRoute = await getOptimizedRoute(
      routePoints[0],
      routePoints[routePoints.length - 1],
      waypoints,
      false // Don't optimize order, we calculated them in order
    );
    
    return {
      route: finalRoute,
      chargingStops
    };
  } catch (error) {
    console.error('Error calculating EV route:', error);
    return {
      route: null,
      chargingStops: []
    };
  }
}

/**
 * Find the nearest charging station to a given location
 * 
 * @param location Current location
 * @param chargingLocations Array of charging station locations
 * @returns Nearest charging station or null
 */
function findNearestChargingStation(
  location: { lat: number; lng: number },
  chargingLocations: Array<{ lat: number; lng: number; name: string }>
): { lat: number; lng: number; name: string } | null {
  if (!chargingLocations || chargingLocations.length === 0) {
    return null;
  }
  
  // Calculate distances to all charging stations
  const stationsWithDistances = chargingLocations.map(station => ({
    ...station,
    distance: calculateHaversineDistance(
      location.lat, location.lng,
      station.lat, station.lng
    )
  }));
  
  // Sort by distance
  stationsWithDistances.sort((a, b) => a.distance - b.distance);
  
  // Return nearest station
  return stationsWithDistances[0];
}

/**
 * Calculate distance between two points using Haversine formula
 * 
 * @param lat1 Latitude of first point
 * @param lng1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lng2 Longitude of second point
 * @returns Distance in meters
 */
function calculateHaversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  // Earth's radius in meters
  const R = 6371000;
  
  // Convert latitude and longitude from degrees to radians
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  
  // Haversine formula
  const a = 
    Math.sin(Δφ/2) * Math.sin(Δφ/2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ/2) * Math.sin(Δλ/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  // Distance in meters
  return R * c;
}

/**
 * Parse text instructions to plain text by removing HTML tags
 * 
 * @param htmlInstructions HTML instructions from Google Maps API
 * @returns Plain text instructions
 */
export function parseTextInstructions(htmlInstructions: string): string {
  return htmlInstructions
    .replace(/<\/?[^>]+(>|$)/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with spaces
    .replace(/&#\d+;/g, '') // Remove HTML entities
    .trim();
}