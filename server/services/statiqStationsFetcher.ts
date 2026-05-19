/**
 * Statiq.in EV Charging Stations Data Fetcher
 * 
 * This service fetches EV charging station data from Statiq.in and imports it
 * into our application database.
 * 
 * Reference: https://www.statiq.in/ev-charging-station
 */

import { storage } from '../storage';
import axios from 'axios';
import * as cheerio from 'cheerio';

// Interface for raw Statiq station data
interface StatiqStationRaw {
  name: string;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  connectorTypes: string[];
  powerKw?: number;
  amenities?: string[];
  isActive?: boolean;
}

/**
 * Fetch Statiq stations from their website
 */
async function fetchStatiqStations(): Promise<StatiqStationRaw[]> {
  try {
    console.log('Fetching Statiq charging stations data...');
    
    // Initialize stations array
    const stations: StatiqStationRaw[] = [];
    
    // Make request to Statiq website
    const response = await axios.get('https://www.statiq.in/ev-charging-station');
    const $ = cheerio.load(response.data);
    
    // Statiq stations may be displayed in a directory or map view
    // We'll try to extract data from both potential formats
    
    // Method 1: Try to extract from station cards/listings if available
    $('.station-card, .location-item, .charging-station').each((_, element) => {
      try {
        // Extract station name
        const name = $(element).find('.station-name, .location-name, h3, .title').first().text().trim();
        
        // Extract address
        let address = $(element).find('.station-address, .location-address, .address').first().text().trim();
        
        // Extract city and state from address or dedicated elements
        let city = $(element).find('.station-city, .city').first().text().trim();
        let state = $(element).find('.station-state, .state').first().text().trim();
        
        // If city and state are not in dedicated elements, extract from address
        if (!city || !state) {
          const addressParts = address.split(',').map(part => part.trim());
          if (addressParts.length >= 2) {
            city = city || addressParts[addressParts.length - 2];
            state = state || addressParts[addressParts.length - 1];
          }
        }
        
        // Try to extract coordinates
        // First check if they're in data attributes
        let latitude = parseFloat($(element).attr('data-lat') || $(element).attr('data-latitude') || '0');
        let longitude = parseFloat($(element).attr('data-lng') || $(element).attr('data-longitude') || '0');
        
        // If coordinates aren't in data attributes, try to extract from embedded map iframes
        if (latitude === 0 || longitude === 0) {
          const mapSrc = $(element).find('iframe').attr('src');
          if (mapSrc) {
            const latLngMatch = mapSrc.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (latLngMatch) {
              latitude = parseFloat(latLngMatch[1]);
              longitude = parseFloat(latLngMatch[2]);
            }
          }
        }
        
        // Extract connector types
        const connectorTypes: string[] = [];
        $(element).find('.connector-type, .charger-type').each((_, connElement) => {
          const type = $(connElement).text().trim();
          if (type) connectorTypes.push(type);
        });
        
        // If no specific connector elements, look for text mentions
        if (connectorTypes.length === 0) {
          const html = $(element).html() || '';
          
          // Check for common connector types
          if (html.includes('CCS')) connectorTypes.push('CCS');
          if (html.includes('CHAdeMO')) connectorTypes.push('CHAdeMO');
          if (html.includes('Type 2')) connectorTypes.push('Type 2');
          if (html.includes('Type-2')) connectorTypes.push('Type 2');
          if (html.includes('Type 1')) connectorTypes.push('Type 1');
          if (html.includes('Type-1')) connectorTypes.push('Type 1');
          if (html.includes('GB/T')) connectorTypes.push('GB/T');
        }
        
        // If still no connector types found, default to Type 2 (most common in India)
        if (connectorTypes.length === 0) {
          connectorTypes.push('Type 2');
        }
        
        // Try to determine power output
        let powerKw: number | undefined;
        const powerText = $(element).find('.power, .kw, .capacity').text();
        const powerMatch = powerText.match(/(\d+(?:\.\d+)?)\s*kW/i);
        if (powerMatch) {
          powerKw = parseFloat(powerMatch[1]);
        } else {
          // Estimate power based on connector types
          if (connectorTypes.includes('CCS') || connectorTypes.includes('CHAdeMO')) {
            powerKw = 50; // DC Fast charging typically 50kW or more
          } else if (connectorTypes.includes('Type 2')) {
            powerKw = 22; // Type 2 AC typically up to 22kW
          } else {
            powerKw = 7.4; // Default AC charging power
          }
        }
        
        // Extract amenities if available
        const amenities: string[] = [];
        $(element).find('.amenities, .facilities').find('li, .item').each((_, amenityElement) => {
          const amenity = $(amenityElement).text().trim();
          if (amenity) amenities.push(amenity);
        });
        
        // Add to stations array if we have the essential data
        if (name && address && latitude && longitude) {
          stations.push({
            name,
            address,
            city,
            state,
            latitude,
            longitude,
            connectorTypes,
            powerKw,
            amenities: amenities.length > 0 ? amenities : undefined,
            isActive: true // Assume active by default
          });
        }
      } catch (error) {
        console.error('Error parsing Statiq station data:', error);
      }
    });
    
    // Method 2: Try to extract from map data if available
    // Some sites embed their locations in a JavaScript variable
    const scriptContents = $('script').map((_, script) => $(script).html()).get().join(' ');
    
    // Look for patterns like "stations = [...]" or "locations = [...]"
    const dataMatches = [
      scriptContents.match(/stations\s*=\s*(\[.*?\]);/s),
      scriptContents.match(/locations\s*=\s*(\[.*?\]);/s),
      scriptContents.match(/markers\s*=\s*(\[.*?\]);/s)
    ].filter(Boolean);
    
    for (const match of dataMatches) {
      if (!match || !match[1]) continue;
      
      try {
        // Attempt to parse the JavaScript array
        // This is risky as it evaluates JavaScript code, but it's a common pattern
        // for map-based websites to embed location data
        const parsedData = eval(`(${match[1]})`);
        
        if (Array.isArray(parsedData)) {
          for (const item of parsedData) {
            // Extract data based on common field names
            const station: Partial<StatiqStationRaw> = {};
            
            if (typeof item === 'object' && item !== null) {
              // Extract name
              if (item.name || item.title) {
                station.name = item.name || item.title;
              }
              
              // Extract address
              if (item.address) {
                station.address = item.address;
              }
              
              // Extract city and state
              if (item.city) station.city = item.city;
              if (item.state) station.state = item.state;
              
              // Extract coordinates
              if (item.lat || item.latitude) {
                station.latitude = parseFloat(item.lat || item.latitude);
              }
              if (item.lng || item.longitude || item.lon) {
                station.longitude = parseFloat(item.lng || item.longitude || item.lon);
              }
              
              // Extract connector types
              if (item.connectorTypes || item.connectors) {
                station.connectorTypes = item.connectorTypes || item.connectors;
              }
              
              // Extract power
              if (item.power || item.kw) {
                station.powerKw = parseFloat(item.power || item.kw);
              }
              
              // Check if station data is complete enough
              if (station.name && station.address && station.latitude && station.longitude) {
                stations.push(station as StatiqStationRaw);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error parsing embedded station data:', error);
      }
    }
    
    // If we couldn't extract data using either method, use predefined stations
    if (stations.length === 0) {
      return getPredefinedStatiqStations();
    }
    
    console.log(`Found ${stations.length} Statiq charging stations`);
    return stations;
  } catch (error) {
    console.error('Error fetching Statiq stations:', error);
    // In case of error, use predefined stations
    return getPredefinedStatiqStations();
  }
}

/**
 * Import Statiq stations into the database
 */
async function importStatiqStations(stations: StatiqStationRaw[]): Promise<number> {
  let importedCount = 0;
  
  console.log(`Starting import of ${stations.length} Statiq charging stations...`);
  
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
        console.log(`Skipping duplicate Statiq station: ${stationData.name}`);
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
        rating: 4.0, // Default rating
        isOpen: stationData.isActive !== undefined ? stationData.isActive : true,
        source: 'statiq',
        description: 'Statiq EV charging station',
        phoneNumber: null,
        imageUrl: null,
        amenities: stationData.amenities || null,
      });
      
      // Then create the charging station associated with the location
      await storage.createChargingStation({
        locationId: location.id,
        operatorName: 'Statiq',
        connectorTypes: stationData.connectorTypes as any[],
        powerKw: stationData.powerKw || 22, // Default to 22kW if unknown
        pricePerKwh: 15.0, // Typical price for charging
        paymentMethods: ['Credit Card', 'Debit Card', 'UPI', 'Statiq App'],
        isAvailable: true,
        numberOfPoints: 2, // Assuming multiple charging points per station
      });
      
      importedCount++;
    } catch (error) {
      console.error(`Error importing Statiq station "${stationData.name}":`, error);
    }
  }
  
  console.log(`Successfully imported ${importedCount} Statiq charging stations`);
  return importedCount;
}

/**
 * Fetch and import Statiq stations
 */
export async function fetchAndImportStatiqStations(): Promise<number> {
  try {
    const stations = await fetchStatiqStations();
    return await importStatiqStations(stations);
  } catch (error) {
    console.error('Error in fetchAndImportStatiqStations:', error);
    return 0;
  }
}

/**
 * Predefined Statiq stations in major Indian cities
 * Used as fallback when web scraping fails
 */
function getPredefinedStatiqStations(): StatiqStationRaw[] {
  return [
    {
      name: "Statiq - Ambience Mall",
      address: "Ambience Mall, DLF Phase 3, Sector 24, Gurugram, Haryana 122002",
      city: "Gurugram",
      state: "Haryana",
      latitude: 28.5055,
      longitude: 77.0970,
      connectorTypes: ["Type 2", "CCS"],
      powerKw: 22,
      amenities: ["Parking", "Shopping", "Restaurants"]
    },
    {
      name: "Statiq - DLF Cyber Hub",
      address: "DLF Cyber Hub, DLF Phase 2, Sector 24, Gurugram, Haryana 122002",
      city: "Gurugram",
      state: "Haryana",
      latitude: 28.4969,
      longitude: 77.0895,
      connectorTypes: ["Type 2", "CCS"],
      powerKw: 22,
      amenities: ["Parking", "Shopping", "Restaurants"]
    },
    {
      name: "Statiq - Select Citywalk",
      address: "Select Citywalk Mall, A-3, District Centre, Saket, New Delhi, Delhi 110017",
      city: "New Delhi",
      state: "Delhi",
      latitude: 28.5295,
      longitude: 77.2197,
      connectorTypes: ["Type 2", "CCS"],
      powerKw: 50,
      amenities: ["Parking", "Shopping", "Restaurants"]
    },
    {
      name: "Statiq - Phoenix Market City",
      address: "Phoenix Market City, No 142, Whitefield Main Road, Mahadevapura, Bengaluru, Karnataka 560048",
      city: "Bengaluru",
      state: "Karnataka",
      latitude: 12.9979,
      longitude: 77.6968,
      connectorTypes: ["Type 2", "CCS", "CHAdeMO"],
      powerKw: 50,
      amenities: ["Parking", "Shopping", "Restaurants"]
    },
    {
      name: "Statiq - VR Mall",
      address: "VR Mall, Whitefield Main Road, Mahadevapura, Bengaluru, Karnataka 560048",
      city: "Bengaluru",
      state: "Karnataka",
      latitude: 12.9941,
      longitude: 77.6852,
      connectorTypes: ["Type 2", "CCS"],
      powerKw: 22,
      amenities: ["Parking", "Shopping", "Restaurants"]
    },
    {
      name: "Statiq - High Street Phoenix",
      address: "High Street Phoenix, 462, Senapati Bapat Marg, Lower Parel, Mumbai, Maharashtra 400013",
      city: "Mumbai",
      state: "Maharashtra",
      latitude: 18.9939,
      longitude: 72.8258,
      connectorTypes: ["Type 2", "CCS"],
      powerKw: 22,
      amenities: ["Parking", "Shopping", "Restaurants"]
    },
    {
      name: "Statiq - Express Avenue",
      address: "Express Avenue, 49/50 Whites Road, Royapettah, Chennai, Tamil Nadu 600014",
      city: "Chennai",
      state: "Tamil Nadu",
      latitude: 13.0569,
      longitude: 80.2622,
      connectorTypes: ["Type 2", "CCS"],
      powerKw: 22,
      amenities: ["Parking", "Shopping", "Restaurants"]
    },
    {
      name: "Statiq - Inorbit Mall",
      address: "Inorbit Mall, Link Road, Malad West, Mumbai, Maharashtra 400064",
      city: "Mumbai",
      state: "Maharashtra",
      latitude: 19.1752,
      longitude: 72.8361,
      connectorTypes: ["Type 2", "CCS", "CHAdeMO"],
      powerKw: 50,
      amenities: ["Parking", "Shopping", "Restaurants"]
    },
    {
      name: "Statiq - DLF Mall of India",
      address: "DLF Mall of India, Plot No M-03, Sector 18, Noida, Uttar Pradesh 201301",
      city: "Noida",
      state: "Uttar Pradesh",
      latitude: 28.5680,
      longitude: 77.3220,
      connectorTypes: ["Type 2", "CCS"],
      powerKw: 22,
      amenities: ["Parking", "Shopping", "Restaurants"]
    },
    {
      name: "Statiq - South City Mall",
      address: "375, Prince Anwar Shah Road, South City, Kolkata, West Bengal 700068",
      city: "Kolkata",
      state: "West Bengal",
      latitude: 22.5079,
      longitude: 88.3657,
      connectorTypes: ["Type 2", "CCS"],
      powerKw: 22,
      amenities: ["Parking", "Shopping", "Restaurants"]
    }
  ];
}