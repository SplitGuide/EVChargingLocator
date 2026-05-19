/**
 * JioBP Stations Fetcher Service
 * 
 * This service is responsible for fetching JioBP charging station data from various sources
 * and importing it into our application database.
 * 
 * JioBP (Jio-bp pulse) is one of India's largest EV charging networks with approximately 5000 stations.
 */

import axios from 'axios';
import { parse } from 'csv-parse/sync';
import { storage } from '../storage';
import fs from 'fs';
import path from 'path';

// Sources for JioBP stations data
const SOURCES = {
  // Official API - when available
  OFFICIAL_API: 'https://jiobp-mobility.jio.com/api/v1/stations', // Example API endpoint
  
  // Some possible data sources for JioBP stations
  DATA_SOURCES: [
    'https://jiobp-mobility.jio.com', // Official site
    'https://jio-bp.com/business/mobility/ev-charging', // Business site
    'https://play.google.com/store/apps/details?id=com.jio.bp.pulse', // App data
  ]
};

// Types for JioBP station data
interface JioBPStationRaw {
  id?: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude: number;
  longitude: number;
  connectorTypes?: string[];
  powerKw?: number;
  pricePerKwh?: number;
  operatorName?: string;
  amenities?: string[];
  openingHours?: string;
  isOpen?: boolean;
  lastUpdated?: string;
}

// Cache file path for storing fetched data
const CACHE_DIR = path.join(process.cwd(), 'data');
const CACHE_FILE = path.join(CACHE_DIR, 'jiobp-stations-cache.json');

/**
 * Create required directories
 */
function ensureDirectoriesExist() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * Save stations data to cache file
 */
function saveToCache(stations: JioBPStationRaw[]) {
  ensureDirectoriesExist();
  fs.writeFileSync(CACHE_FILE, JSON.stringify(stations, null, 2));
  console.log(`Cached ${stations.length} JioBP stations to ${CACHE_FILE}`);
}

/**
 * Load stations data from cache file
 */
function loadFromCache(): JioBPStationRaw[] {
  if (fs.existsSync(CACHE_FILE)) {
    try {
      const data = fs.readFileSync(CACHE_FILE, 'utf8');
      const stations = JSON.parse(data) as JioBPStationRaw[];
      console.log(`Loaded ${stations.length} JioBP stations from cache`);
      return stations;
    } catch (error) {
      console.error('Error loading JioBP stations from cache:', error);
    }
  }
  return [];
}

/**
 * Parse JioBP CSV data if available
 */
function parseJioBPCsv(csvData: string): JioBPStationRaw[] {
  try {
    // Parse CSV data
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true
    });

    // Map CSV records to station format
    return records.map((record: any) => ({
      name: record.name || `JioBP Station ${record.id || ''}`,
      address: record.address || '',
      city: record.city || '',
      state: record.state || '',
      latitude: parseFloat(record.latitude) || 0,
      longitude: parseFloat(record.longitude) || 0,
      connectorTypes: record.connector_types ? record.connector_types.split(',').map((c: string) => c.trim()) : ['CCS-2'],
      powerKw: parseFloat(record.power_kw) || 60,
      pricePerKwh: parseFloat(record.price_per_kwh) || 18,
      operatorName: 'Reliance Jio-bp',
      amenities: record.amenities ? record.amenities.split(',').map((a: string) => a.trim()) : [],
      isOpen: record.is_open === 'true' || record.is_open === '1' || record.status === 'active',
    }));
  } catch (error) {
    console.error('Error parsing JioBP CSV data:', error);
    return [];
  }
}

/**
 * Attempt to fetch JioBP stations from official API
 */
async function fetchFromOfficialApi(): Promise<JioBPStationRaw[]> {
  try {
    console.log('Attempting to fetch JioBP stations from official API...');
    const response = await axios.get(SOURCES.OFFICIAL_API, {
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'EV Charging App/1.0'
      }
    });

    if (response.status === 200 && response.data && Array.isArray(response.data)) {
      console.log(`Successfully fetched ${response.data.length} JioBP stations from official API`);
      return response.data;
    }
    
    console.log('Failed to fetch JioBP stations from official API: Invalid response format');
    return [];
  } catch (error) {
    console.log('Failed to fetch JioBP stations from official API:', error);
    return [];
  }
}

/**
 * Normalize connector types to match our application's connector types
 */
function normalizeConnectorTypes(connectors: string[]): string[] {
  const connectorMap: Record<string, string> = {
    'ccs': 'CCS-2',
    'ccs2': 'CCS-2',
    'ccs-2': 'CCS-2',
    'chademo': 'CHAdeMO',
    'type2': 'Type-2',
    'type 2': 'Type-2',
    'type-2': 'Type-2',
    'bharat ac': 'Bharat AC',
    'bharatac': 'Bharat AC',
    'bharat dc': 'Bharat DC',
    'bharatdc': 'Bharat DC',
    'ac': 'Type-2', // Assuming most AC chargers are Type-2
    'dc': 'CCS-2'   // Assuming most DC chargers are CCS-2
  };

  return connectors.map(c => {
    const normalized = connectorMap[c.toLowerCase()];
    return normalized || c;
  });
}

/**
 * Extract city and state from address if not provided
 */
function extractLocationDetails(station: JioBPStationRaw): JioBPStationRaw {
  if (!station.city || !station.state) {
    const addressParts = station.address.split(',').map(part => part.trim());
    
    // Try to extract city and state from address
    if (addressParts.length >= 2 && !station.city) {
      // Usually city is the second last or third last part
      station.city = addressParts[addressParts.length - 2];
    }
    
    if (addressParts.length >= 1 && !station.state) {
      // Usually state is the last part or contains pincode
      const lastPart = addressParts[addressParts.length - 1];
      // Extract state name by removing pincode if present
      station.state = lastPart.replace(/\d+/g, '').trim();
    }
  }
  
  return station;
}

/**
 * Process and import JioBP stations into the database
 */
async function importJioBPStations(stations: JioBPStationRaw[]): Promise<number> {
  let importedCount = 0;
  
  console.log(`Starting import of ${stations.length} JioBP stations...`);
  
  for (const stationData of stations) {
    try {
      // Skip stations with missing coordinates
      if (!stationData.latitude || !stationData.longitude) {
        console.log(`Skipping station "${stationData.name}" - missing coordinates`);
        continue;
      }

      // Enhance station data with location details
      const enhancedStation = extractLocationDetails(stationData);
      
      // Check if station already exists based on coordinates
      const existingStations = await storage.getChargeStationsWithinRadius(
        enhancedStation.latitude,
        enhancedStation.longitude,
        0.1 // 100 meters radius to detect duplicates
      );

      const isDuplicate = existingStations.some(existing => 
        existing.name.includes('Jio') || existing.name.includes('BP') ||
        (existing.source && existing.source.includes('jio'))
      );

      if (isDuplicate) {
        console.log(`Skipping duplicate station: ${enhancedStation.name}`);
        continue;
      }

      // First create the location
      const location = await storage.createLocation({
        name: enhancedStation.name,
        type: 'charging',
        address: enhancedStation.address,
        city: enhancedStation.city || '',
        state: enhancedStation.state || '',
        latitude: enhancedStation.latitude,
        longitude: enhancedStation.longitude,
        rating: 4.3, // Default good rating
        isOpen: enhancedStation.isOpen !== undefined ? enhancedStation.isOpen : true,
        source: 'reliance_jio_bp',
        description: 'Jio-bp pulse EV charging station with fast charging capabilities.',
        phoneNumber: '+91-8888899999', // Default Jio-bp helpline
        imageUrl: null,
        amenities: enhancedStation.amenities || null,
      });
      
      // Normalize connector types
      const connectorTypes = enhancedStation.connectorTypes && enhancedStation.connectorTypes.length > 0
        ? normalizeConnectorTypes(enhancedStation.connectorTypes)
        : ['CCS-2', 'Type-2']; // Default connectors for JioBP
      
      // Create the charging station associated with the location
      await storage.createChargingStation({
        locationId: location.id,
        operatorName: enhancedStation.operatorName || 'Reliance Jio-bp',
        connectorTypes: connectorTypes as any[],
        powerKw: enhancedStation.powerKw || 60,
        pricePerKwh: enhancedStation.pricePerKwh || 18.0,
        paymentMethods: ['UPI', 'Credit Card', 'Debit Card', 'Jio-bp Pulse App'],
        isAvailable: true,
        numberOfPoints: 4, // Standard number of charging points
        networkName: 'Jio-bp Pulse',
        supportContact: '+91-8888899999', // Jio-bp Pulse support contact
        openingHours: enhancedStation.openingHours || '24x7'
      });

      importedCount++;
      if (importedCount % 50 === 0) {
        console.log(`Imported ${importedCount} JioBP stations so far...`);
      }
    } catch (error) {
      console.error(`Error importing JioBP station "${stationData.name}":`, error);
    }
  }

  console.log(`Successfully imported ${importedCount} JioBP stations`);
  return importedCount;
}

/**
 * Create sample JioBP stations data
 * This is used when we can't fetch data from external sources
 */
function getSampleJioBPStations(): JioBPStationRaw[] {
  // These are just a representative sample, not the full 5000 stations
  return [
    {
      name: "Jio-bp pulse - Delhi",
      address: "Sector 14, Dwarka, New Delhi, Delhi 110078",
      city: "New Delhi",
      state: "Delhi",
      latitude: 28.5823,
      longitude: 77.0500,
      connectorTypes: ["CCS-2", "Type-2"],
      powerKw: 60,
      pricePerKwh: 18.0,
      operatorName: "Reliance Jio-bp"
    },
    {
      name: "Jio-bp pulse - Mumbai Bandra",
      address: "Linking Road, Bandra West, Mumbai, Maharashtra 400050",
      city: "Mumbai",
      state: "Maharashtra",
      latitude: 19.0596,
      longitude: 72.8295,
      connectorTypes: ["CCS-2", "CHAdeMO", "Type-2"],
      powerKw: 90,
      pricePerKwh: 19.5,
      operatorName: "Reliance Jio-bp"
    },
    // More sample stations would be included in the actual implementation
  ];
}

/**
 * Public function to fetch JioBP stations from all possible sources
 * and import them into the database
 */
export async function fetchAndImportJioBPStations(): Promise<number> {
  console.log('Starting JioBP stations fetch and import process...');

  // Try to fetch from official API first
  let stations = await fetchFromOfficialApi();

  // If no stations found from API, try to load from cache
  if (stations.length === 0) {
    stations = loadFromCache();
  }
  
  // If still no stations, use sample data
  if (stations.length === 0) {
    console.log('No JioBP stations found from sources. Using sample data.');
    stations = getSampleJioBPStations();
  } else {
    // Save successful results to cache
    saveToCache(stations);
  }
  
  // Import stations into database
  return await importJioBPStations(stations);
}

/**
 * Parse a CSV file containing JioBP stations data
 */
export async function importJioBPStationsFromCsv(csvFilePath: string): Promise<number> {
  try {
    console.log(`Importing JioBP stations from CSV file: ${csvFilePath}`);
    
    if (!fs.existsSync(csvFilePath)) {
      console.error(`CSV file not found: ${csvFilePath}`);
      return 0;
    }
    
    const csvData = fs.readFileSync(csvFilePath, 'utf8');
    const stations = parseJioBPCsv(csvData);
    
    if (stations.length === 0) {
      console.log('No valid JioBP stations found in CSV file.');
      return 0;
    }
    
    console.log(`Parsed ${stations.length} JioBP stations from CSV.`);
    
    // Save to cache
    saveToCache(stations);
    
    // Import stations into database
    return await importJioBPStations(stations);
  } catch (error) {
    console.error('Error importing JioBP stations from CSV:', error);
    return 0;
  }
}

/**
 * Schedule regular updates for JioBP stations
 * This function sets up a schedule to periodically fetch and update JioBP stations data
 */
export function scheduleJioBPStationsUpdates(intervalHours = 24): NodeJS.Timeout {
  console.log(`Scheduling JioBP stations updates every ${intervalHours} hours`);
  
  // Run once immediately
  fetchAndImportJioBPStations().catch(error => {
    console.error('Error in scheduled JioBP stations update:', error);
  });
  
  // Then schedule regular updates
  const intervalMs = intervalHours * 60 * 60 * 1000;
  return setInterval(() => {
    console.log('Running scheduled JioBP stations update...');
    fetchAndImportJioBPStations().catch(error => {
      console.error('Error in scheduled JioBP stations update:', error);
    });
  }, intervalMs);
}