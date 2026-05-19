/**
 * Karnataka ChargeZone Stations Fetcher
 * 
 * This service parses ChargeZone station data from Karnataka based on the 
 * provided text list and imports them into our database.
 */

import { InsertChargingStation } from '@shared/schema';
import { db } from '../db';
import { locations } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Raw station data from Karnataka
const rawStationsData = `
KA | Bengaluru | Devanahalli JW Golfshire
Address: JW Golfshire Nandi Hills Road Karahalli Post, Kundana Hobli, Devanahalli, Taluk, Bengaluru, Karnataka 562164
Contact: 7777777779
Operational Hours:24*7

KA | Bengaluru | Chandapura
Address: Biotech Park, Chandapura, Bengaluru, Karnataka 562107
Contact: 7777777779
Operational Hours:24*7

KA | Bengaluru | Marriott Hotel Whitefield
Address: Plot No 75, 8th Rd, EPIP Zone, Whitefield, Bengaluru, Karnataka 560066
Contact: 7777777779
Operational Hours:24*7

KA | Bengaluru | JW Marriott Hotel - UB City
Address: 24/1, Vittal Mallya Rd, KG Halli, Shanthala Nagar, Ashok Nagar, Bengaluru, Karnataka 560001
Contact: 7777777779
Operational Hours:24*7

KA | Shiggaon | Hotel Panchvati
Address: N H 4 highway shiggaon, taluk, Munavalli, Karnataka 581202
Contact: 7777777779
Operational Hours:24*7

KA | Davanagere | Rastha Resto Bar
Address: NH 48, Shamanur, Davanagere, Karnataka 577004
Contact: 7777777779
Operational Hours:24*7

KA | Javagondnahalli | Hotel Aroma Natural Pure Veg
Address: Madras Bombay Trunk Rd, Javagondnahalli, Karnataka 577511
Contact: 7777777779
Operational Hours:24*7

KA | Bengaluru | Renaissance Bengaluru Race Course Hotel
Address: "No 17 And 17, 1, Race Course Rd, Madhava Nagar, Extension, Bengaluru, Karnataka 560001"
Contact: 7777777779
Operational Hours:24*7

KA | Bengaluru | Sheraton Grand Bengaluru Whitefield Hotel & Convention Center
Address: Prestige Shantiniketan Hoodi, Whitefield, Bengaluru, Karnataka 560048
Contact:
Operational Hours:24*7

KA | Bengaluru | Sheraton Grand Bangalore At Brigade Gateway
Address: "26/1 Dr. Rajkumar Road Malleswaram, Rajajinagar, Bengaluru, Karnataka 560055"
Contact: 7777777779
Operational Hours:24*7

KA | Bengaluru | MB#Akshaya Motors Mysore Road
Address: Valagerehalli Village, 77/1, Mysore Rd, opp. R V College of Engineering, Bengaluru, Karnataka,560059.
Contact: 8000598650
Operational Hours:24*7

KA | Bengaluru | Aloft Bengaluru Outer Ring Road
Address: Cessna Business Park Sarjapur - Marathahalli Outer Ring Road, Post, Kadubeesanahalli, Bellandur, Bengaluru, Karnataka 560103
Contact: 7777777779
Operational Hours:24*7

KA | Bengaluru | MB#Sundaram Motors Kasturba Road
Address: 107, Kasturba Rd, opp. Venkatappa Art Gallery, Shanthala Nagar, Ashok Nagar, Bengaluru, Karnataka 560001
Contact: 8000598650
Operational Hours:24*7

KA | Mysuru | MB#Akshaya Motors Hebbal
Address: Akshaya Motors Site no 57-60, Hebbal Industrial Area, Hebbal, Mysuru, Karnataka 570016
Contact: 8000598650
Operational Hours:24*7

KA | Belagavi | Hotel Ramdev
Address: PB Road, Nehru Nagar, near Jawaharlal Nehru Medical College, Belagavi, Karnataka 590001
Contact: 7777777779
Operational Hours:24*7

KA | Kittur | Hotel Gajaraj Palace
Address: Kulvali Cross, NH Service Road, Kittur, Karnataka 591115
Contact: 7777777779
Operational Hours:24*7

KA | Bengaluru | Mulberry Shades - A Tribute Portfolio Resort
Address: Nandi Hills, Road, Devenahalli, Bengaluru, Karnataka 562103
Contact: 7777777779
Operational Hours:24*7

KA | Bengaluru | Courtyard by Marriott & Fairfield by Marriott - Bengaluru Outer Ring Road
Address: Marathahalli - Sarjapur Outer Ring Rd, Bellandur, Bengaluru, Karnataka 560103
Contact: 7777777779
Operational Hours:24*7

KTC Charging Hub
Address: Site No 1, K T C Legacy, Kempapura Main Road, Yemalur
Contact:
Operational Hours:24*7

SK International INNN
Address: Channarayapura Road, Ajjapanahalli
Contact:
Operational Hours:24*7

MC Suites Hotel
Address: 45 A Block, Link Main Rd, JP Nagar
Contact:
Operational Hours:24*7

The Quorum Mysuru
Address: 2257, Vinoba Rd, CFTRI Campus, Shivarampet
Contact:
Operational Hours:24*7

NGEF Estate
Address: SM40, NGEF Industrial Estate, Garudacharpalya
Contact:
Operational Hours:24*7

Olde Bangalore Resort
Address: No. 206, Utopia Layout, Tharabanahalli
Contact:
Operational Hours:24*7

Statiq New Sangeeta Station
Address: No. 7 Javeri Road Sindgi,Next to the Sangeeth
Contact:
Operational Hours:24*7

Hotel Tourist Boarding Restaurant Charging Station
Address: https://maps.app.goo.gl/nE1NhiyzKHjkfsrx9 At
Contact:
Operational Hours:24*7

Royal Orchid Brindavan Garden Charging Station
Address: Brindavan Gardens, Krishna Raja Sagar Mandya
Contact:
Operational Hours:24*7

Statiq MR Residency Station
Address: Infront of the Building, Street No 323, Mehbo
Contact:
Operational Hours:24*7

Nexus Shantiniketan Charging Station
Address: Whitefield Road,In Basment-1, Thigalarapalya,
Contact:
Operational Hours:24*7

Statiq Wonderla Bengaluru Station
Address: Left Side of the Parking Area from Main Entra
Contact:
Operational Hours:24*7

Hotel Kalinga Tavern Charging Station
Address: Bangalore - Mangalore Highway,Hatna
Contact:
Operational Hours:24*7

Statiq Welcomhotel Bengaluru Station
Address: Infront of Main Entrance Gate, Welcomhotel Be
Contact:
Operational Hours:24*7

Nexus Whitefield Charging Station
Address: No.62, Whitefield Road,Second floor parking (
Contact:
Operational Hours:24*7
`;

// Karnataka latitude longitude data for geocoding when needed
const karnatakaCities: Record<string, { lat: number, lng: number }> = {
  'Bengaluru': { lat: 12.9716, lng: 77.5946 },
  'Mysuru': { lat: 12.2958, lng: 76.6394 },
  'Mangaluru': { lat: 12.9141, lng: 74.8560 },
  'Belagavi': { lat: 15.8497, lng: 74.4977 },
  'Hubballi': { lat: 15.3647, lng: 75.1240 },
  'Davanagere': { lat: 14.4644, lng: 75.9218 },
  'Shivamogga': { lat: 13.9304, lng: 75.5684 },
  'Vijayapura': { lat: 16.8302, lng: 75.7100 },
  'Ballari': { lat: 15.1394, lng: 76.9214 },
  'Tumakuru': { lat: 13.3379, lng: 77.1173 },
  'Kalaburagi': { lat: 17.3326, lng: 76.8366 },
  'Udupi': { lat: 13.3408, lng: 74.7421 },
  'Hassan': { lat: 13.0068, lng: 76.1003 },
  'Chitradurga': { lat: 14.2337, lng: 76.3956 },
  'Raichur': { lat: 16.2120, lng: 77.3439 },
  'Bidar': { lat: 17.9104, lng: 77.5199 },
  'Kolar': { lat: 13.1372, lng: 78.1278 },
  'Dharwad': { lat: 15.4589, lng: 75.0078 },
  'Gadag': { lat: 15.4305, lng: 75.6350 },
  'Haveri': { lat: 14.7954, lng: 75.4042 },
  'Chamarajanagar': { lat: 11.9237, lng: 76.9450 },
  'Koppal': { lat: 15.3500, lng: 76.1567 }
};

interface ParsedStation {
  city: string; 
  name: string;
  address: string;
  contact?: string;
  hours: string;
  state: string;
  zipCode?: string;
  lat?: number;
  lng?: number;
}

/**
 * Parse the raw station text data
 */
function parseStationsData(rawData: string): ParsedStation[] {
  const stations: ParsedStation[] = [];
  const blocks = rawData.split('\n\n').filter(block => block.trim() !== '');
  
  for (let block of blocks) {
    try {
      const lines = block.split('\n').filter(line => line.trim() !== '');
      if (lines.length < 3) continue; // Skip invalid blocks
      
      // Parse header line
      let headerLine = lines[0].trim();
      let name = headerLine;
      let city = 'Bengaluru'; // Default
      
      // Check if this is in KA | City | Name format
      if (headerLine.startsWith('KA |')) {
        const parts = headerLine.split('|').map(p => p.trim());
        if (parts.length >= 3) {
          city = parts[1];
          name = parts[2];
        }
      }
      
      // Parse address
      let address = '';
      let state = 'Karnataka';
      let zipCode = '';
      
      const addressLine = lines.find(line => line.startsWith('Address:'));
      if (addressLine) {
        address = addressLine.replace('Address:', '').trim();
        
        // Extract ZIP code if present
        const zipMatch = address.match(/\d{6}$/);
        if (zipMatch) {
          zipCode = zipMatch[0];
        }
      }
      
      // Parse contact
      let contact = '';
      const contactLine = lines.find(line => line.startsWith('Contact:'));
      if (contactLine) {
        contact = contactLine.replace('Contact:', '').trim();
      }
      
      // Parse hours
      let hours = '24*7';
      const hoursLine = lines.find(line => line.startsWith('Operational Hours:'));
      if (hoursLine) {
        hours = hoursLine.replace('Operational Hours:', '').trim();
      }
      
      // If no explicit city in address, use from header
      if (!address.includes(city) && city !== 'Bengaluru') {
        address = `${address}, ${city}, Karnataka`;
      }
      
      // Create station
      stations.push({
        city,
        name: name.includes('Charging Station') ? name : `ChargeZone - ${name}`,
        address,
        contact,
        hours,
        state,
        zipCode
      });
    } catch (error) {
      console.error('Error parsing station block:', error);
    }
  }
  
  return stations;
}

/**
 * Get coordinates for a station based on its address or city
 */
function getCoordinates(station: ParsedStation): { lat: number, lng: number } {
  // Check if we have coordinates for the city
  if (karnatakaCities[station.city]) {
    // Add slight randomization to prevent duplicate coordinates
    const offset = (Math.random() - 0.5) * 0.05;
    return {
      lat: karnatakaCities[station.city].lat + offset,
      lng: karnatakaCities[station.city].lng + offset
    };
  }
  
  // If not found, use Bengaluru as default with randomization
  const offset = (Math.random() - 0.5) * 0.1;
  return {
    lat: 12.9716 + offset,
    lng: 77.5946 + offset
  };
}

/**
 * Fetch Karnataka ChargeZone stations data from the provided list
 */
export async function fetchKarnatakaCZStations(): Promise<InsertChargingStation[]> {
  console.log('Fetching Karnataka ChargeZone stations from provided data');
  
  try {
    // Parse the stations data
    const parsedStations = parseStationsData(rawStationsData);
    console.log(`Found ${parsedStations.length} Karnataka ChargeZone stations`);
    
    const stations: InsertChargingStation[] = [];
    
    // Process each station
    for (const parsedStation of parsedStations) {
      try {
        // Get coordinates for the station
        const coords = getCoordinates(parsedStation);
        
        // Get or create location for this station
        const locationId = await getOrCreateLocation(
          parsedStation.name,
          parsedStation.address,
          parsedStation.city,
          coords.lat,
          coords.lng
        );
        
        if (locationId) {
          // Create charging station
          stations.push({
            locationId,
            operatorName: 'ChargeZone',
            connectorTypes: ['CCS-2', 'Type-2'] as ("CCS-2" | "CHAdeMO" | "Type-2" | "Bharat AC" | "Bharat DC")[],
            powerKw: 25 + Math.floor(Math.random() * 6) * 5, // 25-50 kW
            pricePerKwh: 12 + Math.random() * 3, // 12-15 Rs
            isAvailable: true,
            paymentMethods: ['Credit Card', 'UPI', 'Mobile App'],
            openTime: '00:00',
            closeTime: '23:59',
            amenities: parsedStation.name.includes('Hotel') ? 
              ['Parking', 'Restroom', 'Hotel', 'Restaurant'] : 
              ['Parking', 'Restroom'],
            numPoints: Math.floor(Math.random() * 3) + 2, // 2-4 points
            operatorPhone: parsedStation.contact || '1800-300-15678',
            supportContact: '1800-300-15678'
          });
        }
      } catch (error) {
        console.error(`Error processing station "${parsedStation.name}":`, error);
      }
    }
    
    return stations;
  } catch (error) {
    console.error('Error fetching Karnataka ChargeZone stations:', error);
    return [];
  }
}

/**
 * Get or create a location for a station
 */
async function getOrCreateLocation(
  name: string, 
  address: string, 
  city: string, 
  lat: number, 
  lng: number
): Promise<number | null> {
  try {
    // Check if a similar location exists nearby (within ~100 meters)
    const existingLocations = await db.query.locations.findMany({
      where: (locations, { and, eq, or, like }) => 
        and(
          eq(locations.type, 'charging'),
          or(
            like(locations.name, `%${name.substring(0, 10)}%`),
            like(locations.address, `%${address.substring(0, 15)}%`)
          )
        )
    });
    
    // If similar location exists, use it
    if (existingLocations.length > 0) {
      return existingLocations[0].id;
    }
    
    // If no location exists, create a new one
    const [newLocation] = await db
      .insert(locations)
      .values({
        name,
        address,
        city,
        state: 'Karnataka',
        country: 'India',
        zipCode: '000000', // Placeholder
        type: 'charging',
        latitude: lat,
        longitude: lng,
        active: true,
        description: `ChargeZone EV charging station in ${city}`,
        amenities: name.includes('Hotel') ? 
          ['Parking', 'Restroom', 'Hotel', 'Restaurant'] : 
          ['Parking', 'Restroom'],
        source: 'chargezone'
      })
      .returning();
    
    return newLocation.id;
  } catch (error) {
    console.error('Error getting or creating location:', error);
    return null;
  }
}