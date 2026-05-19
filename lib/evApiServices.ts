/**
 * EV Charging Network API Services
 * 
 * This module provides adapters for various EV charging networks in India.
 * It fetches and normalizes data from different API sources.
 */

import { ChargingStation, Location } from '@shared/schema';

// Common interface for normalized station data
export interface NormalizedStation {
  id: string;
  providerId: string;
  providerName: string;
  name: string;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  connectorTypes: string[];
  powerKw: number;
  pricePerKwh: number | null;
  isAvailable: boolean;
  phoneNumber?: string;
  imageUrl?: string;
}

// List of supported provider IDs
export type ProviderID = 
  | 'tata_power'
  | 'ather_grid'
  | 'fortum'
  | 'charge_zone'
  | 'statiq'
  | 'electreefi'
  | 'kazam'
  | 'zeon'
  | 'chargemod'
  | 'reliance_jio_bp'
  | 'bpcl'
  | 'bolt'
  | 'iocl'
  | 'hp'
  | 'magenta'
  | 'power_grid'
  | 'eb';

// Mapping of provider IDs to full names
export const providerNames: Record<ProviderID, string> = {
  tata_power: 'Tata Power EZ Charge',
  ather_grid: 'Ather Grid',
  fortum: 'Fortum Charge & Drive',
  charge_zone: 'Charge Zone',
  statiq: 'Statiq',
  electreefi: 'ElecTreeFi',
  kazam: 'Kazam',
  zeon: 'Zeon Charging',
  chargemod: 'ChargeMOD',
  reliance_jio_bp: 'Jio-bp Pulse',
  bpcl: 'BPCL e-Drive',
  bolt: 'Bolt Charging',
  iocl: 'Indian Oil EV Stations',
  hp: 'Hindustan Petroleum EV Charge',
  magenta: 'Magenta ChargeGrid',
  power_grid: 'PowerGrid eDrive',
  eb: 'Electricity Board Charging'
};

/**
 * Base class for provider-specific API adapters
 */
abstract class EVProviderAdapter {
  abstract readonly providerId: ProviderID;
  abstract readonly providerName: string;
  
  abstract fetchStations(latitude: number, longitude: number, radiusKm: number): Promise<NormalizedStation[]>;
  
  // Helper to create a normalized station from provider-specific data
  protected normalizeStation(data: any): NormalizedStation {
    // Implementation would vary based on provider data structure
    // This is a placeholder
    return {
      id: `${this.providerId}_${data.id}`,
      providerId: this.providerId,
      providerName: this.providerName,
      name: data.name || 'Unknown Station',
      address: data.address || 'Address not available',
      city: data.city || '',
      state: data.state || '',
      latitude: data.latitude || 0,
      longitude: data.longitude || 0,
      connectorTypes: data.connectorTypes || [],
      powerKw: data.powerKw || 0,
      pricePerKwh: data.pricePerKwh || null,
      isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
      phoneNumber: data.phoneNumber || undefined,
      imageUrl: data.imageUrl || undefined
    };
  }
}

/**
 * Tata Power EZ Charge Adapter
 */
class TataPowerAdapter extends EVProviderAdapter {
  readonly providerId: ProviderID = 'tata_power';
  readonly providerName: string = providerNames.tata_power;
  
  async fetchStations(latitude: number, longitude: number, radiusKm: number): Promise<NormalizedStation[]> {
    try {
      // In a real implementation, this would make an API call to Tata Power's service
      // For now, we will use our internal API as a proxy
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        radius: radiusKm.toString(),
        provider: this.providerId
      });
      
      const response = await fetch(`/api/ev-providers/stations?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${this.providerName} stations: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.map((station: any) => this.normalizeStation(station));
    } catch (error) {
      console.error(`Error fetching ${this.providerName} stations:`, error);
      return [];
    }
  }
}

/**
 * Ather Grid Adapter
 */
class AtherGridAdapter extends EVProviderAdapter {
  readonly providerId: ProviderID = 'ather_grid';
  readonly providerName: string = providerNames.ather_grid;
  
  async fetchStations(latitude: number, longitude: number, radiusKm: number): Promise<NormalizedStation[]> {
    try {
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        radius: radiusKm.toString(),
        provider: this.providerId
      });
      
      const response = await fetch(`/api/ev-providers/stations?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${this.providerName} stations: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.map((station: any) => this.normalizeStation(station));
    } catch (error) {
      console.error(`Error fetching ${this.providerName} stations:`, error);
      return [];
    }
  }
}

/**
 * Fortum Charge & Drive Adapter
 */
class FortumAdapter extends EVProviderAdapter {
  readonly providerId: ProviderID = 'fortum';
  readonly providerName: string = providerNames.fortum;
  
  async fetchStations(latitude: number, longitude: number, radiusKm: number): Promise<NormalizedStation[]> {
    try {
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        radius: radiusKm.toString(),
        provider: this.providerId
      });
      
      const response = await fetch(`/api/ev-providers/stations?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${this.providerName} stations: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.map((station: any) => this.normalizeStation(station));
    } catch (error) {
      console.error(`Error fetching ${this.providerName} stations:`, error);
      return [];
    }
  }
}

/**
 * Jio-bp Pulse Adapter
 */
class JioBPAdapter extends EVProviderAdapter {
  readonly providerId: ProviderID = 'reliance_jio_bp';
  readonly providerName: string = providerNames.reliance_jio_bp;
  
  async fetchStations(latitude: number, longitude: number, radiusKm: number): Promise<NormalizedStation[]> {
    try {
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        radius: radiusKm.toString(),
        provider: this.providerId
      });
      
      const response = await fetch(`/api/ev-providers/stations?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${this.providerName} stations: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.map((station: any) => this.normalizeStation(station));
    } catch (error) {
      console.error(`Error fetching ${this.providerName} stations:`, error);
      return [];
    }
  }
}

/**
 * BPCL e-Drive Adapter
 */
class BPCLAdapter extends EVProviderAdapter {
  readonly providerId: ProviderID = 'bpcl';
  readonly providerName: string = providerNames.bpcl;
  
  async fetchStations(latitude: number, longitude: number, radiusKm: number): Promise<NormalizedStation[]> {
    try {
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        radius: radiusKm.toString(),
        provider: this.providerId
      });
      
      const response = await fetch(`/api/ev-providers/stations?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${this.providerName} stations: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.map((station: any) => this.normalizeStation(station));
    } catch (error) {
      console.error(`Error fetching ${this.providerName} stations:`, error);
      return [];
    }
  }
}

/**
 * Bolt Charging Adapter
 */
class BoltAdapter extends EVProviderAdapter {
  readonly providerId: ProviderID = 'bolt';
  readonly providerName: string = providerNames.bolt;
  
  async fetchStations(latitude: number, longitude: number, radiusKm: number): Promise<NormalizedStation[]> {
    try {
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        radius: radiusKm.toString(),
        provider: this.providerId
      });
      
      const response = await fetch(`/api/ev-providers/stations?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${this.providerName} stations: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.map((station: any) => this.normalizeStation(station));
    } catch (error) {
      console.error(`Error fetching ${this.providerName} stations:`, error);
      return [];
    }
  }
}

/**
 * Indian Oil EV Stations Adapter
 */
class IOCLAdapter extends EVProviderAdapter {
  readonly providerId: ProviderID = 'iocl';
  readonly providerName: string = providerNames.iocl;
  
  async fetchStations(latitude: number, longitude: number, radiusKm: number): Promise<NormalizedStation[]> {
    try {
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        radius: radiusKm.toString(),
        provider: this.providerId
      });
      
      const response = await fetch(`/api/ev-providers/stations?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${this.providerName} stations: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.map((station: any) => this.normalizeStation(station));
    } catch (error) {
      console.error(`Error fetching ${this.providerName} stations:`, error);
      return [];
    }
  }
}

/**
 * Hindustan Petroleum EV Charge Adapter
 */
class HPAdapter extends EVProviderAdapter {
  readonly providerId: ProviderID = 'hp';
  readonly providerName: string = providerNames.hp;
  
  async fetchStations(latitude: number, longitude: number, radiusKm: number): Promise<NormalizedStation[]> {
    try {
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        radius: radiusKm.toString(),
        provider: this.providerId
      });
      
      const response = await fetch(`/api/ev-providers/stations?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${this.providerName} stations: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.map((station: any) => this.normalizeStation(station));
    } catch (error) {
      console.error(`Error fetching ${this.providerName} stations:`, error);
      return [];
    }
  }
}

/**
 * Magenta ChargeGrid Adapter
 */
class MagentaAdapter extends EVProviderAdapter {
  readonly providerId: ProviderID = 'magenta';
  readonly providerName: string = providerNames.magenta;
  
  async fetchStations(latitude: number, longitude: number, radiusKm: number): Promise<NormalizedStation[]> {
    try {
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        radius: radiusKm.toString(),
        provider: this.providerId
      });
      
      const response = await fetch(`/api/ev-providers/stations?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${this.providerName} stations: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.map((station: any) => this.normalizeStation(station));
    } catch (error) {
      console.error(`Error fetching ${this.providerName} stations:`, error);
      return [];
    }
  }
}

/**
 * PowerGrid eDrive Adapter
 */
class PowerGridAdapter extends EVProviderAdapter {
  readonly providerId: ProviderID = 'power_grid';
  readonly providerName: string = providerNames.power_grid;
  
  async fetchStations(latitude: number, longitude: number, radiusKm: number): Promise<NormalizedStation[]> {
    try {
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        radius: radiusKm.toString(),
        provider: this.providerId
      });
      
      const response = await fetch(`/api/ev-providers/stations?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${this.providerName} stations: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.map((station: any) => this.normalizeStation(station));
    } catch (error) {
      console.error(`Error fetching ${this.providerName} stations:`, error);
      return [];
    }
  }
}

/**
 * Electricity Board Charging Adapter
 */
class EBAdapter extends EVProviderAdapter {
  readonly providerId: ProviderID = 'eb';
  readonly providerName: string = providerNames.eb;
  
  async fetchStations(latitude: number, longitude: number, radiusKm: number): Promise<NormalizedStation[]> {
    try {
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        radius: radiusKm.toString(),
        provider: this.providerId
      });
      
      const response = await fetch(`/api/ev-providers/stations?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${this.providerName} stations: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.map((station: any) => this.normalizeStation(station));
    } catch (error) {
      console.error(`Error fetching ${this.providerName} stations:`, error);
      return [];
    }
  }
}

/**
 * Charge Zone Adapter
 */
class ChargeZoneAdapter extends EVProviderAdapter {
  readonly providerId: ProviderID = 'charge_zone';
  readonly providerName: string = providerNames.charge_zone;
  
  async fetchStations(latitude: number, longitude: number, radiusKm: number): Promise<NormalizedStation[]> {
    try {
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        radius: radiusKm.toString(),
        provider: this.providerId
      });
      
      const response = await fetch(`/api/ev-providers/stations?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${this.providerName} stations: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.map((station: any) => this.normalizeStation(station));
    } catch (error) {
      console.error(`Error fetching ${this.providerName} stations:`, error);
      return [];
    }
  }
}

/**
 * Statiq Adapter
 */
class StatiqAdapter extends EVProviderAdapter {
  readonly providerId: ProviderID = 'statiq';
  readonly providerName: string = providerNames.statiq;
  
  async fetchStations(latitude: number, longitude: number, radiusKm: number): Promise<NormalizedStation[]> {
    try {
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        radius: radiusKm.toString(),
        provider: this.providerId
      });
      
      const response = await fetch(`/api/ev-providers/stations?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${this.providerName} stations: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.map((station: any) => this.normalizeStation(station));
    } catch (error) {
      console.error(`Error fetching ${this.providerName} stations:`, error);
      return [];
    }
  }
}

// Initialize providers
const providers = [
  new TataPowerAdapter(),
  new AtherGridAdapter(),
  new FortumAdapter(),
  new JioBPAdapter(),
  new BPCLAdapter(),
  new BoltAdapter(),
  new IOCLAdapter(),
  new HPAdapter(),
  new MagentaAdapter(),
  new PowerGridAdapter(),
  new EBAdapter(),
  new ChargeZoneAdapter(),
  new StatiqAdapter()
];

/**
 * Function to aggregate station data from all supported providers
 */
export async function fetchAllProviderStations(
  latitude: number, 
  longitude: number, 
  radiusKm: number = 10,
  selectedProviders?: ProviderID[]
): Promise<NormalizedStation[]> {
  // Filter providers if specific ones were requested
  const providersToFetch = selectedProviders 
    ? providers.filter(p => selectedProviders.includes(p.providerId)) 
    : providers;
  
  try {
    // Fetch from all selected providers in parallel
    const providerResults = await Promise.allSettled(
      providersToFetch.map(provider => 
        provider.fetchStations(latitude, longitude, radiusKm)
      )
    );
    
    // Merge results, keeping only successful fetches
    let allStations: NormalizedStation[] = [];
    
    providerResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allStations = [...allStations, ...result.value];
      } else {
        console.error(`Failed to fetch from ${providersToFetch[index].providerName}:`, result.reason);
      }
    });
    
    return allStations;
  } catch (error) {
    console.error('Error fetching stations from providers:', error);
    return [];
  }
}

/**
 * Convert normalized station data to application schema format
 */
export function convertToAppSchema(stations: NormalizedStation[]): Location[] {
  return stations.map(station => ({
    id: parseInt(station.id.split('_')[1]),
    name: station.name,
    type: 'charging' as const,
    address: station.address,
    city: station.city,
    state: station.state,
    latitude: station.latitude,
    longitude: station.longitude,
    rating: 4.5, // Default rating
    imageUrl: station.imageUrl || null,
    description: `${station.providerName} charging station`,
    phoneNumber: station.phoneNumber || null,
    isOpen: station.isAvailable,
    source: station.providerId,
    chargingStations: [{
      id: parseInt(station.id.split('_')[1]),
      locationId: parseInt(station.id.split('_')[1]),
      operatorName: station.providerName,
      connectorTypes: station.connectorTypes as any[],
      powerKw: station.powerKw,
      pricePerKwh: station.pricePerKwh,
      paymentMethods: ['UPI', 'Credit Card', 'Debit Card'],
      isAvailable: station.isAvailable,
      numberOfPoints: 2,
      waitTime: 0,
      lastReported: new Date().toISOString(),
      networkName: station.providerName,
      queueLength: 0,
      supportContact: station.phoneNumber || null
    }]
  }));
}