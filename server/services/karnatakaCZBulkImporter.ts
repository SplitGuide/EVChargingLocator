/**
 * Karnataka ChargeZone Bulk Station Importer
 * 
 * This service imports a predefined list of ChargeZone stations in Karnataka
 * using the station data we have access to.
 */
import { db } from "../db";
import { locations, chargingStations } from "@shared/schema";
import { storage } from "../storage";

interface KarnatakaCZStation {
  name: string;
  address: string;
  city: string;
  contact: string;
  latitude?: number;
  longitude?: number;
}

// List of ChargeZone stations in Karnataka with their details
const KARNATAKA_CZ_STATIONS: KarnatakaCZStation[] = [
  {
    name: "ChargeZone - Devanahalli JW Golfshire",
    address: "JW Golfshire Nandi Hills Road Karahalli Post, Kundana Hobli, Devanahalli, Taluk, Bengaluru, Karnataka 562164",
    city: "Bengaluru",
    contact: "7777777779",
    latitude: 13.2465,
    longitude: 77.7128
  },
  {
    name: "ChargeZone - Biotech Park Chandapura",
    address: "Biotech Park, Chandapura, Bengaluru, Karnataka 562107",
    city: "Bengaluru",
    contact: "7777777779",
    latitude: 12.7906,
    longitude: 77.7127
  },
  {
    name: "ChargeZone - Marriott Hotel Whitefield",
    address: "Plot No 75, 8th Rd, EPIP Zone, Whitefield, Bengaluru, Karnataka 560066",
    city: "Bengaluru",
    contact: "7777777779",
    latitude: 12.9721,
    longitude: 77.7272
  },
  {
    name: "ChargeZone - JW Marriott Hotel UB City",
    address: "24/1, Vittal Mallya Rd, KG Halli, Shanthala Nagar, Ashok Nagar, Bengaluru, Karnataka 560001",
    city: "Bengaluru",
    contact: "7777777779",
    latitude: 12.9716,
    longitude: 77.5946
  },
  {
    name: "ChargeZone - Hotel Panchvati Shiggaon",
    address: "N H 4 highway shiggaon, taluk, Munavalli, Karnataka 581202",
    city: "Shiggaon",
    contact: "7777777779",
    latitude: 14.9902,
    longitude: 75.2232
  },
  {
    name: "ChargeZone - Rastha Resto Bar",
    address: "NH 48, Shamanur, Davanagere, Karnataka 577004",
    city: "Davanagere",
    contact: "7777777779",
    latitude: 14.4418,
    longitude: 75.9233
  },
  {
    name: "ChargeZone - Hotel Aroma Natural",
    address: "Madras Bombay Trunk Rd, Javagondnahalli, Karnataka 577511",
    city: "Javagondnahalli",
    contact: "7777777779",
    latitude: 13.7118,
    longitude: 77.2718
  },
  {
    name: "ChargeZone - Renaissance Bengaluru Race Course",
    address: "No 17 And 17, 1, Race Course Rd, Madhava Nagar, Extension, Bengaluru, Karnataka 560001",
    city: "Bengaluru",
    contact: "7777777779",
    latitude: 12.9850,
    longitude: 77.5881
  },
  {
    name: "ChargeZone - Sheraton Grand Whitefield",
    address: "Prestige Shantiniketan Hoodi, Whitefield, Bengaluru, Karnataka 560048",
    city: "Bengaluru",
    contact: "7777777779",
    latitude: 12.9896,
    longitude: 77.7269
  },
  {
    name: "ChargeZone - Sheraton Grand Brigade Gateway",
    address: "26/1 Dr. Rajkumar Road Malleswaram, Rajajinagar, Bengaluru, Karnataka 560055",
    city: "Bengaluru",
    contact: "7777777779",
    latitude: 13.0095,
    longitude: 77.5551
  }
];

/**
 * Import ChargeZone stations based on predefined list
 */
export async function importKarnatakaCZBulkStations(): Promise<number> {
  let importedCount = 0;
  let skippedCount = 0;

  console.log(`Importing ${KARNATAKA_CZ_STATIONS.length} ChargeZone stations in Karnataka`);

  for (const station of KARNATAKA_CZ_STATIONS) {
    try {
      // Check if a similar location exists
      const existingLocations = await db.query.locations.findMany({
        where: (locations, { and, eq, or, like, between }) => 
          and(
            eq(locations.type, 'charging'),
            or(
              like(locations.name, `%${station.name.substring(0, 10)}%`),
              like(locations.address, `%${station.address.substring(0, 15)}%`),
              // Check coordinates if available (within 100 meters)
              station.latitude && station.longitude ? 
                and(
                  between(locations.latitude, station.latitude - 0.001, station.latitude + 0.001),
                  between(locations.longitude, station.longitude - 0.001, station.longitude + 0.001)
                ) 
              : undefined
            )
          )
      });
      
      // If location already exists, use it
      let locationId: number;
      
      if (existingLocations.length > 0) {
        console.log(`Found existing location for ${station.name}`);
        locationId = existingLocations[0].id;
      } else {
        // Create new location
        console.log(`Creating new location for ${station.name}`);
        
        // Use default coordinates if none provided
        const latitude = station.latitude || 
          (station.city === "Bengaluru" ? 12.9716 : 14.0000);
        const longitude = station.longitude || 
          (station.city === "Bengaluru" ? 77.5946 : 76.0000);
        
        const [newLocation] = await db
          .insert(locations)
          .values({
            name: station.name,
            type: 'charging',
            address: station.address,
            city: station.city,
            state: "Karnataka",
            country: 'India',
            latitude,
            longitude,
            active: true,
            amenities: ['Parking', 'Restroom', 'Hotel', 'Restaurant'],
            source: 'chargezone',
            description: `ChargeZone EV charging station at ${station.name}`
          })
          .returning();
        
        locationId = newLocation.id;
      }
      
      // Check if there's already a charging station entry
      const existingStations = await storage.getChargingStationsByLocationId(locationId);
      const stationExists = existingStations.some(s => 
        s.operatorName === 'ChargeZone'
      );
      
      if (stationExists) {
        console.log(`Charging station for ${station.name} already exists, skipping`);
        skippedCount++;
        continue;
      }
      
      // Create charging station
      console.log(`Creating charging station at ${station.name}`);
      await db
        .insert(chargingStations)
        .values({
          locationId,
          operatorName: 'ChargeZone',
          connectorTypes: ['CCS-2', 'Type-2'] as ("CCS-2" | "CHAdeMO" | "Type-2" | "Bharat AC" | "Bharat DC")[],
          powerKw: 30,
          pricePerKwh: 14,
          isAvailable: true,
          paymentMethods: ['Credit Card', 'UPI', 'Mobile App'],
          numPoints: 3,
          operatorPhone: station.contact || '1800-300-15678',
          supportContact: '1800-300-15678'
        });
      
      importedCount++;
      console.log(`Successfully added charging station: ${station.name}`);
    } catch (error) {
      console.error(`Error adding station ${station.name}:`, error);
      skippedCount++;
    }
  }

  console.log(`Imported ${importedCount} ChargeZone stations (skipped ${skippedCount})`);
  return importedCount;
}