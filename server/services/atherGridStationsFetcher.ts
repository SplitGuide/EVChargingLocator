/**
 * Ather Grid Stations Fetcher
 * 
 * This service fetches EV charging station data from Ather Grid,
 * one of India's popular charging networks for electric scooters.
 */

import axios from 'axios';
import { storage } from '../storage';

/**
 * Interface for Ather Grid station data
 */
interface AtherGridStation {
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
 * URLs for Ather Grid API
 */
const ATHER_API_BASE_URL = 'https://consumer-app.atherenergy.com/dashboard';
const ATHER_GRID_LOCATIONS_URL = `${ATHER_API_BASE_URL}/charging-stations`;
const ATHER_GRID_COVERAGE_URL = `${ATHER_API_BASE_URL}/service-centers`;

/**
 * Fetch Ather Grid stations
 */
async function fetchAtherGridStations(): Promise<AtherGridStation[]> {
  console.log("Fetching Ather Grid charging stations...");
  
  try {
    // We're using their public API which returns station data
    const response = await axios.get(ATHER_GRID_LOCATIONS_URL, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.data || !response.data.data || !Array.isArray(response.data.data.markers)) {
      console.error("Invalid response format from Ather Grid API");
      return [];
    }
    
    const markers = response.data.data.markers;
    console.log(`Found ${markers.length} raw Ather Grid stations`);
    
    // Process and filter the data to extract EV charging stations
    const stations: AtherGridStation[] = [];
    
    for (const marker of markers) {
      // Skip if missing essential data
      if (!marker.latitude || !marker.longitude || !marker.name) {
        continue;
      }
      
      // Extract address information
      let address = marker.address || '';
      let city = marker.city || '';
      let state = marker.state || '';
      
      if (!city && address) {
        // Try to extract city from address
        const addressParts = address.split(',').map(part => part.trim());
        if (addressParts.length > 1) {
          city = addressParts[addressParts.length - 2];
        }
      }
      
      // Ather Grid stations use Type 2 connectors for two-wheelers
      const connectorTypes = ['Type 2'];
      
      // Ather Grid stations are typically 3.3 kW for two-wheelers
      const powerKw = 3.3;
      
      // Create station object
      const station: AtherGridStation = {
        id: marker.id || `ather-grid-${marker.latitude}-${marker.longitude}`,
        name: marker.name || 'Ather Grid Charging Point',
        address,
        city,
        state,
        latitude: parseFloat(marker.latitude) || 0,
        longitude: parseFloat(marker.longitude) || 0,
        connectorTypes,
        powerKw,
        isActive: marker.isActive !== false, // Default to true if not specified
        operatorName: 'Ather Grid',
        phoneNumber: marker.phoneNumber || undefined
      };
      
      // Add amenities if available
      if (marker.partnerType) {
        const amenities: string[] = [];
        const partnerType = marker.partnerType.toLowerCase();
        
        if (partnerType.includes('cafe') || partnerType.includes('restaurant')) {
          amenities.push('Cafe', 'Restaurant');
        }
        if (partnerType.includes('mall') || partnerType.includes('shopping')) {
          amenities.push('Shopping');
        }
        if (partnerType.includes('hotel') || partnerType.includes('lodging')) {
          amenities.push('Lodging');
        }
        if (partnerType.includes('parking')) {
          amenities.push('Parking');
        }
        
        if (amenities.length > 0) {
          station.amenities = amenities;
        }
      }
      
      // Add photos if available
      if (marker.image) {
        station.photos = [marker.image];
      }
      
      // Skip items with invalid coordinates
      if (station.latitude === 0 || station.longitude === 0) {
        console.log(`Skipping station with invalid coordinates: ${station.name}`);
        continue;
      }
      
      stations.push(station);
    }
    
    console.log(`Successfully processed ${stations.length} Ather Grid stations`);
    return stations;
  } catch (error) {
    console.error("Error fetching Ather Grid stations:", error);
    return [];
  }
}

/**
 * Import Ather Grid stations into the database
 */
async function importAtherGridStations(stations: AtherGridStation[]): Promise<number> {
  let importedCount = 0;
  
  console.log(`Starting import of ${stations.length} Ather Grid stations...`);
  
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
          existing.name.toLowerCase().includes('ather') || 
          existing.name.toLowerCase().includes('grid') ||
          stationData.name.toLowerCase().includes(existing.name.toLowerCase());
          
        const isVeryClose = 
          Math.abs(existing.latitude - stationData.latitude) < 0.0005 &&
          Math.abs(existing.longitude - stationData.longitude) < 0.0005;
          
        return (hasSimilarName && isVeryClose);
      });
      
      if (isDuplicate) {
        console.log(`Skipping duplicate Ather Grid station: ${stationData.name}`);
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
        source: 'ather-grid',
        description: 'Ather Grid electric scooter charging station',
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
        pricePerKwh: 0.0, // Ather Grid is typically free for Ather scooter owners
        paymentMethods: ['Ather App'],
        isAvailable: stationData.isActive,
        numberOfPoints: 1 // Ather Grid typically has one charging point per location
      });
      
      // Add photos if available
      if (stationData.photos && stationData.photos.length > 0) {
        for (const photoUrl of stationData.photos) {
          try {
            await storage.addLocationPhoto({
              locationId: location.id,
              url: photoUrl,
              source: 'ather-grid',
              caption: 'Ather Grid Charging Station'
            } as any);
          } catch (photoError) {
            console.error(`Error adding photo for station "${stationData.name}":`, photoError);
          }
        }
      }
      
      importedCount++;
    } catch (error) {
      console.error(`Error importing Ather Grid station "${stationData.name}":`, error);
    }
  }
  
  console.log(`Successfully imported ${importedCount} Ather Grid stations`);
  return importedCount;
}

/**
 * Fetch and import Ather Grid stations
 */
export async function fetchAndImportAtherGridStations(): Promise<number> {
  try {
    const stations = await fetchAtherGridStations();
    return await importAtherGridStations(stations);
  } catch (error) {
    console.error('Error in fetchAndImportAtherGridStations:', error);
    return 0;
  }
}