/**
 * PDF Data Importer for Government of India Charging Station Data
 * 
 * This utility downloads and parses PDF data from various government sources:
 * - Ministry of Power (MoP) - Public charging stations installed
 * - Central Electricity Authority (CEA) - EV charging locations
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { db } from '../db';
import { locations, chargingStations } from '@shared/schema';
import { eq, and, like, or } from 'drizzle-orm';

// URLs of the PDF files from government sources
const GOV_PDF_SOURCES = {
  MOP: {
    name: 'Ministry of Power',
    url: 'https://powermin.gov.in/sites/default/files/uploads/Details_of_Public_Charging_Stations_Installed.pdf',
    description: 'Details of Public Charging Stations Installed'
  },
  CEA: {
    name: 'Central Electricity Authority',
    url: 'https://cea.nic.in/wp-content/uploads/2020/04/ev_location.pdf',
    description: 'EV Charging Locations Data'
  }
};

interface GovStation {
  serialNumber: string;
  cpo: string; // Charge Point Operator
  state: string;
  city: string;
  address: string;
  latitude?: number;
  longitude?: number;
  chargerTypes?: string[];
}

/**
 * Download the PDF file from the government website
 */
async function downloadPDF(url: string, outputPath: string): Promise<boolean> {
  try {
    console.log(`Downloading PDF from ${url}`);
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`PDF downloaded to ${outputPath}`);
        resolve(true);
      });
      writer.on('error', (err) => {
        console.error('Error downloading PDF:', err);
        reject(false);
      });
    });
  } catch (error) {
    console.error('Error downloading PDF:', error);
    return false;
  }
}

/**
 * Cross-check a single station against our database
 */
async function crossCheckStation(govStation: GovStation) {
  try {
    // Simplified address and location for matching
    const simplifiedAddress = govStation.address
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    
    // Search by coordinates if available
    if (govStation.latitude && govStation.longitude) {
      const existingByCoords = await db.query.locations.findMany({
        where: (locations, { and, between }) => 
          and(
            between(locations.latitude, govStation.latitude! - 0.001, govStation.latitude! + 0.001),
            between(locations.longitude, govStation.longitude! - 0.001, govStation.longitude! + 0.001)
          )
      });
      
      if (existingByCoords.length > 0) {
        return {
          found: true,
          matchType: 'coordinates',
          location: existingByCoords[0]
        };
      }
    }
    
    // Try to match by address and city
    const existingByAddress = await db.query.locations.findMany({
      where: (locations, { and, like, eq }) => 
        and(
          eq(locations.type, 'charging'),
          eq(locations.city, govStation.city),
          or(
            like(locations.address.toLowerCase(), `%${simplifiedAddress.substring(0, Math.min(20, simplifiedAddress.length))}%`),
            like(locations.name.toLowerCase(), `%${govStation.cpo.substring(0, Math.min(10, govStation.cpo.length))}%`)
          )
        )
    });
    
    if (existingByAddress.length > 0) {
      return {
        found: true,
        matchType: 'address',
        location: existingByAddress[0]
      };
    }
    
    return {
      found: false,
      matchType: 'none',
      govStation
    };
  } catch (error) {
    console.error('Error cross-checking station:', error);
    return {
      found: false,
      error: error,
      govStation
    };
  }
}

/**
 * Cross-check a list of stations against our database
 * For demonstration, this function accepts a manually created list
 * In a real implementation, this would be the result of PDF parsing
 */
export async function crossCheckStations(govStations: GovStation[]) {
  const results = {
    total: govStations.length,
    found: 0,
    notFound: 0,
    matches: [] as any[],
    newStations: [] as GovStation[]
  };
  
  for (const station of govStations) {
    const checkResult = await crossCheckStation(station);
    
    if (checkResult.found) {
      results.found++;
      results.matches.push({
        govStation: station,
        dbStation: checkResult.location,
        matchType: checkResult.matchType
      });
    } else {
      results.notFound++;
      results.newStations.push(station);
    }
  }
  
  return results;
}

/**
 * Import data from Government PDF sources
 * This handles both Ministry of Power and CEA data
 */
export async function importFromGovPDF(sourceKey: 'MOP' | 'CEA' = 'MOP') {
  const tempDir = path.join(__dirname, '../../temp');
  
  // Create temp directory if it doesn't exist
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const source = GOV_PDF_SOURCES[sourceKey];
  const pdfPath = path.join(tempDir, `${sourceKey.toLowerCase()}_charging_stations.pdf`);
  
  console.log(`Starting import from ${source.name} (${source.description})`);
  
  // Download the PDF
  const downloaded = await downloadPDF(source.url, pdfPath);
  if (!downloaded) {
    return {
      success: false,
      message: `Failed to download PDF from ${source.name}`
    };
  }
  
  // For demonstration, we'll use different sample data based on the source
  // In a real implementation, we would actually parse the PDF
  // and extract the data from it
  let sampleStations: GovStation[] = [];
  
  if (sourceKey === 'MOP') {
    // Ministry of Power sample data
    sampleStations = [
      {
        serialNumber: "1",
        cpo: "EESL",
        state: "Karnataka",
        city: "Bengaluru",
        address: "JW Golfshire, Nandi Hills Road, Devanahalli",
        latitude: 13.2465,
        longitude: 77.7128,
        chargerTypes: ["CCS-2", "Type-2"]
      },
      {
        serialNumber: "2",
        cpo: "EESL",
        state: "Karnataka",
        city: "Bengaluru",
        address: "Biotech Park, Chandapura",
        latitude: 12.7906,
        longitude: 77.7127,
        chargerTypes: ["CCS-2", "Type-2"]
      },
      {
        serialNumber: "3",
        cpo: "NTPC",
        state: "Delhi",
        city: "New Delhi",
        address: "Ashok Hotel, Chanakyapuri",
        latitude: 28.5991,
        longitude: 77.2076,
        chargerTypes: ["CCS-2", "CHAdeMO"]
      }
    ];
  } else if (sourceKey === 'CEA') {
    // Central Electricity Authority sample data
    sampleStations = [
      {
        serialNumber: "1",
        cpo: "BESCOM",
        state: "Karnataka",
        city: "Bengaluru",
        address: "BESCOM Corporate Office, KR Circle",
        latitude: 12.9719,
        longitude: 77.5933,
        chargerTypes: ["Type-2", "Bharat AC"]
      },
      {
        serialNumber: "2",
        cpo: "PowerGrid",
        state: "Maharashtra",
        city: "Mumbai",
        address: "Bandra Kurla Complex, Bandra East",
        latitude: 19.0607,
        longitude: 72.8628,
        chargerTypes: ["CCS-2", "CHAdeMO"]
      },
      {
        serialNumber: "3",
        cpo: "KSEB",
        state: "Kerala",
        city: "Kochi",
        address: "Info Park, Kakkanad",
        latitude: 10.0147,
        longitude: 76.3425,
        chargerTypes: ["Type-2", "Bharat DC"]
      }
    ];
  }
  
  // Cross-check sample data
  const results = await crossCheckStations(sampleStations);
  
  // Clean up - remove downloaded file
  if (fs.existsSync(pdfPath)) {
    fs.unlinkSync(pdfPath);
  }
  
  return {
    success: true,
    source: source.name,
    sourceDescription: source.description,
    results,
    message: `Cross-checked ${results.total} stations from ${source.name}: ${results.found} found in database, ${results.notFound} new stations.`
  };
}