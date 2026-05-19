/**
 * Google Places API EV Charging Stations Fetcher
 * 
 * This service fetches EV charging station data from Google Places API
 * using search queries for EV charging stations across major Indian cities.
 * 
 * Requires: GOOGLE_PLACES_API_KEY environment variable
 */

import axios from 'axios';
import { storage } from '../storage';

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const PLACES_API_BASE_URL = 'https://maps.googleapis.com/maps/api/place';

// Interface for Google Places API station data
interface GooglePlacesEVStation {
  name: string;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  placeId: string;
  connectorTypes: string[];
  powerKw?: number;
  amenities?: string[];
  isActive?: boolean;
  photos?: string[];
  rating?: number;
  phoneNumber?: string;
}

/**
 * Major cities in India to search for EV charging stations
 */
const INDIAN_CITIES = [
  { name: "Delhi", latitude: 28.6139, longitude: 77.2090 },
  { name: "Mumbai", latitude: 19.0760, longitude: 72.8777 },
  { name: "Bangalore", latitude: 12.9716, longitude: 77.5946 },
  { name: "Chennai", latitude: 13.0827, longitude: 80.2707 },
  { name: "Kolkata", latitude: 22.5726, longitude: 88.3639 },
  { name: "Hyderabad", latitude: 17.3850, longitude: 78.4867 },
  { name: "Pune", latitude: 18.5204, longitude: 73.8567 },
  { name: "Ahmedabad", latitude: 23.0225, longitude: 72.5714 },
  { name: "Jaipur", latitude: 26.9124, longitude: 75.7873 },
  { name: "Lucknow", latitude: 26.8467, longitude: 80.9462 },
  { name: "Kochi", latitude: 9.9312, longitude: 76.2673 },
  { name: "Chandigarh", latitude: 30.7333, longitude: 76.7794 },
  { name: "Guwahati", latitude: 26.1445, longitude: 91.7362 },
  { name: "Bhopal", latitude: 23.2599, longitude: 77.4126 },
  { name: "Nagpur", latitude: 21.1458, longitude: 79.0882 },
  { name: "Indore", latitude: 22.7196, longitude: 75.8577 },
  { name: "Coimbatore", latitude: 11.0168, longitude: 76.9558 },
  { name: "Visakhapatnam", latitude: 17.6868, longitude: 83.2185 },
  { name: "Bhubaneswar", latitude: 20.2961, longitude: 85.8245 },
  { name: "Patna", latitude: 25.5941, longitude: 85.1376 }
];

/**
 * Search terms for finding EV charging stations
 */
const EV_CHARGING_SEARCH_TERMS = [
  "EV charging station",
  "electric vehicle charging",
  "electric car charging point",
  "electric vehicle charging point",
  "EV charger",
  "electric car charger",
  "EV charging",
  "Tesla supercharger",
  "Tata Power charging",
  "ChargeZone charging",
  "Ather charging",
  "Statiq charging",
  "Fortum charging",
  "Kazam charging",
  "MG Motors charging",
  "Hyundai charging station",
  "BPCL charging",
  "HPCL charging",
  "Indian Oil charging",
  "Magenta charging"
];

/**
 * Places that frequently have EV charging stations
 */
const PLACES_WITH_CHARGING = [
  "hotel",
  "shopping mall",
  "dealership",
  "car dealer",
  "automobile dealer",
  "car showroom",
  "highway rest area",
  "highway plaza",
  "petrol station",
  "gas station",
  "fuel station",
  "service center"
];

/**
 * Detect connector types based on text description
 */
function detectConnectorTypes(details: any): string[] {
  const connectorTypes: string[] = [];
  
  // Common connector types in India
  const text = JSON.stringify(details).toLowerCase();
  
  if (text.includes('ccs') || text.includes('combined charging system')) {
    connectorTypes.push('CCS');
  }
  
  if (text.includes('chademo') || text.includes('chademō') || text.includes('chademo')) {
    connectorTypes.push('CHAdeMO');
  }
  
  if (text.includes('type 2') || text.includes('type-2') || text.includes('type2') || 
      text.includes('mennekes')) {
    connectorTypes.push('Type 2');
  }
  
  if (text.includes('type 1') || text.includes('type-1') || text.includes('type1') || 
      text.includes('j1772') || text.includes('sae j1772')) {
    connectorTypes.push('Type 1');
  }
  
  if (text.includes('gb/t') || text.includes('gb/t') || text.includes('gb-t')) {
    connectorTypes.push('GB/T');
  }
  
  // If no specific connector types detected, assume Type 2 (most common in India)
  if (connectorTypes.length === 0) {
    connectorTypes.push('Type 2');
  }
  
  return connectorTypes;
}

/**
 * Estimate power output based on details
 */
function estimatePower(details: any, connectors: string[]): number {
  const text = JSON.stringify(details).toLowerCase();
  
  // Try to find kW mentions
  const kwMatches = text.match(/(\d+)(\.\d+)?\s*kw/g);
  if (kwMatches && kwMatches.length > 0) {
    // Extract the highest kW value
    const powers = kwMatches.map(match => {
      const num = match.match(/(\d+)(\.\d+)?/);
      return num ? parseFloat(num[0]) : 0;
    });
    
    const maxPower = Math.max(...powers);
    if (maxPower > 0) return maxPower;
  }
  
  // If no explicit kW mentioned, estimate based on connector types
  if (connectors.includes('CCS') || connectors.includes('CHAdeMO')) {
    return 50; // DC Fast charging
  } else if (connectors.includes('Type 2')) {
    return 22; // AC charging
  } else if (connectors.includes('Type 1')) {
    return 7.4; // AC charging
  }
  
  return 11; // Default value
}

/**
 * Extract amenities from place details
 */
function extractAmenities(details: any): string[] {
  const amenities: string[] = [];
  
  // Check if details has an amenities array
  if (details.amenities) {
    return details.amenities;
  }
  
  // Otherwise try to extract from types and other properties
  if (details.types) {
    if (details.types.includes('parking')) amenities.push('Parking');
    if (details.types.includes('restaurant') || details.types.includes('food')) amenities.push('Restaurant');
    if (details.types.includes('cafe')) amenities.push('Cafe');
    if (details.types.includes('shopping_mall')) amenities.push('Shopping');
    if (details.types.includes('store') || details.types.includes('convenience_store')) amenities.push('Store');
    if (details.types.includes('lodging') || details.types.includes('hotel')) amenities.push('Lodging');
    if (details.types.includes('bathroom') || details.types.includes('restroom')) amenities.push('Restroom');
  }
  
  return amenities;
}

/**
 * Extract city and state from address
 */
function extractLocationFromAddress(address: string): { city: string, state: string } {
  const addressParts = address.split(',').map(part => part.trim());
  
  // Indian states
  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
    'Andaman and Nicobar Islands', 'Dadra and Nagar Haveli and Daman and Diu',
    'Lakshadweep'
  ];
  
  // Try to find state in address
  let state = '';
  let city = '';
  
  // First try to find a state
  for (const part of addressParts) {
    const stateName = indianStates.find(state => 
      part.toLowerCase().includes(state.toLowerCase())
    );
    
    if (stateName) {
      state = stateName;
      break;
    }
  }
  
  // Then try to find a city (typically before the state)
  if (addressParts.length >= 2) {
    const stateIndex = addressParts.findIndex(part => 
      part.toLowerCase().includes(state.toLowerCase())
    );
    
    if (stateIndex > 0) {
      city = addressParts[stateIndex - 1];
    } else {
      // If we can't determine city position relative to state,
      // use the second-to-last part of the address
      city = addressParts[addressParts.length - 2];
    }
  }
  
  return { city, state };
}

/**
 * Get detailed information about a specific place
 */
async function getPlaceDetails(placeId: string): Promise<any> {
  if (!GOOGLE_API_KEY) {
    throw new Error('Google Places API key is not configured');
  }

  try {
    const response = await axios.get(`${PLACES_API_BASE_URL}/details/json`, {
      params: {
        place_id: placeId,
        fields: 'name,formatted_address,geometry,rating,formatted_phone_number,international_phone_number,types,photos,opening_hours',
        key: GOOGLE_API_KEY
      }
    });

    if (response.data.status === 'OK') {
      return response.data.result;
    } else {
      console.error(`Error fetching place details: ${response.data.status}`);
      return null;
    }
  } catch (error) {
    console.error('Error fetching place details:', error);
    return null;
  }
}

/**
 * Get photo URL for a place
 */
async function getPhotoUrl(photoReference: string, maxWidth: number = 800): Promise<string | null> {
  if (!GOOGLE_API_KEY) {
    throw new Error('Google Places API key is not configured');
  }

  try {
    return `${PLACES_API_BASE_URL}/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${GOOGLE_API_KEY}`;
  } catch (error) {
    console.error('Error getting photo URL:', error);
    return null;
  }
}

/**
 * Process a Google Places API result to extract charging station data
 */
async function processPlaceToChargingStation(place: any): Promise<GooglePlacesEVStation | null> {
  try {
    if (!place.place_id) return null;
    
    // Get detailed place information
    const placeDetails = await getPlaceDetails(place.place_id);
    if (!placeDetails) return null;
    
    // Basic info
    const station: GooglePlacesEVStation = {
      name: place.name || placeDetails.name,
      address: placeDetails.formatted_address || place.vicinity || '',
      placeId: place.place_id,
      latitude: place.geometry?.location?.lat || 0,
      longitude: place.geometry?.location?.lng || 0,
      city: '',
      state: '',
      connectorTypes: detectConnectorTypes(placeDetails),
      rating: place.rating || placeDetails.rating,
      phoneNumber: placeDetails.formatted_phone_number || placeDetails.international_phone_number
    };
    
    // Extract city and state
    const location = extractLocationFromAddress(station.address);
    station.city = location.city;
    station.state = location.state;
    
    // Estimate power
    station.powerKw = estimatePower(placeDetails, station.connectorTypes);
    
    // Extract amenities
    station.amenities = extractAmenities(placeDetails);
    
    // Photos
    if (placeDetails.photos && placeDetails.photos.length > 0) {
      station.photos = await Promise.all(
        placeDetails.photos.slice(0, 3).map(async (photo: any) => {
          try {
            return await getPhotoUrl(photo.photo_reference);
          } catch (error) {
            console.error('Error getting photo URL:', error);
            return null;
          }
        })
      ).then(photos => photos.filter(Boolean) as string[]);
    }
    
    // Activity status - assume it's active if it's returned by the API
    station.isActive = true;
    
    return station;
  } catch (error) {
    console.error(`Error processing place ${place.name || place.place_id}:`, error);
    return null;
  }
}

/**
 * Search for nearby charging stations with pagination support
 */
async function searchNearbyChargingStations(params: { 
  latitude: number,
  longitude: number,
  radius: number,
  query: string,
  pageToken?: string
}): Promise<{ results: any[], nextPageToken?: string }> {
  if (!GOOGLE_API_KEY) {
    throw new Error('Google Places API key is not configured');
  }

  try {
    const requestParams: any = {
      location: `${params.latitude},${params.longitude}`,
      radius: params.radius,
      keyword: params.query,
      key: GOOGLE_API_KEY
    };

    // Add page token if provided
    if (params.pageToken) {
      requestParams.pagetoken = params.pageToken;
    }

    const response = await axios.get(`${PLACES_API_BASE_URL}/nearbysearch/json`, {
      params: requestParams
    });

    if (response.data.status === 'OK' || response.data.status === 'ZERO_RESULTS') {
      return {
        results: response.data.results || [],
        nextPageToken: response.data.next_page_token
      };
    } else {
      console.error(`Error searching for charging stations: ${response.data.status}`);
      return { results: [] };
    }
  } catch (error) {
    console.error('Error searching for charging stations:', error);
    return { results: [] };
  }
}

/**
 * Get EV charging stations from Google Places API
 */
async function fetchGooglePlacesEVStations(): Promise<GooglePlacesEVStation[]> {
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    console.error('GOOGLE_PLACES_API_KEY is not set');
    return [];
  }
  
  const stations: GooglePlacesEVStation[] = [];
  const processedPlaceIds = new Set<string>();
  
  console.log('Searching for EV charging stations across India using Google Places API...');
  
  // Search each major city
  for (const city of INDIAN_CITIES) {
    console.log(`Searching for EV charging stations in ${city.name}...`);
    
    // Try each search term
    for (const searchTerm of EV_CHARGING_SEARCH_TERMS) {
      try {
        // Search with larger radius (100km to cover more area around major cities)
        let nextPageToken: string | undefined;
        let pageCount = 0;
        
        do {
          console.log(`Searching for "${searchTerm}" in ${city.name} (page ${pageCount + 1})...`);
          const searchResponse = await searchNearbyChargingStations({
            latitude: city.latitude,
            longitude: city.longitude,
            radius: 100000, // 100km (increased from 50km)
            query: searchTerm,
            pageToken: nextPageToken
          });
          
          // Process results
          for (const place of searchResponse.results) {
            if (place.place_id && !processedPlaceIds.has(place.place_id)) {
              processedPlaceIds.add(place.place_id);
              
              const station = await processPlaceToChargingStation(place);
              if (station) {
                stations.push(station);
                console.log(`Found station: ${station.name}`);
              }
            }
          }
          
          // Update nextPageToken for next iteration
          nextPageToken = searchResponse.nextPageToken;
          pageCount++;
          
          // If we have more pages, wait before making the next request
          // Google requires a delay when using page tokens
          if (nextPageToken) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } while (nextPageToken && pageCount < 3); // Limit to 3 pages (60 results) per search term per city
      } catch (error) {
        console.error(`Error searching for "${searchTerm}" in ${city.name}:`, error);
      }
      
      // Respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Also search for places that often have EV charging
    for (const placeType of PLACES_WITH_CHARGING) {
      try {
        console.log(`Searching for "${placeType}" with charging in ${city.name}...`);
        const combinedQuery = `${placeType} with EV charging`;
        
        const searchResponse = await searchNearbyChargingStations({
          latitude: city.latitude,
          longitude: city.longitude,
          radius: 100000, // 100km
          query: combinedQuery
        });
        
        // Process results
        for (const place of searchResponse.results) {
          if (place.place_id && !processedPlaceIds.has(place.place_id)) {
            processedPlaceIds.add(place.place_id);
            
            const station = await processPlaceToChargingStation(place);
            if (station) {
              stations.push(station);
              console.log(`Found station: ${station.name}`);
            }
          }
        }
      } catch (error) {
        console.error(`Error searching for "${placeType}" in ${city.name}:`, error);
      }
      
      // Respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Add delay between cities to avoid hitting API limits
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log(`Found a total of ${stations.length} EV charging stations from Google Places API`);
  return stations;
}

/**
 * Import stations from Google Places API into the database
 */
async function importGooglePlacesEVStations(stations: GooglePlacesEVStation[]): Promise<number> {
  let importedCount = 0;
  
  console.log(`Starting import of ${stations.length} Google Places EV charging stations...`);
  
  for (const stationData of stations) {
    try {
      // Skip stations with missing coordinates
      if (!stationData.latitude || !stationData.longitude) {
        console.log(`Skipping station "${stationData.name}" - missing coordinates`);
        continue;
      }
      
      // Check if station already exists based on place ID
      const existingWithPlaceId = await storage.getLocationByGooglePlaceId(stationData.placeId);
      if (existingWithPlaceId) {
        console.log(`Skipping duplicate Google Places station with same place ID: ${stationData.name}`);
        continue;
      }
      
      // Also check if station already exists based on coordinates and name
      const existingStations = await storage.getLocationsWithinRadius(
        stationData.latitude,
        stationData.longitude,
        0.05 // 50 meters radius to detect very close duplicates
      );
      
      // Only consider exact duplicates (same name and very close coordinates)
      const isDuplicate = existingStations.some(existing => 
        existing.name === stationData.name && 
        Math.abs(existing.latitude - stationData.latitude) < 0.0001 &&
        Math.abs(existing.longitude - stationData.longitude) < 0.0001 
      );
      
      if (isDuplicate) {
        console.log(`Skipping duplicate Google Places station: ${stationData.name}`);
        continue;
      }
      
      // First create the location
      const location = await storage.createLocation({
        name: stationData.name,
        type: 'charging',
        address: stationData.address,
        city: stationData.city || '',
        state: stationData.state || '',
        latitude: stationData.latitude,
        longitude: stationData.longitude,
        rating: stationData.rating || 4.0,
        isOpen: stationData.isActive !== undefined ? stationData.isActive : true,
        source: 'google-places',
        description: 'EV charging station from Google Places',
        phoneNumber: stationData.phoneNumber || null,
        imageUrl: stationData.photos && stationData.photos.length > 0 ? stationData.photos[0] : null,
        amenities: stationData.amenities || null,
        googlePlaceId: stationData.placeId
      });
      
      // Then create the charging station associated with the location
      await storage.createChargingStation({
        locationId: location.id,
        operatorName: 'Unknown', // Google Places doesn't typically provide operator information
        connectorTypes: stationData.connectorTypes as any[],
        powerKw: stationData.powerKw || 22,
        pricePerKwh: 15.0, // Default price for charging
        paymentMethods: ['Credit Card', 'Debit Card', 'UPI'],
        isAvailable: true,
        numberOfPoints: 2, // Assuming multiple charging points per station
      });
      
      // Add photos if available
      if (stationData.photos && stationData.photos.length > 0) {
        for (const photoUrl of stationData.photos) {
          try {
            await storage.addLocationPhoto({
              locationId: location.id,
              url: photoUrl,
              source: 'google-places'
            });
          } catch (photoError) {
            console.error(`Error adding photo for station "${stationData.name}":`, photoError);
          }
        }
      }
      
      importedCount++;
    } catch (error) {
      console.error(`Error importing Google Places station "${stationData.name}":`, error);
    }
  }
  
  console.log(`Successfully imported ${importedCount} Google Places EV charging stations`);
  return importedCount;
}

/**
 * Fetch and import EV charging stations from Google Places API
 */
export async function fetchAndImportGooglePlacesEVStations(): Promise<number> {
  try {
    const stations = await fetchGooglePlacesEVStations();
    return await importGooglePlacesEVStations(stations);
  } catch (error) {
    console.error('Error in fetchAndImportGooglePlacesEVStations:', error);
    return 0;
  }
}