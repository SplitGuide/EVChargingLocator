/**
 * ChargeZone Fetcher Service
 * 
 * This service is responsible for fetching EV charging station data from ChargeZone.co.in
 * and importing it into our application database.
 * 
 * ChargeZone is one of India's growing EV charging networks with stations across the country.
 * Source: https://www.chargezone.co.in/charge-locator
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { storage } from '../storage';

// Target URL for ChargeZone's charge locator
const CHARGEZONE_URL = 'https://www.chargezone.co.in/charge-locator';

// API endpoint that might be used by ChargeZone
const CHARGEZONE_API_URL = 'https://www.chargezone.co.in/api/locations';
const CHARGEZONE_API_ALT_URL = 'https://api.chargezone.co.in/v2/locations';

// Types for ChargeZone station data
interface ChargeZoneStationRaw {
  id?: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  landmark?: string;
  latitude: number;
  longitude: number;
  connectorTypes?: string[];
  powerKw?: number;
  isActive?: boolean;
  amenities?: string[];
  openingHours?: string;
}

/**
 * Attempt to fetch charging station data directly from ChargeZone's API
 */
async function fetchFromChargeZoneAPI(): Promise<ChargeZoneStationRaw[]> {
  try {
    console.log('Attempting to fetch charging stations from ChargeZone API...');
    
    // Try the first API URL
    let response = await axios.get(CHARGEZONE_API_URL, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
        'Origin': 'https://www.chargezone.co.in',
        'Referer': 'https://www.chargezone.co.in/charge-locator'
      }
    }).catch(() => null);
    
    // If first URL fails, try the alternate API URL
    if (!response) {
      console.log('First API URL failed, trying alternate API URL...');
      response = await axios.get(CHARGEZONE_API_ALT_URL, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
          'Origin': 'https://www.chargezone.co.in',
          'Referer': 'https://www.chargezone.co.in/charge-locator'
        }
      }).catch(() => null);
    }

    if (response && response.status === 200 && response.data) {
      console.log('Successfully fetched data from ChargeZone API');
      
      // Process API response
      const stations = processAPIResponse(response.data);
      return stations;
    }
    
    console.log('Failed to fetch data from ChargeZone API: Invalid response or no data');
    return [];
  } catch (error) {
    console.log('Failed to fetch data from ChargeZone API:', error);
    return [];
  }
}

/**
 * Process ChargeZone API response to extract station data
 */
function processAPIResponse(data: any): ChargeZoneStationRaw[] {
  try {
    const stations: ChargeZoneStationRaw[] = [];
    
    // Check for different API response formats
    if (Array.isArray(data)) {
      // Format 1: Direct array of stations
      data.forEach((item: any) => {
        if (item.latitude && item.longitude) {
          stations.push(parseStationData(item));
        }
      });
    } else if (data.locations && Array.isArray(data.locations)) {
      // Format 2: Object with locations array
      data.locations.forEach((item: any) => {
        if (item.latitude && item.longitude) {
          stations.push(parseStationData(item));
        }
      });
    } else if (data.data && Array.isArray(data.data)) {
      // Format 3: Object with data array
      data.data.forEach((item: any) => {
        if (item.latitude && item.longitude) {
          stations.push(parseStationData(item));
        }
      });
    } else if (data.data && data.data.locations && Array.isArray(data.data.locations)) {
      // Format 4: Nested data.locations array
      data.data.locations.forEach((item: any) => {
        if (item.latitude && item.longitude) {
          stations.push(parseStationData(item));
        }
      });
    }
    
    console.log(`Processed ${stations.length} stations from ChargeZone API`);
    return stations;
  } catch (error) {
    console.error('Error processing ChargeZone API response:', error);
    return [];
  }
}

/**
 * Parse station data from API response
 */
function parseStationData(item: any): ChargeZoneStationRaw {
  // Handle different property naming conventions
  const latitude = parseFloat(item.latitude || item.lat || '0');
  const longitude = parseFloat(item.longitude || item.lng || '0');
  
  // Extract connector types
  const connectorTypes = [];
  
  if (item.connectors && Array.isArray(item.connectors)) {
    item.connectors.forEach((connector: any) => {
      const type = connector.type || connector.connectorType;
      if (type) {
        connectorTypes.push(normalizeConnectorType(type));
      }
    });
  } else if (item.connectorTypes && Array.isArray(item.connectorTypes)) {
    item.connectorTypes.forEach((type: string) => {
      connectorTypes.push(normalizeConnectorType(type));
    });
  } else if (item.connectorType || item.connector_type) {
    connectorTypes.push(normalizeConnectorType(item.connectorType || item.connector_type));
  }
  
  // If no connectors found, default to Type-2 (common in India)
  if (connectorTypes.length === 0) {
    connectorTypes.push('Type-2');
  }
  
  // Extract power in kW
  let powerKw = 0;
  if (item.power || item.powerKw || item.power_kw) {
    powerKw = parseFloat(item.power || item.powerKw || item.power_kw || '0');
  } else if (item.connectors && Array.isArray(item.connectors)) {
    // Get maximum power from connectors
    item.connectors.forEach((connector: any) => {
      const connectorPower = parseFloat(connector.power || connector.powerKw || '0');
      if (connectorPower > powerKw) {
        powerKw = connectorPower;
      }
    });
  }
  
  // Default power based on connector types if not available
  if (powerKw === 0) {
    if (connectorTypes.includes('CCS-2') || connectorTypes.includes('CHAdeMO')) {
      powerKw = 50; // Default DC power
    } else {
      powerKw = 22; // Default AC power
    }
  }
  
  // Extract amenities
  const amenities: string[] = [];
  if (item.amenities && Array.isArray(item.amenities)) {
    item.amenities.forEach((amenity: string) => {
      amenities.push(amenity);
    });
  }
  
  // Parse address components
  let city = item.city || '';
  let state = item.state || '';
  const address = item.address || item.fullAddress || '';
  
  // If city/state not available, try to extract from address
  if (!city || !state) {
    const addressParts = address.split(',').map(part => part.trim());
    
    if (!city && addressParts.length >= 2) {
      city = addressParts[addressParts.length - 2];
    }
    
    if (!state && addressParts.length >= 1) {
      state = addressParts[addressParts.length - 1].replace(/\d+/g, '').trim();
    }
  }
  
  return {
    id: item.id || item._id || undefined,
    name: item.name || 'ChargeZone Charging Station',
    address: address,
    city: city,
    state: state,
    landmark: item.landmark || undefined,
    latitude: latitude,
    longitude: longitude,
    connectorTypes: connectorTypes,
    powerKw: powerKw,
    isActive: item.isActive !== undefined ? item.isActive : (item.status === 'active'),
    amenities: amenities.length > 0 ? amenities : undefined,
    openingHours: item.openingHours || item.opening_hours || '24x7'
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
 * Scrape the ChargeZone webpage to extract station data
 */
async function scrapeFromChargeZoneWebpage(): Promise<ChargeZoneStationRaw[]> {
  try {
    console.log('Fetching ChargeZone charge-locator webpage...');
    const response = await axios.get(CHARGEZONE_URL, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      }
    });

    if (response.status !== 200 || !response.data) {
      console.log('Failed to fetch ChargeZone webpage');
      return [];
    }

    console.log('Successfully fetched ChargeZone webpage, parsing data...');
    return parseWebpage(response.data);
  } catch (error) {
    console.error('Error scraping ChargeZone webpage:', error);
    return [];
  }
}

/**
 * Parse the webpage HTML to extract embedded JSON data or scrape DOM content
 */
function parseWebpage(html: string): ChargeZoneStationRaw[] {
  try {
    const stations: ChargeZoneStationRaw[] = [];
    const $ = cheerio.load(html);
    
    // Look for embedded JSON data in script tags
    let jsonData: any = null;
    
    $('script').each((i, element) => {
      const scriptContent = $(element).html() || '';
      
      // Look for data patterns in script tags
      if (scriptContent.includes('chargeStations') || 
          scriptContent.includes('locations') || 
          scriptContent.includes('chargePoints')) {
        try {
          // Try different regex patterns to extract data
          const patterns = [
            /chargeStations\s*=\s*(\[.*?\]);/s,
            /locations\s*=\s*(\[.*?\]);/s,
            /chargePoints\s*=\s*(\[.*?\]);/s,
            /window\.initialData\s*=\s*({.*?});/s,
            /const\s+stations\s*=\s*(\[.*?\]);/s,
            /var\s+stations\s*=\s*(\[.*?\]);/s
          ];
          
          for (const pattern of patterns) {
            const match = scriptContent.match(pattern);
            if (match && match[1]) {
              try {
                const extracted = JSON.parse(match[1]);
                if (Array.isArray(extracted) && extracted.length > 0) {
                  jsonData = extracted;
                  break;
                } else if (extracted && extracted.locations && Array.isArray(extracted.locations)) {
                  jsonData = extracted.locations;
                  break;
                }
              } catch (e) {
                // Continue to next pattern
              }
            }
          }
        } catch (e) {
          // Continue to next script tag
        }
      }
    });
    
    if (jsonData && Array.isArray(jsonData) && jsonData.length > 0) {
      console.log('Found embedded location data in the webpage');
      
      jsonData.forEach((item: any) => {
        // Check if we have lat/lng data
        if ((item.latitude || item.lat) && (item.longitude || item.lng)) {
          const station = parseStationData(item);
          stations.push(station);
        }
      });
      
      return stations;
    }
    
    // If no embedded data, try to extract from DOM elements
    console.log('No embedded data found, scraping from DOM elements...');
    
    // Look for station lists, tables, or map pins
    $('.station-item, .location-card, .map-pin, .station-list tr').each((i, element) => {
      try {
        // Extract data from DOM elements
        const name = $(element).find('.station-name, .name, .title, h3').text().trim();
        const address = $(element).find('.station-address, .address, .location').text().trim();
        
        // Look for data attributes containing lat/lng
        const latAttr = $(element).attr('data-lat') || $(element).find('[data-lat]').attr('data-lat');
        const lngAttr = $(element).attr('data-lng') || $(element).find('[data-lng]').attr('data-lng');
        
        let latitude = 0;
        let longitude = 0;
        
        if (latAttr && lngAttr) {
          latitude = parseFloat(latAttr);
          longitude = parseFloat(lngAttr);
        }
        
        // Only add stations with valid data
        if (name && address && latitude && longitude) {
          stations.push({
            name,
            address,
            latitude,
            longitude,
            connectorTypes: ['Type-2', 'CCS-2'], // Default assumption for ChargeZone
            powerKw: 60, // Default assumption
          });
        }
      } catch (e) {
        // Skip this element if parsing fails
      }
    });
    
    console.log(`Scraped ${stations.length} stations from ChargeZone webpage`);
    return stations;
  } catch (error) {
    console.error('Error parsing ChargeZone webpage:', error);
    return [];
  }
}

/**
 * Import ChargeZone stations into the database
 */
async function importChargeZoneStations(stations: ChargeZoneStationRaw[]): Promise<number> {
  let importedCount = 0;
  
  console.log(`Starting import of ${stations.length} ChargeZone stations...`);
  
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
        0.2 // 200 meters radius to detect duplicates
      );
      
      const isDuplicate = existingStations.some(existing => {
        return existing.name.includes('ChargeZone') || 
               existing.name === stationData.name ||
               (existing.source && existing.source.includes('chargezone'));
      });
      
      if (isDuplicate) {
        console.log(`Skipping duplicate station: ${stationData.name}`);
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
        rating: 4.2, // Default rating
        isOpen: stationData.isActive !== undefined ? stationData.isActive : true,
        source: 'chargezone',
        description: 'ChargeZone EV charging station',
        phoneNumber: null,
        imageUrl: null,
        amenities: stationData.amenities || null,
      });
      
      // Then create the charging station associated with the location
      await storage.createChargingStation({
        locationId: location.id,
        operatorName: 'ChargeZone',
        connectorTypes: stationData.connectorTypes as any[],
        powerKw: stationData.powerKw || 60, // Default to 60kW if unknown
        pricePerKwh: null, // Price not provided
        paymentMethods: ['Credit Card', 'Debit Card', 'UPI', 'ChargeZone App'],
        isAvailable: true,
        numberOfPoints: 2, // Default value
        networkName: 'ChargeZone',
        supportContact: null
      });
      
      importedCount++;
      if (importedCount % 10 === 0) {
        console.log(`Imported ${importedCount} ChargeZone stations so far...`);
      }
    } catch (error) {
      console.error(`Error importing ChargeZone station "${stationData.name}":`, error);
    }
  }
  
  console.log(`Successfully imported ${importedCount} ChargeZone stations`);
  return importedCount;
}

/**
 * Public function to fetch and import ChargeZone charging stations
 */
export async function fetchAndImportChargeZoneStations(): Promise<number> {
  console.log('Starting ChargeZone stations fetch and import process...');
  
  // Try to fetch from API first
  let stations = await fetchFromChargeZoneAPI();
  
  // If API fetch fails, try scraping the webpage
  if (stations.length === 0) {
    console.log('API fetch failed, attempting to scrape webpage...');
    stations = await scrapeFromChargeZoneWebpage();
  }
  
  if (stations.length === 0) {
    console.log('No ChargeZone stations found from automatic fetching.');
    
    // Add a few sample stations as a fallback
    stations = getSampleChargeZoneStations();
  }
  
  // Import stations into database
  return await importChargeZoneStations(stations);
}

/**
 * Create sample ChargeZone stations data as a fallback
 */
function getSampleChargeZoneStations(): ChargeZoneStationRaw[] {
  return [
    {
      name: 'ChargeZone - Tata Motors, Sanand',
      address: 'Tata Motors Ltd, Sanand Industrial Estate, Sanand, Gujarat 382170',
      city: 'Sanand',
      state: 'Gujarat',
      latitude: 22.9821,
      longitude: 72.3819,
      connectorTypes: ['CCS-2', 'Type-2'],
      powerKw: 60,
      isActive: true
    },
    {
      name: 'ChargeZone - Express Avenue Mall',
      address: 'Express Avenue Mall, Whites Road, Royapettah, Chennai, Tamil Nadu 600014',
      city: 'Chennai',
      state: 'Tamil Nadu',
      latitude: 13.0593,
      longitude: 80.2648,
      connectorTypes: ['CCS-2', 'CHAdeMO', 'Type-2'],
      powerKw: 50,
      isActive: true
    },
    {
      name: 'ChargeZone - Phoenix Marketcity',
      address: 'Phoenix Marketcity, Mahadevapura, Bengaluru, Karnataka 560048',
      city: 'Bengaluru',
      state: 'Karnataka',
      latitude: 12.9984,
      longitude: 77.6960,
      connectorTypes: ['CCS-2', 'Type-2'],
      powerKw: 60,
      isActive: true
    }
  ];
}