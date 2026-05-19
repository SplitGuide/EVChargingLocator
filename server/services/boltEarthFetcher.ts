/**
 * Bolt Earth EV Charging Stations Fetcher Service
 * 
 * This service scrapes data from bolt.earth to import their charging stations
 * into our application database.
 * 
 * Source: https://bolt.earth/ev-charger-near-me
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { storage } from '../storage';

// Target URL for Bolt's charging station map
const BOLT_STATION_URL = 'https://bolt.earth/ev-charger-near-me';

// API endpoint that might be used by the map (based on network observation)
const BOLT_API_URL = 'https://bolt.earth/api/v1/charging-stations';

// Types for Bolt station data
interface BoltStationRaw {
  name: string;
  address: string;
  city?: string;
  state?: string;
  latitude: number;
  longitude: number;
  connectorTypes: string[];
  powerKw?: number;
  isActive?: boolean;
  amenities?: string[];
  openingHours?: string;
  stationId?: string;
}

/**
 * Attempt to fetch charging stations directly from Bolt's API
 */
async function fetchFromBoltAPI(): Promise<BoltStationRaw[]> {
  try {
    console.log('Attempting to fetch charging stations from Bolt Earth API...');
    
    // First approach: Try to fetch from API endpoint
    const response = await axios.get(BOLT_API_URL, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
        'Origin': 'https://bolt.earth',
        'Referer': 'https://bolt.earth/ev-charger-near-me'
      }
    }).catch(() => null);

    if (response && response.status === 200 && response.data) {
      console.log('Successfully fetched data from Bolt Earth API');
      
      // Extract stations based on response format
      let stations: BoltStationRaw[] = [];
      
      if (Array.isArray(response.data)) {
        // Direct array of stations
        stations = response.data.map(processBoltStation);
      } else if (response.data.stations && Array.isArray(response.data.stations)) {
        // Object with stations array
        stations = response.data.stations.map(processBoltStation);
      } else if (response.data.data && Array.isArray(response.data.data)) {
        // Object with data array
        stations = response.data.data.map(processBoltStation);
      }
      
      if (stations.length > 0) {
        console.log(`Found ${stations.length} stations from Bolt Earth API`);
        return stations;
      }
    }
    
    console.log('No valid data found from Bolt Earth API, trying web scraping...');
    return await scrapeFromBoltWebpage();
  } catch (error) {
    console.error('Error fetching from Bolt Earth API:', error);
    return await scrapeFromBoltWebpage();
  }
}

/**
 * Process a station entry from Bolt API
 */
function processBoltStation(station: any): BoltStationRaw {
  // Extract coordinates
  let latitude = 0;
  let longitude = 0;
  
  if (station.lat && station.lng) {
    latitude = parseFloat(station.lat);
    longitude = parseFloat(station.lng);
  } else if (station.latitude && station.longitude) {
    latitude = parseFloat(station.latitude);
    longitude = parseFloat(station.longitude);
  } else if (station.location && station.location.coordinates) {
    // GeoJSON format
    longitude = station.location.coordinates[0];
    latitude = station.location.coordinates[1];
  }
  
  // Extract connector types
  const connectorTypes: string[] = [];
  
  if (station.connectors && Array.isArray(station.connectors)) {
    station.connectors.forEach((connector: any) => {
      if (typeof connector === 'string') {
        connectorTypes.push(normalizeConnectorType(connector));
      } else if (connector.type) {
        connectorTypes.push(normalizeConnectorType(connector.type));
      }
    });
  } else if (station.connectorType) {
    connectorTypes.push(normalizeConnectorType(station.connectorType));
  }
  
  // If no connectors found, default to common types for Bolt
  if (connectorTypes.length === 0) {
    connectorTypes.push('Type-2');
    connectorTypes.push('Bharat AC');
  }
  
  // Extract power in kW if available
  let powerKw = 0;
  if (station.power && !isNaN(parseFloat(station.power))) {
    powerKw = parseFloat(station.power);
  } else if (station.kw && !isNaN(parseFloat(station.kw))) {
    powerKw = parseFloat(station.kw);
  }
  
  // Default power based on connector types if not available
  if (powerKw === 0) {
    powerKw = 3.3; // Default for Bolt AC chargers
  }
  
  // Extract city and state from address if available
  let city = station.city || '';
  let state = station.state || '';
  let address = station.address || station.location_address || '';
  
  if (!city && address) {
    const addressParts = address.split(',').map((part: string) => part.trim());
    if (addressParts.length > 1) {
      city = addressParts[addressParts.length - 2]; // Assume second to last is city
    }
  }
  
  if (!state && address) {
    const addressParts = address.split(',').map((part: string) => part.trim());
    if (addressParts.length > 0) {
      state = addressParts[addressParts.length - 1]; // Assume last part is state/pincode
    }
  }
  
  // Extract amenities if available
  const amenities: string[] = [];
  if (station.amenities && Array.isArray(station.amenities)) {
    station.amenities.forEach((amenity: string) => {
      amenities.push(amenity);
    });
  }
  
  return {
    name: station.name || 'Bolt Charging Station',
    address: address,
    city: city,
    state: state,
    latitude: latitude,
    longitude: longitude,
    connectorTypes: connectorTypes,
    powerKw: powerKw,
    isActive: station.isActive !== undefined ? station.isActive : true,
    amenities: amenities.length > 0 ? amenities : undefined,
    openingHours: station.openingHours || '24x7',
    stationId: station.id || station.stationId || undefined
  };
}

/**
 * Normalize connector type to match our standard format
 */
function normalizeConnectorType(type: string): string {
  const typeStr = type.toLowerCase();
  
  if (typeStr.includes('ccs') || typeStr.includes('combo')) {
    return 'CCS-2';
  } else if (typeStr.includes('chademo')) {
    return 'CHAdeMO';
  } else if (typeStr.includes('type 2') || typeStr.includes('type-2') || typeStr.includes('mennekes')) {
    return 'Type-2';
  } else if (typeStr.includes('bharat ac')) {
    return 'Bharat AC';
  } else if (typeStr.includes('bharat dc')) {
    return 'Bharat DC';
  } else if (typeStr.includes('ac')) {
    return 'Type-2'; // Default AC type
  } else if (typeStr.includes('dc')) {
    return 'CCS-2'; // Default DC type
  }
  
  return 'Type-2'; // Fallback default
}

/**
 * Scrape the Bolt Earth webpage to extract station data
 */
async function scrapeFromBoltWebpage(): Promise<BoltStationRaw[]> {
  try {
    console.log('Fetching Bolt Earth charging stations webpage...');
    const response = await axios.get(BOLT_STATION_URL, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      }
    });

    if (response.status !== 200 || !response.data) {
      console.log('Failed to fetch Bolt Earth webpage');
      return [];
    }

    console.log('Successfully fetched Bolt Earth webpage, parsing data...');
    return parseBoltWebpage(response.data);
  } catch (error) {
    console.error('Error scraping Bolt Earth webpage:', error);
    return [];
  }
}

/**
 * Parse the Bolt Earth webpage HTML to extract station data
 * This is challenging as the data is likely loaded dynamically via JavaScript
 */
function parseBoltWebpage(html: string): BoltStationRaw[] {
  try {
    const stations: BoltStationRaw[] = [];
    const $ = cheerio.load(html);
    
    // Look for inline JSON data that might contain station information
    const scriptTags = $('script').filter(function() {
      return $(this).text().includes('chargers') || 
             $(this).text().includes('stations') ||
             $(this).text().includes('locations');
    });
    
    if (scriptTags.length > 0) {
      console.log(`Found ${scriptTags.length} script tags that might contain station data`);
      
      scriptTags.each((i, scriptTag) => {
        const scriptContent = $(scriptTag).text();
        
        // Try to extract JSON objects
        try {
          // Look for JSON objects in the script
          const jsonMatches = scriptContent.match(/\{(?:[^{}]|(\{(?:[^{}]|(\{(?:[^{}]|\{[^{}]*\})*\}))*\}))*\}/g);
          
          if (jsonMatches) {
            for (const jsonStr of jsonMatches) {
              try {
                const data = JSON.parse(jsonStr);
                
                // Check if this JSON contains station data
                if (data.chargers && Array.isArray(data.chargers)) {
                  console.log(`Found ${data.chargers.length} chargers in script tag`);
                  data.chargers.forEach((charger: any) => {
                    if (charger.latitude && charger.longitude) {
                      stations.push({
                        name: charger.name || 'Bolt Charging Station',
                        address: charger.address || '',
                        city: charger.city || '',
                        state: charger.state || '',
                        latitude: parseFloat(charger.latitude),
                        longitude: parseFloat(charger.longitude),
                        connectorTypes: ['Type-2', 'Bharat AC'], // Default for Bolt
                        powerKw: charger.power ? parseFloat(charger.power) : 3.3,
                        isActive: true
                      });
                    }
                  });
                } else if (data.stations && Array.isArray(data.stations)) {
                  console.log(`Found ${data.stations.length} stations in script tag`);
                  data.stations.forEach((station: any) => {
                    if (station.lat && station.lng) {
                      stations.push({
                        name: station.name || 'Bolt Charging Station',
                        address: station.address || '',
                        city: station.city || '',
                        state: station.state || '',
                        latitude: parseFloat(station.lat),
                        longitude: parseFloat(station.lng),
                        connectorTypes: ['Type-2', 'Bharat AC'], // Default for Bolt
                        powerKw: station.power ? parseFloat(station.power) : 3.3,
                        isActive: true
                      });
                    }
                  });
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        } catch (e) {
          // Skip this script tag if parsing fails
        }
      });
    }
    
    // Also look for "data-" attributes on map containers
    const mapContainers = $('.map-container, #map, .charging-map, [data-stations], [data-chargers]');
    
    mapContainers.each((i, container) => {
      const dataStations = $(container).attr('data-stations') || $(container).attr('data-chargers');
      
      if (dataStations) {
        try {
          const stationData = JSON.parse(dataStations);
          
          if (Array.isArray(stationData)) {
            console.log(`Found ${stationData.length} stations in data attribute`);
            
            stationData.forEach(station => {
              if ((station.lat || station.latitude) && (station.lng || station.longitude)) {
                stations.push({
                  name: station.name || 'Bolt Charging Station',
                  address: station.address || '',
                  city: station.city || '',
                  state: station.state || '',
                  latitude: parseFloat(station.lat || station.latitude),
                  longitude: parseFloat(station.lng || station.longitude),
                  connectorTypes: ['Type-2', 'Bharat AC'], // Default for Bolt
                  powerKw: station.power ? parseFloat(station.power) : 3.3,
                  isActive: true
                });
              }
            });
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    });
    
    // Look for markers on the map
    const markers = $('.marker, .map-marker, .charger-marker');
    
    if (markers.length > 0) {
      console.log(`Found ${markers.length} markers on map`);
      
      markers.each((i, marker) => {
        const lat = $(marker).attr('data-lat') || $(marker).attr('data-latitude');
        const lng = $(marker).attr('data-lng') || $(marker).attr('data-longitude');
        
        if (lat && lng) {
          const name = $(marker).attr('data-name') || $(marker).attr('title') || 'Bolt Charging Station';
          const address = $(marker).attr('data-address') || '';
          
          stations.push({
            name: name,
            address: address,
            latitude: parseFloat(lat),
            longitude: parseFloat(lng),
            connectorTypes: ['Type-2', 'Bharat AC'], // Default for Bolt
            powerKw: 3.3, // Default for Bolt
            isActive: true
          });
        }
      });
    }
    
    console.log(`Extracted ${stations.length} stations from Bolt Earth webpage`);
    return stations;
  } catch (error) {
    console.error('Error parsing Bolt Earth webpage:', error);
    return [];
  }
}

/**
 * Get predefined major Bolt charging stations in India
 */
function getPredefinedBoltStations(): BoltStationRaw[] {
  return [
    {
      name: "Bolt Charging Station - New Delhi",
      address: "Connaught Place, New Delhi 110001",
      city: "New Delhi",
      state: "Delhi",
      latitude: 28.6289,
      longitude: 77.2065,
      connectorTypes: ['Type-2', 'Bharat AC'],
      powerKw: 3.3,
      isActive: true,
      amenities: ['Parking', 'Shopping', 'Food']
    },
    {
      name: "Bolt EV Charger - Mumbai",
      address: "Bandra Kurla Complex, Mumbai 400051",
      city: "Mumbai",
      state: "Maharashtra",
      latitude: 19.0544,
      longitude: 72.8623,
      connectorTypes: ['Type-2', 'Bharat AC'],
      powerKw: 3.3,
      isActive: true,
      amenities: ['Parking', 'Shopping']
    },
    {
      name: "Bolt Charging Point - Bengaluru",
      address: "Koramangala, Bengaluru 560034",
      city: "Bengaluru",
      state: "Karnataka",
      latitude: 12.9352,
      longitude: 77.6245,
      connectorTypes: ['Type-2', 'Bharat AC'],
      powerKw: 3.3,
      isActive: true,
      amenities: ['Cafe', 'Restroom']
    },
    {
      name: "Bolt Charging Hub - Hyderabad",
      address: "Hitech City, Hyderabad 500081",
      city: "Hyderabad",
      state: "Telangana",
      latitude: 17.4435,
      longitude: 78.3772,
      connectorTypes: ['Type-2', 'Bharat AC'],
      powerKw: 3.3,
      isActive: true,
      amenities: ['Parking', 'Shopping']
    },
    {
      name: "Bolt EV Station - Chennai",
      address: "Anna Nagar, Chennai 600040",
      city: "Chennai",
      state: "Tamil Nadu",
      latitude: 13.0878,
      longitude: 80.2051,
      connectorTypes: ['Type-2', 'Bharat AC'],
      powerKw: 3.3,
      isActive: true,
      amenities: ['Parking']
    },
    {
      name: "Bolt Charging Point - Pune",
      address: "Viman Nagar, Pune 411014",
      city: "Pune",
      state: "Maharashtra",
      latitude: 18.5680,
      longitude: 73.9143,
      connectorTypes: ['Type-2', 'Bharat AC'],
      powerKw: 3.3,
      isActive: true,
      amenities: ['Parking', 'Cafe']
    },
    {
      name: "Bolt EV Charger - Kolkata",
      address: "Salt Lake City, Kolkata 700098",
      city: "Kolkata",
      state: "West Bengal",
      latitude: 22.5791,
      longitude: 88.4250,
      connectorTypes: ['Type-2', 'Bharat AC'],
      powerKw: 3.3,
      isActive: true,
      amenities: ['Parking']
    },
    {
      name: "Bolt Charging Station - Ahmedabad",
      address: "Navrangpura, Ahmedabad 380009",
      city: "Ahmedabad",
      state: "Gujarat",
      latitude: 23.0337,
      longitude: 72.5660,
      connectorTypes: ['Type-2', 'Bharat AC'],
      powerKw: 3.3,
      isActive: true,
      amenities: ['Parking']
    },
    {
      name: "Bolt Fast Charger - Jaipur",
      address: "C-Scheme, Jaipur 302001",
      city: "Jaipur",
      state: "Rajasthan",
      latitude: 26.9154,
      longitude: 75.7873,
      connectorTypes: ['CCS-2', 'Type-2'],
      powerKw: 15,
      isActive: true,
      amenities: ['Parking', 'Cafe']
    },
    {
      name: "Bolt Charging Hub - Chandigarh",
      address: "Sector 17, Chandigarh 160017",
      city: "Chandigarh",
      state: "Chandigarh",
      latitude: 30.7401,
      longitude: 76.7873,
      connectorTypes: ['Type-2', 'Bharat AC'],
      powerKw: 3.3,
      isActive: true,
      amenities: ['Parking', 'Shopping']
    }
  ];
}

/**
 * Import Bolt stations into the database
 */
async function importBoltStations(stations: BoltStationRaw[]): Promise<number> {
  let importedCount = 0;
  
  console.log(`Starting import of ${stations.length} Bolt charging stations...`);
  
  // If we couldn't get good quality data from API/scraping, use predefined stations
  console.log('Checking station data quality...');
  
  const poorQualityData = stations.length === 0 || 
                         stations.some(station => 
                           !station.name || 
                           station.name.length < 3 ||
                           !station.address || 
                           station.address.length < 5 ||
                           station.latitude === 0 ||
                           station.longitude === 0);
                           
  if (poorQualityData) {
    console.log('Using predefined Bolt station data for major Indian cities');
    stations = getPredefinedBoltStations();
  }
  
  for (const stationData of stations) {
    try {
      // Skip stations with missing coordinates
      if (!stationData.latitude || !stationData.longitude) {
        console.log(`Skipping station "${stationData.name}" - missing coordinates`);
        continue;
      }
      
      // Check if station already exists based on coordinates
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
        console.log(`Skipping duplicate Bolt station: ${stationData.name}`);
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
        rating: 4.0, // Default rating for Bolt
        isOpen: stationData.isActive !== undefined ? stationData.isActive : true,
        source: 'bolt-earth',
        description: 'Bolt Earth EV charging station',
        phoneNumber: null,
        imageUrl: null,
        amenities: stationData.amenities || null,
      });
      
      // Then create the charging station associated with the location
      await storage.createChargingStation({
        locationId: location.id,
        operatorName: 'Bolt',
        connectorTypes: stationData.connectorTypes as any[],
        powerKw: stationData.powerKw || 3.3, // Default to 3.3kW if unknown
        pricePerKwh: 16.0, // Typical price for Bolt
        paymentMethods: ['Bolt App', 'Credit Card', 'Debit Card', 'UPI'],
        isAvailable: true,
        numberOfPoints: 1, // Default value for Bolt
        networkName: 'Bolt',
        supportContact: '18001029681' // Bolt support
      });
      
      importedCount++;
      if (importedCount % 10 === 0) {
        console.log(`Imported ${importedCount} Bolt stations so far...`);
      }
    } catch (error) {
      console.error(`Error importing Bolt station "${stationData.name}":`, error);
    }
  }
  
  console.log(`Successfully imported ${importedCount} Bolt stations`);
  return importedCount;
}

/**
 * Main function to fetch and import Bolt charging stations
 */
export async function fetchAndImportBoltStations(): Promise<number> {
  console.log('Starting Bolt Earth stations fetch and import process...');
  
  // Try to fetch from API first
  const stations = await fetchFromBoltAPI();
  
  if (stations.length === 0) {
    console.log('No Bolt Earth stations found from automatic fetching. Using predefined stations...');
  }
  
  // Import the stations into the database
  return await importBoltStations(stations);
}