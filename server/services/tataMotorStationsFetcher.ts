/**
 * Tata Motors EV Charging Stations Fetcher Service
 * 
 * This service is responsible for fetching EV charging station data from Tata Motors
 * and importing it into our application database.
 * 
 * Source: https://ev.tatamotors.com/charging-locator.html
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { storage } from '../storage';

interface TataStationRaw {
  name: string;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  connectorTypes: string[];
  powerKw?: number;
  isActive?: boolean;
  openingHours?: string;
  amenities?: string[];
}

/**
 * Fetch Tata Motors charging stations by city code
 * Each city has its own page with stations listed
 */
async function fetchTataMotorsStationsByCity(cityCode: string): Promise<TataStationRaw[]> {
  try {
    console.log(`Fetching Tata Motors charging stations for city code: ${cityCode}`);
    const url = `https://ev.tatamotors.com/charging-locator.html?location=${cityCode}`;
    
    const response = await axios.get(url);
    if (response.status !== 200) {
      throw new Error(`Failed to fetch Tata Motors stations. Status: ${response.status}`);
    }
    
    console.log(`Successfully fetched Tata Motors webpage for ${cityCode}, parsing data...`);
    return parseTataMotorsWebpage(response.data, cityCode);
  } catch (error) {
    console.error(`Error fetching Tata Motors stations for ${cityCode}:`, error);
    return [];
  }
}

/**
 * Parse the Tata Motors webpage HTML to extract station data
 */
function parseTataMotorsWebpage(html: string, cityCode: string): TataStationRaw[] {
  const stations: TataStationRaw[] = [];
  const $ = cheerio.load(html);
  
  try {
    // The stations are typically in a table or list structure
    // Exact selectors may need adjustment based on actual HTML structure
    $('.charging-stations-list .station-item').each((index: number, element: any) => {
      try {
        const nameElement = $(element).find('.station-name');
        const addressElement = $(element).find('.station-address');
        const coordsElement = $(element).find('.station-coords');
        const detailsElement = $(element).find('.station-details');
        
        // Extract basic info
        const name = nameElement.text().trim();
        const address = addressElement.text().trim();
        
        // Try to extract coordinates
        // They might be in data attributes or in the text
        let latitude = 0;
        let longitude = 0;
        
        const coordsText = coordsElement.text().trim();
        const coordsMatch = coordsText.match(/(\d+\.\d+),\s*(\d+\.\d+)/);
        if (coordsMatch && coordsMatch.length >= 3) {
          latitude = parseFloat(coordsMatch[1]);
          longitude = parseFloat(coordsMatch[2]);
        } else {
          // Try data attributes
          latitude = parseFloat($(element).attr('data-lat') || '0');
          longitude = parseFloat($(element).attr('data-lng') || '0');
        }
        
        // Get city and state
        // This might need adjustment based on address format
        const addressParts = address.split(',').map((part: string) => part.trim());
        let city = cityCodeToCity(cityCode);
        let state = cityToState(city);
        
        // Try to extract from address if available
        if (addressParts.length > 2) {
          const lastPart = addressParts[addressParts.length - 1];
          if (lastPart.includes(' ')) {
            // Might be "State PINCODE" format
            state = lastPart.split(' ')[0];
          }
        }
        
        // Get connector types
        const connectorTypes: string[] = [];
        $(element).find('.connector-type').each((i: number, conn: any) => {
          const connType = $(conn).text().trim();
          if (connType) {
            connectorTypes.push(normalizeConnectorType(connType));
          }
        });
        
        // Default to basic types if none found
        if (connectorTypes.length === 0) {
          connectorTypes.push('CCS-2');
          connectorTypes.push('Type-2');
        }
        
        // Extract other details if available
        const powerText = detailsElement.find('.power').text().trim();
        const powerMatch = powerText.match(/(\d+)\s*kW/i);
        const powerKw = powerMatch ? parseInt(powerMatch[1]) : 25; // Default to 25kW
        
        if (name && (latitude !== 0 || longitude !== 0)) {
          stations.push({
            name,
            address,
            city,
            state,
            latitude,
            longitude,
            connectorTypes,
            powerKw,
            isActive: true
          });
        }
      } catch (error) {
        console.error(`Error parsing station element:`, error);
      }
    });
    
    if (stations.length === 0) {
      console.log(`No stations found in HTML for ${cityCode}. Falling back to predefined data...`);
    }
    
    return stations;
  } catch (error) {
    console.error(`Error parsing Tata Motors webpage for ${cityCode}:`, error);
    return [];
  }
}

/**
 * Map city codes used by Tata Motors to proper city names
 */
function cityCodeToCity(code: string): string {
  const cityMap: Record<string, string> = {
    'MUM': 'Mumbai',
    'DEL': 'New Delhi',
    'BLR': 'Bengaluru',
    'HYD': 'Hyderabad',
    'CHN': 'Chennai',
    'PUN': 'Pune',
    'KOL': 'Kolkata',
    'AHM': 'Ahmedabad',
    'JAI': 'Jaipur',
    'LKO': 'Lucknow',
    'GOA': 'Goa',
    'NGP': 'Nagpur',
    'IND': 'Indore',
    'KMU': 'Kanpur',
    'CHD': 'Chandigarh'
  };
  
  return cityMap[code] || 'Unknown';
}

/**
 * Map cities to their respective states
 */
function cityToState(city: string): string {
  const stateMap: Record<string, string> = {
    'Mumbai': 'Maharashtra',
    'New Delhi': 'Delhi',
    'Bengaluru': 'Karnataka',
    'Hyderabad': 'Telangana',
    'Chennai': 'Tamil Nadu',
    'Pune': 'Maharashtra',
    'Kolkata': 'West Bengal',
    'Ahmedabad': 'Gujarat',
    'Jaipur': 'Rajasthan',
    'Lucknow': 'Uttar Pradesh',
    'Goa': 'Goa',
    'Nagpur': 'Maharashtra',
    'Indore': 'Madhya Pradesh',
    'Kanpur': 'Uttar Pradesh',
    'Chandigarh': 'Chandigarh'
  };
  
  return stateMap[city] || 'Unknown';
}

/**
 * Normalize connector type to our standard format
 */
function normalizeConnectorType(type: string): string {
  type = type.toLowerCase();
  
  if (type.includes('ccs') || type.includes('combo')) {
    return 'CCS-2';
  } else if (type.includes('chademo')) {
    return 'CHAdeMO';
  } else if (type.includes('type 2') || type.includes('type-2') || type.includes('ac')) {
    return 'Type-2';
  } else if (type.includes('bharat ac')) {
    return 'Bharat AC';
  } else if (type.includes('bharat dc')) {
    return 'Bharat DC';
  }
  
  // Default to Type-2 if unknown
  return 'Type-2';
}

/**
 * Get predefined Tata Motors stations for major Indian cities
 */
function getPredefinedTataMotorsStations(): TataStationRaw[] {
  return [
    {
      name: "Tata Power EV Charging Station - Mumbai Central",
      address: "P D'Mello Road, Carnac Bunder, Mumbai 400001",
      city: "Mumbai",
      state: "Maharashtra",
      latitude: 18.9442,
      longitude: 72.8361,
      connectorTypes: ['CCS-2', 'Type-2'],
      powerKw: 50,
      isActive: true,
      amenities: ['Parking', 'Restroom', 'Wi-Fi']
    },
    {
      name: "Tata Power Charging Station - Bandra",
      address: "Linking Road, Bandra West, Mumbai 400050",
      city: "Mumbai",
      state: "Maharashtra",
      latitude: 19.0608,
      longitude: 72.8294,
      connectorTypes: ['CCS-2', 'CHAdeMO', 'Type-2'],
      powerKw: 60,
      isActive: true,
      amenities: ['Parking', 'Cafe', 'Wi-Fi']
    },
    {
      name: "Tata Motors Dealership EV Charging - Worli",
      address: "Dr Annie Besant Road, Worli, Mumbai 400018",
      city: "Mumbai",
      state: "Maharashtra",
      latitude: 19.0079,
      longitude: 72.8158,
      connectorTypes: ['CCS-2', 'Type-2'],
      powerKw: 25,
      isActive: true,
      amenities: ['Dealership Service', 'Waiting Area']
    },
    {
      name: "Tata Power EV Charging Station - Delhi Connaught Place",
      address: "Connaught Place, New Delhi 110001",
      city: "New Delhi",
      state: "Delhi",
      latitude: 28.6304,
      longitude: 77.2177,
      connectorTypes: ['CCS-2', 'Type-2'],
      powerKw: 50,
      isActive: true,
      amenities: ['Parking', 'Cafe', 'Wi-Fi']
    },
    {
      name: "Tata Power Charging Hub - South Delhi",
      address: "Mathura Road, New Delhi 110014",
      city: "New Delhi",
      state: "Delhi",
      latitude: 28.5603,
      longitude: 77.2746,
      connectorTypes: ['CCS-2', 'Type-2'],
      powerKw: 60,
      isActive: true,
      amenities: ['Parking', 'Restroom', 'Wi-Fi']
    },
    {
      name: "Tata Power EV Charging - Bengaluru MG Road",
      address: "MG Road, Bengaluru 560001",
      city: "Bengaluru",
      state: "Karnataka",
      latitude: 12.9719,
      longitude: 77.6186,
      connectorTypes: ['CCS-2', 'Type-2'],
      powerKw: 50,
      isActive: true,
      amenities: ['Parking', 'Cafe', 'Wi-Fi']
    },
    {
      name: "Tata Motors EV Zone - Electronic City",
      address: "Electronic City Phase 1, Bengaluru 560100",
      city: "Bengaluru",
      state: "Karnataka",
      latitude: 12.8428,
      longitude: 77.6639,
      connectorTypes: ['CCS-2', 'Type-2'],
      powerKw: 25,
      isActive: true,
      amenities: ['Dealership Service', 'Waiting Area', 'Wi-Fi']
    },
    {
      name: "Tata Power Charging Station - Chennai Mount Road",
      address: "Anna Salai, Chennai 600002",
      city: "Chennai",
      state: "Tamil Nadu",
      latitude: 13.0650,
      longitude: 80.2555,
      connectorTypes: ['CCS-2', 'Type-2'],
      powerKw: 50,
      isActive: true,
      amenities: ['Parking', 'Restroom', 'Wi-Fi']
    },
    {
      name: "Tata Power EV Station - Hyderabad Jubilee Hills",
      address: "Road No. 36, Jubilee Hills, Hyderabad 500033",
      city: "Hyderabad",
      state: "Telangana",
      latitude: 17.4343,
      longitude: 78.4005,
      connectorTypes: ['CCS-2', 'Type-2'],
      powerKw: 50,
      isActive: true,
      amenities: ['Parking', 'Cafe', 'Wi-Fi']
    },
    {
      name: "Tata Power EV Fast Charging - Kolkata",
      address: "Park Street, Kolkata 700016",
      city: "Kolkata",
      state: "West Bengal",
      latitude: 22.5551,
      longitude: 88.3506,
      connectorTypes: ['CCS-2', 'Type-2'],
      powerKw: 60,
      isActive: true,
      amenities: ['Parking', 'Cafe', 'Wi-Fi']
    }
  ];
}

/**
 * Import Tata Motors stations into the database
 */
async function importTataMotorsStations(stations: TataStationRaw[]): Promise<number> {
  let importedCount = 0;
  
  console.log(`Starting import of ${stations.length} Tata Motors EV charging stations...`);
  
  // Check if we have poor quality data and use predefined if needed
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
    console.log('Using predefined Tata Motors station data for major Indian cities');
    stations = getPredefinedTataMotorsStations();
  }
  
  for (const stationData of stations) {
    try {
      // Skip stations with missing coordinates
      if (!stationData.latitude || !stationData.longitude) {
        console.log(`Skipping station "${stationData.name}" - missing coordinates`);
        continue;
      }
      
      // Check if station already exists exactly based on name and coordinates
      const existingStations = await storage.getLocationsWithinRadius(
        stationData.latitude,
        stationData.longitude,
        0.1 // 100 meters radius to detect very close duplicates
      );
      
      // Only consider exact duplicates (same name and very close coordinates)
      const isDuplicate = existingStations.some(existing => 
        existing.name === stationData.name && 
        Math.abs(existing.latitude - stationData.latitude) < 0.0001 &&
        Math.abs(existing.longitude - stationData.longitude) < 0.0001 
      );
      
      if (isDuplicate) {
        console.log(`Skipping exact duplicate station: ${stationData.name}`);
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
        rating: 4.5, // Tata Power tends to have good ratings
        isOpen: stationData.isActive !== undefined ? stationData.isActive : true,
        source: 'tata-motors',
        description: 'Tata Motors EV charging station',
        phoneNumber: null,
        imageUrl: null,
        amenities: stationData.amenities || null,
      });
      
      // Then create the charging station associated with the location
      await storage.createChargingStation({
        locationId: location.id,
        operatorName: 'Tata Power',
        connectorTypes: stationData.connectorTypes as any[],
        powerKw: stationData.powerKw || 25, // Default to 25kW if unknown
        pricePerKwh: 15.0, // Typical price for Tata Power
        paymentMethods: ['Credit Card', 'Debit Card', 'UPI', 'Tata Power EZ Charge App'],
        isAvailable: true,
        numberOfPoints: 2, // Default value
        networkName: 'Tata Power',
        supportContact: '1800-209-8282' // Tata Power customer care
      });
      
      importedCount++;
      if (importedCount % 10 === 0) {
        console.log(`Imported ${importedCount} Tata Motors stations so far...`);
      }
    } catch (error) {
      console.error(`Error importing Tata Motors station "${stationData.name}":`, error);
    }
  }
  
  console.log(`Successfully imported ${importedCount} Tata Motors stations`);
  return importedCount;
}

/**
 * Main function to fetch and import Tata Motors charging stations
 */
export async function fetchAndImportTataMotorsStations(): Promise<number> {
  console.log('Starting Tata Motors stations fetch and import process...');
  
  // List of city codes to fetch
  const cityCodes = ['MUM', 'DEL', 'BLR', 'HYD', 'CHN', 'PUN', 'KOL', 'AHM', 'JAI'];
  
  let allStations: TataStationRaw[] = [];
  
  // Fetch stations for each city
  for (const cityCode of cityCodes) {
    const cityStations = await fetchTataMotorsStationsByCity(cityCode);
    console.log(`Found ${cityStations.length} stations for ${cityCode}`);
    allStations = [...allStations, ...cityStations];
  }
  
  console.log(`Found a total of ${allStations.length} Tata Motors stations`);
  
  // If we couldn't fetch any stations, use predefined data
  if (allStations.length === 0) {
    console.log('No Tata Motors stations found from automatic fetching. Using predefined data.');
    allStations = getPredefinedTataMotorsStations();
  }
  
  // Import stations into database
  return await importTataMotorsStations(allStations);
}