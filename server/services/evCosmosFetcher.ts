/**
 * EVCosmos Fetcher Service
 * 
 * This service is responsible for fetching EV charging station data from EVCosmos.in
 * and importing it into our application database.
 * 
 * EVCosmos.in provides a comprehensive list of EV charging stations across India.
 * Source: https://evcosmos.in/list-of-chargers.php
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { storage } from '../storage';

// Target URL for scraping
const EVCOSMOS_URL = 'https://evcosmos.in/list-of-chargers.php';

// Types for EVCosmos station data
interface EVCosmosStationRaw {
  name: string;
  address: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  connectorTypes?: string[];
  powerKw?: number;
  operatorName?: string;
  openingHours?: string;
}

/**
 * Fetch the EVCosmos webpage
 */
async function fetchEVCosmosPage(): Promise<string | null> {
  try {
    console.log('Fetching EV charging station data from EVCosmos.in...');
    const response = await axios.get(EVCOSMOS_URL, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
      }
    });

    if (response.status === 200 && response.data) {
      console.log('Successfully fetched data from EVCosmos.in');
      return response.data;
    }
    console.error('Failed to fetch data from EVCosmos.in: Invalid response');
    return null;
  } catch (error) {
    console.error('Error fetching data from EVCosmos.in:', error);
    return null;
  }
}

/**
 * Parse the EVCosmos webpage to extract station data
 */
function parseEVCosmosPage(html: string): EVCosmosStationRaw[] {
  try {
    const stations: EVCosmosStationRaw[] = [];
    const $ = cheerio.load(html);
    
    console.log('Parsing EVCosmos.in data...');

    // Find and parse tables containing charging station data
    $('table.table').each((tableIndex, tableElement) => {
      // Get table heading to determine network operator
      const tableHeading = $(tableElement).prev('h2, h3, h4').text().trim();
      let operatorName = 'Unknown';
      
      // Extract operator name from heading
      if (tableHeading) {
        if (tableHeading.includes('EESL')) operatorName = 'EESL';
        else if (tableHeading.includes('Tata Power')) operatorName = 'Tata Power';
        else if (tableHeading.includes('Fortum')) operatorName = 'Fortum';
        else if (tableHeading.includes('Ather')) operatorName = 'Ather Energy';
        else if (tableHeading.includes('Magenta')) operatorName = 'Magenta Power';
        else if (tableHeading.includes('HPCL')) operatorName = 'HPCL';
        else if (tableHeading.includes('Kazam')) operatorName = 'Kazam';
        else if (tableHeading.includes('Jio-bp')) operatorName = 'Reliance Jio-bp';
        else if (tableHeading.includes('ReVolt')) operatorName = 'ReVolt';
        else if (tableHeading.includes('BPCL')) operatorName = 'BPCL';
        else operatorName = tableHeading.split(' ')[0]; // Use first word as operator name
      }
      
      console.log(`Processing table for operator: ${operatorName}`);
      
      // Find all rows in the table
      const rows = $(tableElement).find('tr');
      if (rows.length <= 1) {
        console.log(`No data rows found for operator: ${operatorName}`);
        return; // Skip tables with only header row
      }
      
      // Process each row (skip header row)
      rows.each((rowIndex, rowElement) => {
        if (rowIndex === 0) return; // Skip header row
        
        const cols = $(rowElement).find('td');
        if (cols.length < 3) {
          return; // Skip rows with insufficient columns
        }
        
        // Parse basic station details
        const name = $(cols[0]).text().trim();
        const address = $(cols[1]).text().trim();
        
        // Skip rows with empty name or address
        if (!name || !address) return;
        
        // Extract charging types/connectors
        const connectorsText = $(cols[2]).text().trim();
        let connectorTypes: string[] = [];
        let powerKw = 0;
        
        // Parse connector types and power
        if (connectorsText) {
          if (connectorsText.includes('CCS')) connectorTypes.push('CCS-2');
          if (connectorsText.includes('CHAdeMO')) connectorTypes.push('CHAdeMO');
          if (connectorsText.includes('Type 2') || connectorsText.includes('Type-2')) connectorTypes.push('Type-2');
          if (connectorsText.includes('Bharat AC')) connectorTypes.push('Bharat AC');
          if (connectorsText.includes('Bharat DC')) connectorTypes.push('Bharat DC');
          
          // If no specific connectors found, add a default based on AC/DC mention
          if (connectorTypes.length === 0) {
            if (connectorsText.includes('DC')) connectorTypes.push('CCS-2');
            if (connectorsText.includes('AC')) connectorTypes.push('Type-2');
          }
          
          // Extract power rating if available
          const powerMatch = connectorsText.match(/(\d+)\s*kW/i);
          if (powerMatch && powerMatch[1]) {
            powerKw = parseInt(powerMatch[1], 10);
          } else if (connectorsText.includes('DC')) {
            // Default power values based on charger type
            powerKw = 50; // Default DC power
          } else if (connectorsText.includes('AC')) {
            powerKw = 22; // Default AC power
          }
        }
        
        // If still no connector types, add a default
        if (connectorTypes.length === 0) {
          connectorTypes.push('Type-2'); // Default to Type-2 as most common in India
        }
        
        // Attempt to extract city and state from address
        const addressParts = address.split(',').map(part => part.trim());
        let city = '';
        let state = '';
        
        // Try to extract state from the last part of address
        if (addressParts.length > 0) {
          const lastPart = addressParts[addressParts.length - 1];
          // Check if the last part contains a pincode
          const pincodeMatch = lastPart.match(/\d{6}/);
          if (pincodeMatch) {
            // If pincode exists, state is likely before it
            state = lastPart.replace(/\d{6}/, '').trim();
            // City is likely the part before state
            if (addressParts.length > 1) {
              city = addressParts[addressParts.length - 2];
            }
          } else {
            // If no pincode, the last part is likely the state
            state = lastPart;
            // And second last part is likely the city
            if (addressParts.length > 1) {
              city = addressParts[addressParts.length - 2];
            }
          }
        }
        
        // Add station to results
        stations.push({
          name,
          address,
          city,
          state,
          connectorTypes,
          powerKw,
          operatorName,
          // We don't have exact coordinates from EVCosmos, will need geocoding
        });
      });
    });

    console.log(`Parsed ${stations.length} stations from EVCosmos.in`);
    return stations;
  } catch (error) {
    console.error('Error parsing EVCosmos.in data:', error);
    return [];
  }
}

/**
 * Geocode station addresses to get coordinates
 */
async function geocodeStationAddresses(stations: EVCosmosStationRaw[]): Promise<EVCosmosStationRaw[]> {
  const enhancedStations: EVCosmosStationRaw[] = [];
  console.log(`Geocoding ${stations.length} station addresses...`);
  
  for (const station of stations) {
    try {
      // Skip stations that already have coordinates
      if (station.latitude && station.longitude) {
        enhancedStations.push(station);
        continue;
      }
      
      // Prepare geocoding query
      let query = station.address;
      if (station.city) query += `, ${station.city}`;
      if (station.state) query += `, ${station.state}`;
      query += ', India'; // Always add country for better accuracy
      
      // Call Google Geocoding API
      try {
        // Use our existing Google geocoding function
        const location = await geocodeAddress(query);
        if (location && location.lat && location.lng) {
          station.latitude = location.lat;
          station.longitude = location.lng;
          enhancedStations.push(station);
          console.log(`Geocoded: ${station.name} (${station.latitude}, ${station.longitude})`);
        } else {
          console.log(`Failed to geocode: ${station.name} - Address: ${query}`);
          // Add to results anyway, we'll skip it during import if still missing coordinates
          enhancedStations.push(station);
        }
      } catch (geocodeError) {
        console.error(`Error geocoding station "${station.name}":`, geocodeError);
        enhancedStations.push(station);
      }
      
      // Sleep to avoid rate limits (if using Google geocoding API)
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`Error processing station "${station.name}":`, error);
    }
  }
  
  console.log(`Geocoded ${enhancedStations.filter(s => s.latitude && s.longitude).length}/${stations.length} stations`);
  return enhancedStations;
}

/**
 * Geocode an address to get coordinates
 * Using Google Maps Geocoding API
 */
async function geocodeAddress(address: string): Promise<{lat: number, lng: number} | null> {
  try {
    // Check if API key exists
    if (!process.env.GOOGLE_PLACES_API_KEY) {
      console.error('Google Places API key not found');
      return null;
    }
    
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address,
        key: process.env.GOOGLE_PLACES_API_KEY,
        region: 'in' // Bias results to India
      }
    });
    
    if (response.data.status === 'OK' && response.data.results && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }
    
    console.error(`Geocoding error: ${response.data.status} for address: ${address}`);
    return null;
  } catch (error) {
    console.error('Error during geocoding:', error);
    return null;
  }
}

/**
 * Import stations into the database
 */
async function importEVCosmosStations(stations: EVCosmosStationRaw[]): Promise<number> {
  let importedCount = 0;
  
  console.log(`Starting import of ${stations.length} EVCosmos stations...`);
  
  for (const stationData of stations) {
    try {
      // Skip stations with missing coordinates
      if (!stationData.latitude || !stationData.longitude) {
        console.log(`Skipping station "${stationData.name}" - missing coordinates`);
        continue;
      }
      
      // Check if station already exists based on coordinates and name similarity
      const existingStations = await storage.getChargeStationsWithinRadius(
        stationData.latitude,
        stationData.longitude,
        0.2 // 200 meters radius to detect duplicates
      );
      
      const isDuplicate = existingStations.some(existing => {
        // Check if name contains similar words
        const existingWords = existing.name.toLowerCase().split(/\s+/);
        const newWords = stationData.name.toLowerCase().split(/\s+/);
        const commonWords = existingWords.filter(word => newWords.includes(word));
        
        // If at least 2 words match or over 50% of words match, consider it a duplicate
        return commonWords.length >= 2 || 
               (commonWords.length / Math.min(existingWords.length, newWords.length) > 0.5);
      });
      
      if (isDuplicate) {
        console.log(`Skipping duplicate station: ${stationData.name}`);
        continue;
      }
      
      // Determine network name based on operator
      let networkName = stationData.operatorName || 'Unknown Network';
      let providerId = 'unknown';
      
      if (networkName.includes('Tata')) {
        providerId = 'tata-power';
        networkName = 'Tata Power';
      } else if (networkName.includes('Jio') || networkName.includes('Reliance')) {
        providerId = 'jio-bp';
        networkName = 'Jio-bp Pulse';
      } else if (networkName.includes('HPCL')) {
        providerId = 'hpcl';
        networkName = 'HPCL';
      } else if (networkName.includes('BPCL')) {
        providerId = 'bpcl';
        networkName = 'BPCL';
      } else if (networkName.includes('IOCL') || networkName.includes('Indian Oil')) {
        providerId = 'efill';
        networkName = 'eFill (Indian Oil)';
      } else if (networkName.includes('Ather')) {
        providerId = 'ather';
        networkName = 'Ather Grid';
      } else if (networkName.includes('Kazam')) {
        providerId = 'kazam';
        networkName = 'Kazam';
      } else if (networkName.includes('Fortum')) {
        providerId = 'fortum';
        networkName = 'Fortum Charge & Drive';
      } else if (networkName.includes('EESL')) {
        providerId = 'eesl';
        networkName = 'EESL';
      } else {
        providerId = 'evcosmos';
        networkName = stationData.operatorName || 'EVCosmos Network';
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
        isOpen: true,
        source: 'evcosmos',
        description: `${networkName} EV charging station.`,
        phoneNumber: null,
        imageUrl: null,
        amenities: null,
      });
      
      // Then create the charging station associated with the location
      await storage.createChargingStation({
        locationId: location.id,
        operatorName: networkName,
        connectorTypes: stationData.connectorTypes as any[],
        powerKw: stationData.powerKw || 22, // Default to 22kW if unknown
        pricePerKwh: null, // Price not provided by EVCosmos
        paymentMethods: ['UPI', 'Credit Card', 'Debit Card', 'Mobile App'],
        isAvailable: true,
        numberOfPoints: 2, // Default value
        networkName: networkName,
        supportContact: null,
        openingHours: stationData.openingHours || '24x7'
      });
      
      importedCount++;
      if (importedCount % 20 === 0) {
        console.log(`Imported ${importedCount} EVCosmos stations so far...`);
      }
    } catch (error) {
      console.error(`Error importing EVCosmos station "${stationData.name}":`, error);
    }
  }
  
  console.log(`Successfully imported ${importedCount} EVCosmos stations`);
  return importedCount;
}

/**
 * Public function to fetch and import EVCosmos stations
 */
export async function fetchAndImportEVCosmosStations(): Promise<number> {
  console.log('Starting EVCosmos stations fetch and import process...');
  
  // Fetch page content
  const html = await fetchEVCosmosPage();
  if (!html) {
    console.error('Failed to fetch data from EVCosmos.in');
    return 0;
  }
  
  // Parse page to extract station data
  const stations = parseEVCosmosPage(html);
  if (stations.length === 0) {
    console.error('No stations found on EVCosmos.in');
    return 0;
  }
  
  // Geocode addresses to get coordinates
  const geocodedStations = await geocodeStationAddresses(stations);
  
  // Import stations into database
  return await importEVCosmosStations(geocodedStations);
}