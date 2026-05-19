/**
 * Google Places ChargeZone Stations Fetcher
 * 
 * This service fetches ChargeZone charging station data using Google Places API.
 * It performs targeted searches for ChargeZone branded charging stations across India.
 */

import { InsertChargingStation, InsertLocation, locations, chargingStations } from '@shared/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import axios from 'axios';

// Major cities coordinates in India for comprehensive fetching
const MAJOR_CITIES = [
  { name: 'Mumbai', lat: 19.076, lng: 72.8777 },
  { name: 'Delhi', lat: 28.6139, lng: 77.209 },
  { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
  { name: 'Hyderabad', lat: 17.385, lng: 78.4867 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 },
  { name: 'Jaipur', lat: 26.9124, lng: 75.7873 },
  { name: 'Surat', lat: 21.1702, lng: 72.8311 },
  { name: 'Lucknow', lat: 26.8467, lng: 80.9462 },
  { name: 'Kanpur', lat: 26.4499, lng: 80.3319 },
  { name: 'Nagpur', lat: 21.1458, lng: 79.0882 },
  { name: 'Patna', lat: 25.5941, lng: 85.1376 },
  { name: 'Indore', lat: 22.7196, lng: 75.8577 },
  { name: 'Bhopal', lat: 23.2599, lng: 77.4126 }
];

/**
 * Search for nearby charging stations using Google Places API
 */
async function searchNearbyChargingStations(options: {
  lat: number,
  lng: number,
  radius: number,
  keyword: string
}): Promise<any[]> {
  try {
    if (!process.env.GOOGLE_PLACES_API_KEY) {
      console.error("Missing GOOGLE_PLACES_API_KEY environment variable");
      return [];
    }

    const { lat, lng, radius, keyword } = options;
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&keyword=${encodeURIComponent(keyword)}&type=establishment&key=${process.env.GOOGLE_PLACES_API_KEY}`;
    
    const response = await axios.get(url);
    
    if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', response.data.status, response.data.error_message);
      return [];
    }
    
    return response.data.results || [];
  } catch (error) {
    console.error('Error fetching from Google Places API:', error);
    return [];
  }
}

/**
 * Get detailed information about a specific place
 */
async function getPlaceDetails(placeId: string): Promise<any> {
  try {
    if (!process.env.GOOGLE_PLACES_API_KEY) {
      console.error("Missing GOOGLE_PLACES_API_KEY environment variable");
      return null;
    }

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry,opening_hours,formatted_phone_number,types,user_ratings_total&key=${process.env.GOOGLE_PLACES_API_KEY}`;
    
    const response = await axios.get(url);
    
    if (response.data.status !== 'OK') {
      console.error('Google Place Details API error:', response.data.status, response.data.error_message);
      return null;
    }
    
    return response.data.result;
  } catch (error) {
    console.error('Error fetching place details from Google Places API:', error);
    return null;
  }
}

/**
 * Search for ChargeZone stations using Google Places API and process them
 */
export async function fetchGoogleChargeZoneStations(): Promise<InsertChargingStation[]> {
  console.log('Starting Google Places search for ChargeZone stations');
  
  // Debug API key presence
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    console.error("ERROR: GOOGLE_PLACES_API_KEY is not set in environment variables");
    return [];
  } else {
    console.log("Google Places API Key is available");
  }
  
  const allStations: InsertChargingStation[] = [];
  
  try {
    // Search through major cities in India
    for (const city of MAJOR_CITIES) {
      console.log(`Searching for ChargeZone stations in ${city.name}...`);
      
      // Perform specific searches for ChargeZone branded stations
      const searchQueries = [
        'ChargeZone EV charging station',
        'ChargeZone electric vehicle charging'
      ];
      
      for (const query of searchQueries) {
        try {
          // Search for stations
          const searchResults = await searchNearbyChargingStations({
            lat: city.lat,
            lng: city.lng,
            radius: 25000, // 25km radius
            keyword: query
          });
          
          console.log(`Found ${searchResults.length} potential ChargeZone stations for query "${query}" in ${city.name}`);
          
          // Process each search result
          for (const place of searchResults) {
            try {
              // Skip if the place doesn't look like a ChargeZone station
              if (!isLikelyChargeZoneStation(place.name)) {
                continue;
              }
              
              // Check if we already have this place in our database
              const existingLocation = await db.query.locations.findFirst({
                where: eq(locations.googlePlaceId, place.place_id)
              });
              
              if (existingLocation) {
                console.log(`Station with place_id ${place.place_id} already exists, skipping`);
                continue;
              }
              
              // Get detailed place information
              const placeDetails = await getPlaceDetails(place.place_id);
              
              if (placeDetails) {
                // Create the location first
                const locationData: Partial<InsertLocation> = {
                  name: placeDetails.name,
                  type: 'charging',
                  address: placeDetails.formatted_address || '',
                  city: extractCity(placeDetails.formatted_address || '', city.name),
                  state: extractState(placeDetails.formatted_address || ''),
                  latitude: placeDetails.geometry?.location.lat || 0,
                  longitude: placeDetails.geometry?.location.lng || 0,
                  description: `ChargeZone EV charging station in ${city.name}`,
                  amenities: extractAmenities(placeDetails),
                  isOpen: true,
                  source: 'google_places',
                  googlePlaceId: place.place_id
                };
                
                if (locationData.latitude && locationData.longitude) {
                  // Insert location to database
                  const [newLocation] = await db.insert(locations)
                    .values(locationData as any)
                    .returning();
                  
                  // Create charging station
                  if (newLocation) {
                    const connectorTypes = determineConnectorTypes(placeDetails);
                    const power = estimatePowerFromConnectors(connectorTypes);
                    
                    const stationData: InsertChargingStation = {
                      locationId: newLocation.id,
                      operatorName: 'ChargeZone',
                      connectorTypes: connectorTypes,
                      powerKw: power,
                      pricePerKwh: 12, // Default price
                      paymentMethods: ['Credit Card', 'UPI', 'Mobile App'],
                      numberOfPoints: estimateNumberOfPoints(placeDetails),
                      networkName: 'ChargeZone',
                      supportContact: placeDetails.formatted_phone_number || null
                    };
                    
                    allStations.push(stationData);
                    console.log(`Added ChargeZone station: ${newLocation.name}`);
                  }
                }
              }
            } catch (error) {
              console.error(`Error processing place ${place.place_id}:`, error);
            }
          }
        } catch (error) {
          console.error(`Error searching for "${query}" in ${city.name}:`, error);
        }
      }
    }
    
    console.log(`Successfully found ${allStations.length} ChargeZone stations from Google Places API`);
    return allStations;
  } catch (error) {
    console.error('Error fetching ChargeZone stations via Google Places API:', error);
    return [];
  }
}

/**
 * Extract city from address
 */
function extractCity(address: string, defaultCity: string): string {
  // Common Indian cities
  const cities = [
    'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 
    'Ahmedabad', 'Pune', 'Jaipur', 'Surat', 'Lucknow', 'Kanpur', 
    'Nagpur', 'Patna', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 
    'Vadodara', 'Ghaziabad', 'New Delhi', 'Bengaluru'
  ];
  
  for (const city of cities) {
    if (address.includes(city)) {
      return city;
    }
  }
  
  return defaultCity;
}

/**
 * Extract state from address
 */
function extractState(address: string): string {
  // Common Indian states
  const states: {[key: string]: string} = {
    'Maharashtra': 'Maharashtra',
    'Delhi': 'Delhi',
    'Karnataka': 'Karnataka',
    'Telangana': 'Telangana',
    'Tamil Nadu': 'Tamil Nadu',
    'West Bengal': 'West Bengal',
    'Gujarat': 'Gujarat',
    'Rajasthan': 'Rajasthan',
    'Uttar Pradesh': 'Uttar Pradesh',
    'Bihar': 'Bihar',
    'Madhya Pradesh': 'Madhya Pradesh',
    'Andhra Pradesh': 'Andhra Pradesh',
    'Kerala': 'Kerala',
    'NCR': 'Delhi',
    'UP': 'Uttar Pradesh',
    'MP': 'Madhya Pradesh'
  };
  
  for (const [key, value] of Object.entries(states)) {
    if (address.includes(key)) {
      return value;
    }
  }
  
  return 'Unknown';
}

/**
 * Extract amenities from place details
 */
function extractAmenities(details: any): string[] {
  const amenities: string[] = ['Parking'];
  
  if (details.types?.includes('restaurant') || details.types?.includes('food')) {
    amenities.push('Restaurant');
  }
  
  if (details.types?.includes('store') || details.types?.includes('shopping_mall')) {
    amenities.push('Shopping');
  }
  
  if (details.types?.includes('lodging') || details.types?.includes('hotel')) {
    amenities.push('Lodging');
  }
  
  if (details.types?.includes('cafe') || details.types?.includes('restaurant')) {
    amenities.push('Cafe');
  }
  
  if (details.types?.includes('gas_station')) {
    amenities.push('Fuel Station');
  }
  
  return amenities;
}

/**
 * Determine if a place is likely a ChargeZone station
 */
function isLikelyChargeZoneStation(name: string): boolean {
  if (!name) return false;
  const lowerName = name.toLowerCase();
  
  return lowerName.includes('chargezone') || 
         lowerName.includes('charge zone') ||
         lowerName.includes('cz charging') || 
         (lowerName.includes('charging') && lowerName.includes('zone'));
}

/**
 * Determine connector types based on place details
 */
function determineConnectorTypes(details: any): ("CHAdeMO" | "CCS-2" | "Type-2" | "Bharat AC" | "Bharat DC")[] {
  // ChargeZone typically has CCS-2 and Type-2
  const connectorTypes: ("CHAdeMO" | "CCS-2" | "Type-2" | "Bharat AC" | "Bharat DC")[] = ['CCS-2', 'Type-2'];
  
  // Check if we can glean any information from the place details
  if (details.name) {
    const lowerName = details.name.toLowerCase();
    
    if (lowerName.includes('chademo')) {
      if (!connectorTypes.includes('CHAdeMO')) {
        connectorTypes.push('CHAdeMO');
      }
    }
    
    if (lowerName.includes('bharat')) {
      if (lowerName.includes('ac')) {
        if (!connectorTypes.includes('Bharat AC')) {
          connectorTypes.push('Bharat AC');
        }
      } else if (lowerName.includes('dc')) {
        if (!connectorTypes.includes('Bharat DC')) {
          connectorTypes.push('Bharat DC');
        }
      }
    }
  }
  
  return connectorTypes;
}

/**
 * Estimate power based on connector types
 */
function estimatePowerFromConnectors(connectorTypes: ("CHAdeMO" | "CCS-2" | "Type-2" | "Bharat AC" | "Bharat DC")[]): number {
  // ChargeZone typically has 60kW or 120kW chargers
  if (connectorTypes.includes('CCS-2')) {
    return 60; // ChargeZone DC fast chargers
  } else if (connectorTypes.includes('CHAdeMO')) {
    return 50; // CHAdeMO is usually 50kW
  } else if (connectorTypes.includes('Type-2')) {
    return 22; // AC chargers
  } else if (connectorTypes.includes('Bharat DC')) {
    return 15; // Bharat DC standard
  } else if (connectorTypes.includes('Bharat AC')) {
    return 3.3; // Bharat AC standard
  }
  
  return 22; // Default
}

/**
 * Estimate number of charging points
 */
function estimateNumberOfPoints(details: any): number {
  // ChargeZone typically has 2-4 charging points per station
  if (details.user_ratings_total && details.user_ratings_total > 20) {
    return 4; // Likely a larger station with more points
  } else if (details.user_ratings_total && details.user_ratings_total > 10) {
    return 3; // Medium-sized station
  }
  
  return 2; // Default is 2 points
}

/**
 * Import ChargeZone stations from Google Places API
 */
export async function importGoogleChargeZoneStations(): Promise<number> {
  try {
    const stationsData = await fetchGoogleChargeZoneStations();
    
    let importedCount = 0;
    
    // Add each station to the database
    for (const stationData of stationsData) {
      try {
        await db.insert(chargingStations).values(stationData);
        importedCount++;
      } catch (error) {
        console.error(`Error importing ChargeZone station at location ${stationData.locationId}:`, error);
      }
    }
    
    console.log(`Successfully imported ${importedCount} ChargeZone stations from Google Places API`);
    return importedCount;
  } catch (error) {
    console.error('Error importing ChargeZone stations from Google Places API:', error);
    return 0;
  }
}