/**
 * Fortum Charge & Drive Stations Fetcher
 * 
 * This service fetches EV charging station data from Fortum Charge & Drive,
 * one of the rapidly growing charging networks in India.
 */

import axios from 'axios';
import { storage } from '../storage';

/**
 * Interface for Fortum Charge & Drive station data
 */
interface FortumStation {
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
 * URLs for Fortum API endpoints
 */
const FORTUM_API_BASE_URL = 'https://service.fortumcharge.com/api/v1';
const FORTUM_STATIONS_ENDPOINT = `${FORTUM_API_BASE_URL}/sites/public`;

/**
 * Fetch Fortum Charge & Drive stations
 */
async function fetchFortumStations(): Promise<FortumStation[]> {
  console.log("Fetching Fortum Charge & Drive stations...");
  
  try {
    // Fetch from Fortum public API
    const response = await axios.get(FORTUM_STATIONS_ENDPOINT, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      params: {
        country: 'India'
      }
    });
    
    if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
      console.error("Invalid response format from Fortum API");
      return [];
    }
    
    const sitesData = response.data.data;
    console.log(`Found ${sitesData.length} raw Fortum stations`);
    
    // Process and filter the data
    const stations: FortumStation[] = [];
    
    for (const site of sitesData) {
      // Skip if missing essential data
      if (!site.latitude || !site.longitude || !site.name) {
        continue;
      }
      
      // Extract connector types
      const connectorTypes: string[] = [];
      if (site.connectors && Array.isArray(site.connectors)) {
        site.connectors.forEach((connector: any) => {
          const type = connector.type?.toLowerCase();
          if (type?.includes('ccs')) {
            if (!connectorTypes.includes('CCS')) connectorTypes.push('CCS');
          } else if (type?.includes('chademo')) {
            if (!connectorTypes.includes('CHAdeMO')) connectorTypes.push('CHAdeMO');
          } else if (type?.includes('type 2') || type?.includes('type-2')) {
            if (!connectorTypes.includes('Type 2')) connectorTypes.push('Type 2');
          } else if (type?.includes('type 1') || type?.includes('type-1')) {
            if (!connectorTypes.includes('Type 1')) connectorTypes.push('Type 1');
          }
        });
      }
      
      // If connector types couldn't be extracted, use default for Fortum (typically CCS and Type 2)
      if (connectorTypes.length === 0) {
        connectorTypes.push('CCS', 'Type 2');
      }
      
      // Determine power level
      let powerKw = 0;
      if (site.connectors && Array.isArray(site.connectors)) {
        // Find the highest power among all connectors
        site.connectors.forEach((connector: any) => {
          const power = parseFloat(connector.power);
          if (!isNaN(power) && power > powerKw) {
            powerKw = power;
          }
        });
      }
      
      // Default power if not available
      if (powerKw === 0) {
        if (connectorTypes.includes('CCS')) {
          powerKw = 50; // Typical for Fortum DC chargers
        } else {
          powerKw = 22; // Typical for AC chargers
        }
      }
      
      // Extract address components
      let address = site.address || '';
      let city = site.city || '';
      let state = site.state || '';
      
      // Create station object
      const station: FortumStation = {
        id: site.id || `fortum-${site.latitude}-${site.longitude}`,
        name: site.name || 'Fortum Charge & Drive Station',
        address,
        city,
        state,
        latitude: parseFloat(site.latitude) || 0,
        longitude: parseFloat(site.longitude) || 0,
        connectorTypes,
        powerKw,
        isActive: site.status === 'available' || site.status === 'active',
        operatorName: 'Fortum Charge & Drive',
        phoneNumber: site.phoneNumber || undefined
      };
      
      // Extract amenities if available
      if (site.amenities && Array.isArray(site.amenities)) {
        const amenities: string[] = [];
        site.amenities.forEach((amenity: string) => {
          const amenityLower = amenity.toLowerCase();
          if (amenityLower.includes('parking')) amenities.push('Parking');
          if (amenityLower.includes('restaurant') || amenityLower.includes('food')) amenities.push('Restaurant');
          if (amenityLower.includes('cafe')) amenities.push('Cafe');
          if (amenityLower.includes('restroom') || amenityLower.includes('toilet')) amenities.push('Restroom');
          if (amenityLower.includes('shopping') || amenityLower.includes('retail')) amenities.push('Shopping');
          if (amenityLower.includes('wifi')) amenities.push('WiFi');
        });
        
        if (amenities.length > 0) {
          station.amenities = amenities;
        }
      }
      
      // Extract photos if available
      if (site.images && Array.isArray(site.images)) {
        station.photos = site.images.filter(Boolean);
      }
      
      // Skip items with invalid coordinates
      if (station.latitude === 0 || station.longitude === 0) {
        console.log(`Skipping station with invalid coordinates: ${station.name}`);
        continue;
      }
      
      stations.push(station);
    }
    
    console.log(`Successfully processed ${stations.length} Fortum Charge & Drive stations`);
    return stations;
  } catch (error) {
    console.error("Error fetching Fortum Charge & Drive stations:", error);
    return [];
  }
}

/**
 * Import Fortum stations into the database
 */
async function importFortumStations(stations: FortumStation[]): Promise<number> {
  let importedCount = 0;
  
  console.log(`Starting import of ${stations.length} Fortum Charge & Drive stations...`);
  
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
          existing.name.toLowerCase().includes('fortum') || 
          existing.name.toLowerCase().includes('charge & drive') ||
          stationData.name.toLowerCase().includes(existing.name.toLowerCase());
          
        const isVeryClose = 
          Math.abs(existing.latitude - stationData.latitude) < 0.0005 &&
          Math.abs(existing.longitude - stationData.longitude) < 0.0005;
          
        return (hasSimilarName && isVeryClose);
      });
      
      if (isDuplicate) {
        console.log(`Skipping duplicate Fortum station: ${stationData.name}`);
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
        source: 'fortum',
        description: 'Fortum Charge & Drive EV charging station',
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
        pricePerKwh: 18.0, // Fortum's approximate rate
        paymentMethods: ['Credit Card', 'Debit Card', 'UPI', 'Fortum App'],
        isAvailable: stationData.isActive,
        numberOfPoints: Math.max(1, stationData.connectorTypes.length) // Estimate number of points from connector types
      });
      
      // Add photos if available
      if (stationData.photos && stationData.photos.length > 0) {
        for (const photoUrl of stationData.photos) {
          try {
            await storage.addLocationPhoto({
              locationId: location.id,
              url: photoUrl,
              source: 'fortum',
              caption: 'Fortum Charge & Drive Station'
            } as any);
          } catch (photoError) {
            console.error(`Error adding photo for station "${stationData.name}":`, photoError);
          }
        }
      }
      
      importedCount++;
    } catch (error) {
      console.error(`Error importing Fortum station "${stationData.name}":`, error);
    }
  }
  
  console.log(`Successfully imported ${importedCount} Fortum Charge & Drive stations`);
  return importedCount;
}

/**
 * Fetch and import Fortum Charge & Drive stations
 */
export async function fetchAndImportFortumStations(): Promise<number> {
  try {
    const stations = await fetchFortumStations();
    return await importFortumStations(stations);
  } catch (error) {
    console.error('Error in fetchAndImportFortumStations:', error);
    return 0;
  }
}