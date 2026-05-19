/**
 * MG Motor Charging Stations Fetcher
 * 
 * This service fetches EV charging station data from MG Motor's network,
 * which is expanding across India for their electric vehicle customers.
 */

import axios from 'axios';
import { storage } from '../storage';

/**
 * Interface for MG Motor station data
 */
interface MGMotorStation {
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
 * URLs for MG Motor API
 */
const MG_MOTOR_API_BASE_URL = 'https://mgmotor.co.in/api';
const MG_CHARGING_STATIONS_URL = `${MG_MOTOR_API_BASE_URL}/charging-stations`;

/**
 * Fetch MG Motor charging stations
 */
async function fetchMGMotorStations(): Promise<MGMotorStation[]> {
  console.log("Fetching MG Motor charging stations...");
  
  try {
    // Fetch data from MG Motor API
    const response = await axios.get(MG_CHARGING_STATIONS_URL, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.data || !response.data.stations || !Array.isArray(response.data.stations)) {
      console.error("Invalid response format from MG Motor API");
      return [];
    }
    
    const stationsData = response.data.stations;
    console.log(`Found ${stationsData.length} raw MG Motor stations`);
    
    // Process the stations data
    const stations: MGMotorStation[] = [];
    
    for (const stationData of stationsData) {
      // Skip if missing essential data
      if (!stationData.latitude || !stationData.longitude || !stationData.name) {
        continue;
      }
      
      // Typically MG Motor uses CCS2 connectors for their vehicles
      const connectorTypes = ['CCS'];
      
      // MG Motor fast chargers are usually 50kW DC
      const powerKw = 50;
      
      // Create station object
      const station: MGMotorStation = {
        id: stationData.id || `mg-motor-${stationData.latitude}-${stationData.longitude}`,
        name: stationData.name || 'MG Motor Charging Station',
        address: stationData.address || '',
        city: stationData.city || '',
        state: stationData.state || '',
        latitude: parseFloat(String(stationData.latitude)) || 0,
        longitude: parseFloat(String(stationData.longitude)) || 0,
        connectorTypes,
        powerKw,
        isActive: stationData.status !== 'inactive',
        operatorName: 'MG Motor',
        phoneNumber: stationData.phoneNumber || stationData.contact || undefined
      };
      
      // Extract amenities
      if (stationData.amenities) {
        const amenities: string[] = [];
        if (typeof stationData.amenities === 'string') {
          // Parse comma-separated string
          const amenityItems = (stationData.amenities as string).split(',').map((item: string) => item.trim());
          amenityItems.forEach((item: string) => {
            const amenityLower = item.toLowerCase();
            if (amenityLower.includes('parking')) amenities.push('Parking');
            if (amenityLower.includes('restaurant') || amenityLower.includes('food')) amenities.push('Restaurant');
            if (amenityLower.includes('cafe')) amenities.push('Cafe');
            if (amenityLower.includes('restroom') || amenityLower.includes('toilet')) amenities.push('Restroom');
            if (amenityLower.includes('shopping') || amenityLower.includes('retail')) amenities.push('Shopping');
            if (amenityLower.includes('wifi')) amenities.push('WiFi');
          });
        } else if (Array.isArray(stationData.amenities)) {
          // Process array directly
          (stationData.amenities as any[]).forEach((item: any) => {
            const amenityLower = String(item).toLowerCase();
            if (amenityLower.includes('parking')) amenities.push('Parking');
            if (amenityLower.includes('restaurant') || amenityLower.includes('food')) amenities.push('Restaurant');
            if (amenityLower.includes('cafe')) amenities.push('Cafe');
            if (amenityLower.includes('restroom') || amenityLower.includes('toilet')) amenities.push('Restroom');
            if (amenityLower.includes('shopping') || amenityLower.includes('retail')) amenities.push('Shopping');
            if (amenityLower.includes('wifi')) amenities.push('WiFi');
          });
        }
        
        if (amenities.length > 0) {
          station.amenities = amenities;
        }
      }
      
      // Extract photos if available
      if (stationData.images && Array.isArray(stationData.images)) {
        station.photos = (stationData.images as any[]).filter(Boolean);
      } else if (stationData.image) {
        station.photos = [stationData.image as string];
      }
      
      // Skip items with invalid coordinates
      if (station.latitude === 0 || station.longitude === 0) {
        console.log(`Skipping station with invalid coordinates: ${station.name}`);
        continue;
      }
      
      stations.push(station);
    }
    
    console.log(`Successfully processed ${stations.length} MG Motor stations`);
    return stations;
  } catch (error) {
    console.error("Error fetching MG Motor stations:", error);
    return [];
  }
}

/**
 * Import MG Motor stations into the database
 */
async function importMGMotorStations(stations: MGMotorStation[]): Promise<number> {
  let importedCount = 0;
  
  console.log(`Starting import of ${stations.length} MG Motor stations...`);
  
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
          existing.name.toLowerCase().includes('mg') || 
          existing.name.toLowerCase().includes('motor') ||
          stationData.name.toLowerCase().includes(existing.name.toLowerCase());
          
        const isVeryClose = 
          Math.abs(existing.latitude - stationData.latitude) < 0.0005 &&
          Math.abs(existing.longitude - stationData.longitude) < 0.0005;
          
        return (hasSimilarName && isVeryClose);
      });
      
      if (isDuplicate) {
        console.log(`Skipping duplicate MG Motor station: ${stationData.name}`);
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
        source: 'mg-motor',
        description: 'MG Motor EV charging station',
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
        pricePerKwh: 18.0, // Typical rate
        paymentMethods: ['Credit Card', 'Debit Card', 'UPI', 'MG Motor App'],
        isAvailable: stationData.isActive,
        numberOfPoints: 2 // MG stations typically have at least 2 charging points
      });
      
      // Add photos if available
      if (stationData.photos && stationData.photos.length > 0) {
        for (const photoUrl of stationData.photos) {
          try {
            await storage.addLocationPhoto({
              locationId: location.id,
              url: photoUrl,
              source: 'mg-motor',
              caption: 'MG Motor Charging Station'
            } as any);
          } catch (photoError) {
            console.error(`Error adding photo for station "${stationData.name}":`, photoError);
          }
        }
      }
      
      importedCount++;
    } catch (error) {
      console.error(`Error importing MG Motor station "${stationData.name}":`, error);
    }
  }
  
  console.log(`Successfully imported ${importedCount} MG Motor stations`);
  return importedCount;
}

/**
 * Fetch and import MG Motor charging stations
 */
export async function fetchAndImportMGMotorStations(): Promise<number> {
  try {
    const stations = await fetchMGMotorStations();
    return await importMGMotorStations(stations);
  } catch (error) {
    console.error('Error in fetchAndImportMGMotorStations:', error);
    return 0;
  }
}