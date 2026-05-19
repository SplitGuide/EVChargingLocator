/**
 * Add a single station utility for quick addition of individual stations
 */
import { db } from "../db";
import { locations, chargingStations } from "@shared/schema";
import { storage } from "../storage";

interface StationData {
  name: string;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  operatorName?: string;
  contact?: string;
}

export async function addSingleStation(stationData: StationData) {
  try {
    console.log(`Adding single station: ${stationData.name} in ${stationData.city}`);
    
    // First check if a similar location exists
    const existingLocations = await db.query.locations.findMany({
      where: (locations, { and, eq, or, like, between }) => 
        and(
          eq(locations.type, 'charging'),
          or(
            like(locations.name, `%${stationData.name.substring(0, 10)}%`),
            like(locations.address, `%${stationData.address.substring(0, 15)}%`),
            // Also check by coordinates (approximately within 100 meters)
            and(
              between(locations.latitude, stationData.latitude - 0.001, stationData.latitude + 0.001),
              between(locations.longitude, stationData.longitude - 0.001, stationData.longitude + 0.001)
            )
          )
        )
    });
    
    // If location already exists, use it
    let locationId: number;
    
    if (existingLocations.length > 0) {
      console.log(`Found existing location for ${stationData.name}`);
      locationId = existingLocations[0].id;
    } else {
      // Create new location
      console.log(`Creating new location for ${stationData.name}`);
      const [newLocation] = await db
        .insert(locations)
        .values({
          name: stationData.name,
          type: 'charging',
          address: stationData.address,
          city: stationData.city,
          state: stationData.state,
          country: 'India',
          latitude: stationData.latitude,
          longitude: stationData.longitude,
          active: true,
          amenities: ['Parking', 'Restroom', 'Hotel', 'Restaurant'],
          source: 'chargezone',
          description: `ChargeZone EV charging station at ${stationData.name}`
        })
        .returning();
      
      locationId = newLocation.id;
    }
    
    // Check if there's already a charging station entry
    const existingStations = await storage.getChargingStationsByLocationId(locationId);
    const stationExists = existingStations.some(station => 
      station.operatorName === 'ChargeZone'
    );
    
    if (stationExists) {
      console.log(`Charging station at ${stationData.name} already exists, skipping`);
      return { success: false, message: 'Station already exists' };
    }
    
    // Create charging station
    console.log(`Creating charging station at ${stationData.name}`);
    const [newStation] = await db
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
        operatorPhone: stationData.contact || '1800-300-15678',
        supportContact: '1800-300-15678'
      })
      .returning();
    
    console.log(`Successfully added charging station: ${stationData.name}`);
    return { 
      success: true, 
      message: 'Station added successfully',
      locationId,
      stationId: newStation.id
    };
  } catch (error) {
    console.error('Error adding single station:', error);
    return { success: false, message: 'Error adding station', error };
  }
}