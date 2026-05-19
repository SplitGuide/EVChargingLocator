/**
 * Tata Power EZ Charge Stations Fetcher
 * 
 * This service fetches EV charging station data from Tata Power EZ Charge network,
 * one of India's largest charging networks.
 */

import axios from 'axios';
import { storage } from '../storage';

/**
 * Interface for Tata Power station data
 */
interface TataPowerStation {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  connectorTypes: string[];
  powerKw: number;
  isActive: boolean;
  amenities?: string[];
  photos?: string[];
  operatorName: string;
  phoneNumber?: string;
}

/**
 * URLs for Tata Power API
 */
const TATA_POWER_BASE_URL = 'https://www.tatapower.com/api/ev-charging-stations';
const TATA_POWER_MAPPING_URL = 'https://www.tatapower.com/api/map/get-all-locations';

/**
 * Fetch Tata Power EZ Charge stations
 */
async function fetchTataPowerStations(): Promise<TataPowerStation[]> {
  console.log("Fetching Tata Power EZ Charge stations...");
  
  try {
    // This is a workaround since we don't have direct API access
    // We're using their public mapping API which returns station data
    const response = await axios.get(TATA_POWER_MAPPING_URL, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.data || !Array.isArray(response.data)) {
      console.error("Invalid response format from Tata Power API");
      return [];
    }
    
    console.log(`Found ${response.data.length} raw Tata Power stations`);
    
    // Process and filter the data to extract EV charging stations
    const stations: TataPowerStation[] = [];
    
    for (const item of response.data) {
      // We're only interested in EV charging stations
      if (item.locationType !== 'ev-charging-station') continue;
      
      // Extract connector types
      const connectorTypes: string[] = [];
      if (item.connectorType) {
        const connectorText = String(item.connectorType).toLowerCase();
        if (connectorText.includes('type 2') || connectorText.includes('type-2')) {
          connectorTypes.push('Type 2');
        }
        if (connectorText.includes('ccs')) {
          connectorTypes.push('CCS');
        }
        if (connectorText.includes('chademo')) {
          connectorTypes.push('CHAdeMO');
        }
        if (connectorText.includes('bharat dc')) {
          connectorTypes.push('Bharat DC');
        }
        if (connectorText.includes('bharat ac')) {
          connectorTypes.push('Bharat AC');
        }
      }
      
      // If we couldn't detect any connector types, assume the common ones in India
      if (connectorTypes.length === 0) {
        connectorTypes.push('Type 2', 'CCS');
      }
      
      // Estimate power based on connector types
      let powerKw = 0;
      if (item.chargingCapacity) {
        powerKw = parseFloat(item.chargingCapacity) || 0;
      }
      
      if (powerKw === 0) {
        // Estimate power based on connector types
        if (connectorTypes.includes('CCS')) {
          powerKw = 50;
        } else if (connectorTypes.includes('Type 2')) {
          powerKw = 22;
        } else if (connectorTypes.includes('Bharat DC')) {
          powerKw = 15;
        } else {
          powerKw = 7.4;
        }
      }
      
      // Extract amenities
      const amenities: string[] = [];
      if (item.amenities) {
        if (item.amenities.includes('parking')) amenities.push('Parking');
        if (item.amenities.includes('restroom')) amenities.push('Restroom');
        if (item.amenities.includes('restaurant')) amenities.push('Restaurant');
        if (item.amenities.includes('cafe')) amenities.push('Cafe');
        if (item.amenities.includes('wifi')) amenities.push('WiFi');
        if (item.amenities.includes('shopping')) amenities.push('Shopping');
      }
      
      // Create station object
      const station: TataPowerStation = {
        id: item.id || `tata-power-${item.latitude}-${item.longitude}`,
        name: item.name || 'Tata Power EZ Charge Station',
        address: item.address || '',
        city: item.city || '',
        state: item.state || '',
        latitude: parseFloat(item.latitude) || 0,
        longitude: parseFloat(item.longitude) || 0,
        connectorTypes,
        powerKw,
        isActive: item.isActive !== false, // Default to true if not specified
        amenities: amenities.length > 0 ? amenities : undefined,
        operatorName: 'Tata Power EZ Charge',
        phoneNumber: item.phoneNumber || undefined
      };
      
      // Add photos if available
      if (item.images && Array.isArray(item.images) && item.images.length > 0) {
        station.photos = item.images.map((img: any) => img.url).filter(Boolean);
      }
      
      // Skip items with invalid coordinates
      if (station.latitude === 0 || station.longitude === 0) {
        console.log(`Skipping station with invalid coordinates: ${station.name}`);
        continue;
      }
      
      stations.push(station);
    }
    
    console.log(`Successfully processed ${stations.length} Tata Power EZ Charge stations`);
    return stations;
  } catch (error) {
    console.error("Error fetching Tata Power stations:", error);
    return [];
  }
}

/**
 * Import Tata Power stations into the database
 */
async function importTataPowerStations(stations: TataPowerStation[]): Promise<number> {
  let importedCount = 0;
  
  console.log(`Starting import of ${stations.length} Tata Power EZ Charge stations...`);
  
  for (const stationData of stations) {
    try {
      // Skip stations with missing coordinates
      if (!stationData.latitude || !stationData.longitude) {
        console.log(`Skipping station "${stationData.name}" - missing coordinates`);
        continue;
      }
      
      // Check if station already exists based on coordinates and name
      const existingStations = await storage.getLocationsWithinRadius(
        stationData.latitude,
        stationData.longitude,
        0.1 // 100 meters radius to detect duplicates
      );
      
      // Only consider duplicates (similar name or same operator at very close coordinates)
      const isDuplicate = existingStations.some(existing => {
        const hasSimilarName = 
          existing.name.toLowerCase().includes('tata power') || 
          existing.name.toLowerCase().includes('ez charge') ||
          stationData.name.toLowerCase().includes(existing.name.toLowerCase());
          
        const isVeryClose = 
          Math.abs(existing.latitude - stationData.latitude) < 0.0005 &&
          Math.abs(existing.longitude - stationData.longitude) < 0.0005;
          
        return (hasSimilarName && isVeryClose);
      });
      
      if (isDuplicate) {
        console.log(`Skipping duplicate Tata Power station: ${stationData.name}`);
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
        isOpen: stationData.isActive,
        source: 'tata-power',
        description: 'Tata Power EZ Charge EV charging station',
        phoneNumber: stationData.phoneNumber || null,
        imageUrl: stationData.photos && stationData.photos.length > 0 ? stationData.photos[0] : null,
        amenities: stationData.amenities || null
      });
      
      // Then create the charging station associated with the location
      await storage.createChargingStation({
        locationId: location.id,
        operatorName: stationData.operatorName,
        connectorTypes: stationData.connectorTypes as any[],
        powerKw: stationData.powerKw,
        pricePerKwh: 18.0, // Tata Power standard rate (approximate)
        paymentMethods: ['Credit Card', 'Debit Card', 'UPI', 'Tata Power App'],
        isAvailable: stationData.isActive,
        numberOfPoints: stationData.connectorTypes.length // Estimate number of points from connector types
      });
      
      // Add photos if available
      if (stationData.photos && stationData.photos.length > 0) {
        for (const photoUrl of stationData.photos) {
          try {
            await storage.addLocationPhoto({
              locationId: location.id,
              url: photoUrl,
              source: 'tata-power',
              caption: 'Tata Power EZ Charge Station'
            } as any);
          } catch (photoError) {
            console.error(`Error adding photo for station "${stationData.name}":`, photoError);
          }
        }
      }
      
      importedCount++;
    } catch (error) {
      console.error(`Error importing Tata Power station "${stationData.name}":`, error);
    }
  }
  
  console.log(`Successfully imported ${importedCount} Tata Power EZ Charge stations`);
  return importedCount;
}

/**
 * Fetch and import Tata Power EZ Charge stations
 */
export async function fetchAndImportTataPowerStations(): Promise<number> {
  try {
    const stations = await fetchTataPowerStations();
    return await importTataPowerStations(stations);
  } catch (error) {
    console.error('Error in fetchAndImportTataPowerStations:', error);
    return 0;
  }
}