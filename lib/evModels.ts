/**
 * EV Models Interface and Data
 * 
 * This module provides interfaces and data for electric vehicles in India,
 * including their specifications, battery capacities, and range information.
 */

// Vehicle interface for consistent usage across components
export interface Vehicle {
  id?: number;
  userId?: number;
  make: string;
  model: string;
  year?: number;
  type: string;
  batteryCapacityKwh: number;
  rangeKm: number;
  registrationNumber?: string;
  connectorTypes: string[];
  photo?: string;
  nickname?: string;
  efficiency?: number; // Wh/km
}

// EV Model interface for trip planner
export interface EVModel {
  id: string;
  name: string;
  type: string;
  batteryCapacityKwh: number;
  rangeKm: number;
  year?: number;
  connectorTypes: string[];
}

// Manufacturers data structure for trip planner UI
export const evManufacturers = [
  {
    id: "tata",
    name: "Tata Motors",
    models: [
      { id: "nexon-ev", name: "Nexon EV", type: "suv", batteryCapacityKwh: 30.2, rangeKm: 312, connectorTypes: ["CCS-2", "Type-2"] },
      { id: "tigor-ev", name: "Tigor EV", type: "sedan", batteryCapacityKwh: 26, rangeKm: 306, connectorTypes: ["CCS-2", "Type-2"] },
      { id: "nexon-ev-max", name: "Nexon EV Max", type: "suv", batteryCapacityKwh: 40.5, rangeKm: 437, connectorTypes: ["CCS-2", "Type-2"] }
    ]
  },
  {
    id: "mg",
    name: "MG Motor",
    models: [
      { id: "zs-ev", name: "ZS EV", type: "suv", batteryCapacityKwh: 50.3, rangeKm: 461, connectorTypes: ["CCS-2", "Type-2"] },
      { id: "comet-ev", name: "Comet EV", type: "hatchback", batteryCapacityKwh: 17.3, rangeKm: 230, connectorTypes: ["Type-2"] }
    ]
  },
  {
    id: "hyundai",
    name: "Hyundai",
    models: [
      { id: "kona-electric", name: "Kona Electric", type: "suv", batteryCapacityKwh: 39.2, rangeKm: 452, connectorTypes: ["CCS-2", "Type-2"] }
    ]
  },
  {
    id: "mahindra",
    name: "Mahindra",
    models: [
      { id: "xuv400", name: "XUV400", type: "suv", batteryCapacityKwh: 39.4, rangeKm: 456, connectorTypes: ["CCS-2", "Type-2"] }
    ]
  },
  {
    id: "byd",
    name: "BYD",
    models: [
      { id: "e6", name: "e6", type: "suv", batteryCapacityKwh: 71.7, rangeKm: 415, connectorTypes: ["CCS-2", "Type-2"] },
      { id: "atto-3", name: "Atto 3", type: "suv", batteryCapacityKwh: 60.48, rangeKm: 521, connectorTypes: ["CCS-2", "Type-2"] }
    ]
  },
  {
    id: "kia",
    name: "Kia",
    models: [
      { id: "ev6", name: "EV6", type: "suv", batteryCapacityKwh: 77.4, rangeKm: 708, connectorTypes: ["CCS-2", "Type-2"] }
    ]
  },
  {
    id: "mercedes",
    name: "Mercedes-Benz",
    models: [
      { id: "eqc", name: "EQC", type: "suv", batteryCapacityKwh: 80, rangeKm: 471, connectorTypes: ["CCS-2", "Type-2"] }
    ]
  },
  {
    id: "audi",
    name: "Audi",
    models: [
      { id: "e-tron", name: "e-tron", type: "suv", batteryCapacityKwh: 95, rangeKm: 400, connectorTypes: ["CCS-2", "Type-2"] }
    ]
  },
  {
    id: "bmw",
    name: "BMW",
    models: [
      { id: "i4", name: "i4", type: "sedan", batteryCapacityKwh: 83.9, rangeKm: 590, connectorTypes: ["CCS-2", "Type-2"] },
      { id: "ix", name: "iX", type: "suv", batteryCapacityKwh: 76.6, rangeKm: 425, connectorTypes: ["CCS-2", "Type-2"] }
    ]
  },
  {
    id: "volvo",
    name: "Volvo",
    models: [
      { id: "xc40-recharge", name: "XC40 Recharge", type: "suv", batteryCapacityKwh: 78, rangeKm: 418, connectorTypes: ["CCS-2", "Type-2"] }
    ]
  },
  {
    id: "jaguar",
    name: "Jaguar",
    models: [
      { id: "i-pace", name: "I-PACE", type: "suv", batteryCapacityKwh: 90, rangeKm: 470, connectorTypes: ["CCS-2", "Type-2"] }
    ]
  },
  {
    id: "ather",
    name: "Ather Energy",
    models: [
      { id: "450x", name: "450X", type: "motorcycle", batteryCapacityKwh: 3.7, rangeKm: 150, connectorTypes: ["Bharat AC"] }
    ]
  },
  {
    id: "ola",
    name: "Ola Electric",
    models: [
      { id: "s1-pro", name: "S1 Pro", type: "motorcycle", batteryCapacityKwh: 3.97, rangeKm: 181, connectorTypes: ["Bharat AC"] }
    ]
  }
];

// Popular Indian EV models with their specifications for easy reference
export const popularEvModels: Vehicle[] = [
  { make: "Tata", model: "Nexon EV", type: "suv", batteryCapacityKwh: 30.2, rangeKm: 312, connectorTypes: ["CCS-2", "Type-2"] },
  { make: "Tata", model: "Tigor EV", type: "sedan", batteryCapacityKwh: 26, rangeKm: 306, connectorTypes: ["CCS-2", "Type-2"] },
  { make: "Tata", model: "Nexon EV Max", type: "suv", batteryCapacityKwh: 40.5, rangeKm: 437, connectorTypes: ["CCS-2", "Type-2"] },
  { make: "MG", model: "ZS EV", type: "suv", batteryCapacityKwh: 50.3, rangeKm: 461, connectorTypes: ["CCS-2", "Type-2"] },
  { make: "MG", model: "Comet EV", type: "hatchback", batteryCapacityKwh: 17.3, rangeKm: 230, connectorTypes: ["Type-2"] },
  { make: "Hyundai", model: "Kona Electric", type: "suv", batteryCapacityKwh: 39.2, rangeKm: 452, connectorTypes: ["CCS-2", "Type-2"] },
  { make: "Mahindra", model: "XUV400", type: "suv", batteryCapacityKwh: 39.4, rangeKm: 456, connectorTypes: ["CCS-2", "Type-2"] },
  { make: "BYD", model: "e6", type: "suv", batteryCapacityKwh: 71.7, rangeKm: 415, connectorTypes: ["CCS-2", "Type-2"] },
  { make: "BYD", model: "Atto 3", type: "suv", batteryCapacityKwh: 60.48, rangeKm: 521, connectorTypes: ["CCS-2", "Type-2"] },
  { make: "Kia", model: "EV6", type: "suv", batteryCapacityKwh: 77.4, rangeKm: 708, connectorTypes: ["CCS-2", "Type-2"] },
  { make: "Mercedes-Benz", model: "EQC", type: "suv", batteryCapacityKwh: 80, rangeKm: 471, connectorTypes: ["CCS-2", "Type-2"] },
  { make: "Audi", model: "e-tron", type: "suv", batteryCapacityKwh: 95, rangeKm: 400, connectorTypes: ["CCS-2", "Type-2"] },
  { make: "BMW", model: "i4", type: "sedan", batteryCapacityKwh: 83.9, rangeKm: 590, connectorTypes: ["CCS-2", "Type-2"] },
  { make: "BMW", model: "iX", type: "suv", batteryCapacityKwh: 76.6, rangeKm: 425, connectorTypes: ["CCS-2", "Type-2"] },
  { make: "Volvo", model: "XC40 Recharge", type: "suv", batteryCapacityKwh: 78, rangeKm: 418, connectorTypes: ["CCS-2", "Type-2"] },
  { make: "Jaguar", model: "I-PACE", type: "suv", batteryCapacityKwh: 90, rangeKm: 470, connectorTypes: ["CCS-2", "Type-2"] },
  { make: "Ather", model: "450X", type: "motorcycle", batteryCapacityKwh: 3.7, rangeKm: 150, connectorTypes: ["Bharat AC"] },
  { make: "Ola Electric", model: "S1 Pro", type: "motorcycle", batteryCapacityKwh: 3.97, rangeKm: 181, connectorTypes: ["Bharat AC"] },
  { make: "TVS", model: "iQube", type: "motorcycle", batteryCapacityKwh: 4.4, rangeKm: 140, connectorTypes: ["Bharat AC"] },
  { make: "Bajaj", model: "Chetak", type: "motorcycle", batteryCapacityKwh: 3, rangeKm: 95, connectorTypes: ["Bharat AC"] },
  { make: "Hero Electric", model: "Optima", type: "motorcycle", batteryCapacityKwh: 1.5, rangeKm: 80, connectorTypes: ["Bharat AC"] },
];

// Get unique vehicle manufacturers
export function getUniqueManufacturers(): string[] {
  return [...new Set(popularEvModels.map(vehicle => vehicle.make))].sort();
}

// Get models for a specific manufacturer
export function getModelsByManufacturer(manufacturer: string): string[] {
  return popularEvModels
    .filter(vehicle => vehicle.make === manufacturer)
    .map(vehicle => vehicle.model)
    .sort();
}

// Get vehicle by make and model
export function getVehicleByMakeAndModel(make: string, model: string): Vehicle | undefined {
  return popularEvModels.find(
    vehicle => vehicle.make === make && vehicle.model === model
  );
}

// Convert between energy units
export const energyConversions = {
  kwhToWh: (kwh: number) => kwh * 1000,
  whToKwh: (wh: number) => wh / 1000,
};