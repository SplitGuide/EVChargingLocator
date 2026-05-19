/**
 * Import EV Charging Stations from CSV file
 * 
 * This script processes the CSV file of Indian EV charging stations
 * and imports them into our application database.
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse';
import { storage } from './storage';

// Define connector type mapping from CSV values to our schema values
function determineConnectorTypes(type: string): string[] {
  type = type.toLowerCase();
  const connectors: string[] = [];
  
  if (type.includes('ccs') || type.includes('combo')) {
    connectors.push('CCS-2');
  }
  
  if (type.includes('chademo')) {
    connectors.push('CHAdeMO');
  }
  
  if (type.includes('type 2') || type.includes('type-2') || type.includes('type2')) {
    connectors.push('Type-2');
  }
  
  if (type.includes('ac001') || type.includes('bharat ac')) {
    connectors.push('Bharat AC');
  }
  
  if (type.includes('dc001') || type.includes('bharat dc')) {
    connectors.push('Bharat DC');
  }
  
  // Default to Type-2 if no matches
  if (connectors.length === 0) {
    connectors.push('Type-2');
  }
  
  return connectors;
}

// Determine network name from station name or other fields
function determineNetwork(name: string): string {
  name = name.toLowerCase();
  
  if (name.includes('tata power') || name.includes('tatapower')) {
    return 'Tata Power';
  }
  
  if (name.includes('fortum')) {
    return 'Fortum';
  }
  
  if (name.includes('ather') || name.includes('grid')) {
    return 'Ather Grid';
  }
  
  if (name.includes('charge zone') || name.includes('chargezone')) {
    return 'ChargeZone';
  }
  
  if (name.includes('statiq') || name.includes('zeon')) {
    return 'Statiq';
  }
  
  if (name.includes('kazam')) {
    return 'Kazam';
  }
  
  if (name.includes('volttic')) {
    return 'Volttic';
  }
  
  if (name.includes('jio') || name.includes('bp')) {
    return 'Jio-bp Pulse';
  }
  
  if (name.includes('electreefi')) {
    return 'ElectreeFi';
  }
  
  if (name.includes('reliance')) {
    return 'Reliance';
  }
  
  if (name.includes('magenta')) {
    return 'Magenta';
  }
  
  if (name.includes('okaya')) {
    return 'Okaya';
  }
  
  // Default 
  return 'Other';
}

/**
 * Main function to import stations from CSV
 */
export async function importStationsFromCsv() {
  const csvFilePath = path.join(process.cwd(), 'attached_assets', 'ev-charging-stations-india.csv');
  
  if (!fs.existsSync(csvFilePath)) {
    throw new Error(`CSV file not found at ${csvFilePath}`);
  }
  
  // Read and parse the CSV file
  const fileContent = fs.readFileSync(csvFilePath, { encoding: 'utf-8' });
  
  // Create results record to track import stats
  const results = {
    importedCount: 0,
    skippedCount: 0
  };
  
  return new Promise<{importedCount: number, skippedCount: number}>((resolve, reject) => {
    parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }, async (err, records) => {
      if (err) {
        console.error('Error parsing CSV:', err);
        reject(err);
        return;
      }
      
      try {
        for (const record of records) {
          try {
            // Process each station record
            const name = record.name || record.station_name || 'Unknown Station';
            const address = record.address || 'Unknown Address';
            
            // Account for typo in CSV header (lattitude vs latitude)
            const latitude = record.latitude || record.lattitude;
            const longitude = record.longitude;
            
            // Skip if we don't have sufficient data
            if (!latitude || !longitude) {
              console.log(`Skipping station ${name} - missing coordinates`);
              results.skippedCount++;
              continue;
            }
            
            // Create location entry first
            let location;
            try {
              location = await storage.createLocation({
                name,
                address,
                type: 'charging', 
                city: record.city || 'Unknown City',
                state: record.state || 'Unknown State',
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                phoneNumber: record.phone || null,
                rating: record.rating ? parseFloat(record.rating) : 4.0, // Default good rating if missing
                imageUrl: record.image_url || null,
                description: record.description || `EV Charging station in ${record.city || 'India'}`,
                source: 'csv-import'
              });
            } catch (error) {
              console.error(`Error creating location for ${name}:`, error);
              results.skippedCount++;
              continue;
            }
            
            // Create charging station entry
            const connectorTypes = determineConnectorTypes(record.connector_type || 'Type-2');
            const networkName = determineNetwork(name); 
            
            try {
              await storage.createChargingStation({
                locationId: location.id,
                operatorName: record.operator || networkName,
                networkName: networkName,
                connectorTypes: connectorTypes,
                powerKw: parseFloat(record.power_kw || '22'), // Default to 22kW if missing
                pricePerKwh: record.price_per_kwh ? parseFloat(record.price_per_kwh) : null,
                paymentMethods: record.payment_methods ? record.payment_methods.split(',') : ['Card', 'Mobile App'],
                isAvailable: record.is_available === 'true' || record.is_available === '1' || true,
                numberOfPoints: parseInt(record.number_of_points || '2'),
                waitTime: parseInt(record.wait_time || '0'),
                queueLength: parseInt(record.queue_length || '0'),
                lastReported: record.last_reported ? new Date(record.last_reported) : new Date(),
                supportContact: record.support_contact || record.phone || null
              });
              
              results.importedCount++;
            } catch (error) {
              console.error(`Error creating charging station for ${name}:`, error);
              results.skippedCount++;
            }
          } catch (recordError) {
            console.error('Error processing record:', recordError);
            results.skippedCount++;
          }
        }
        
        resolve(results);
      } catch (processingError) {
        console.error('Error during CSV processing:', processingError);
        reject(processingError);
      }
    });
  });
}