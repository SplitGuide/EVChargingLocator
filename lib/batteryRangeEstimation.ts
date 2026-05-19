/**
 * Battery Range Estimation Utility
 * 
 * This module provides functions to estimate the real-world battery range of EVs
 * based on multiple factors including vehicle model, driving conditions, weather,
 * and terrain.
 */

// Reference data for typical efficiency loss percentages
// Based on research data from EV testing under different conditions
const EFFICIENCY_FACTORS = {
  // Weather conditions
  weather: {
    sunny: 0,            // Baseline - no impact
    cloudy: -2,          // Minimal impact
    rain: -5,            // Moderate impact due to wiper usage and reduced aerodynamics
    snow: -15,           // Significant impact due to heater usage and road resistance
    extremeHeat: -10,    // AC usage drains battery
    extremeCold: -30,    // Most significant impact due to heating and battery chemistry
  },
  
  // Speed-related efficiency loss
  speed: {
    city: 0,             // Baseline - city driving with regenerative braking can be efficient
    highway: -15,        // Highway speeds increase aerodynamic drag
    mixed: -8,           // Mix of city and highway
  },
  
  // Terrain impact on efficiency
  terrain: {
    flat: 0,             // Baseline - no impact
    rolling: -8,         // Some hills, some regeneration on downhills
    mountainous: -25,    // Significant uphills with partial regeneration on downhills
  },
  
  // Driving style impact
  drivingStyle: {
    eco: 5,              // Efficiency boost with eco-driving techniques
    normal: 0,           // Baseline
    aggressive: -15,     // Hard acceleration, higher speeds
  },

  // Passenger and cargo load
  load: {
    light: 0,            // Driver only or minimal load
    medium: -3,          // Multiple passengers
    heavy: -8,           // Full vehicle with luggage
  },
  
  // HVAC system usage
  hvac: {
    off: 0,              // No climate control
    low: -5,             // Minimal climate control
    medium: -10,         // Moderate climate control
    high: -20,           // Maximum heating/cooling
  },

  // Tire pressure and condition
  tires: {
    optimal: 0,          // Properly inflated
    underinflated: -5,   // Below recommended pressure
  },

  // Vehicle age (battery degradation)
  batteryAge: {
    new: 0,              // New battery
    moderate: -5,        // 1-3 years old
    aged: -15,           // 3+ years old with some degradation
  }
};

// Interface for range estimation parameters
export interface RangeEstimationParams {
  vehicleMake: string;
  vehicleModel: string;
  batteryCapacityKwh: number;
  ratedRangeKm: number;
  batteryAgeYears?: number;
  weatherCondition?: keyof typeof EFFICIENCY_FACTORS.weather;
  drivingType?: keyof typeof EFFICIENCY_FACTORS.speed;
  terrainType?: keyof typeof EFFICIENCY_FACTORS.terrain;
  drivingStyle?: keyof typeof EFFICIENCY_FACTORS.drivingStyle;
  loadCondition?: keyof typeof EFFICIENCY_FACTORS.load;
  hvacUsage?: keyof typeof EFFICIENCY_FACTORS.hvac;
  tireCondition?: keyof typeof EFFICIENCY_FACTORS.tires;
  tripDistanceKm?: number;
  startingChargePercent?: number; // 0-100
}

// Interface for estimation results
export interface RangeEstimationResult {
  estimatedRangeKm: number;
  estimatedEfficiencyPercent: number;
  factorsBreakdown: {
    [key: string]: number;
  };
  isRangeSufficient: boolean;
  requiredChargingStops: number;
  chargingTimeEstimateMinutes: number;
  batteryRemaining?: number; // percentage remaining at destination
}

// Vehicle-specific efficiency corrections
// Based on real-world efficiency data comparing EPA/WLTP rated range to actual performance
const VEHICLE_EFFICIENCY_CORRECTION: Record<string, Record<string, number>> = {
  "Tata": {
    "Nexon EV": -8,      // Tends to be 8% less efficient than rated
    "Tigor EV": -10,
    "Nexon EV Max": -5,
  },
  "Mahindra": {
    "XUV400": -7,
  },
  "MG": {
    "ZS EV": -5,
    "Comet EV": -3,
  },
  "Hyundai": {
    "Kona Electric": -4,
    "Ioniq 5": -2,
  },
  "Kia": {
    "EV6": -3,
  },
  "BYD": {
    "e6": -2,
    "Atto 3": -1,
  },
  "Ather": {
    "450X": -15,         // Two-wheelers tend to have larger variances
  },
  "Ola Electric": {
    "S1 Pro": -18,
  },
  "TVS": {
    "iQube": -12,
  },
  "Bajaj": {
    "Chetak": -10,
  },
  "Mercedes-Benz": {
    "EQC": -7,
  },
  "Audi": {
    "e-tron": -8,
  },
  "BMW": {
    "i4": -5,
    "iX": -6,
  },
  "Jaguar": {
    "I-PACE": -10,
  },
  "Volvo": {
    "XC40 Recharge": -7,
  },
};

// EV charging profiles: time to charge from 10% to 80% in minutes at different charger types
// Based on typical charging curves for different vehicle models
const CHARGING_PROFILES: Record<string, Record<string, Record<string, number>>> = {
  "Tata": {
    "Nexon EV": {
      "Fast DC": 60,     // Minutes to charge from 10% to 80% on DC fast charger
      "AC": 240          // Minutes to charge from 10% to 80% on AC charger
    },
    "Tigor EV": {
      "Fast DC": 65,
      "AC": 245
    }
  },
  "Mahindra": {
    "XUV400": {
      "Fast DC": 50,
      "AC": 230
    }
  },
  "MG": {
    "ZS EV": {
      "Fast DC": 40,
      "AC": 220
    }
  },
  "Hyundai": {
    "Kona Electric": {
      "Fast DC": 55,
      "AC": 210
    }
  },
  // Default values for vehicles not specifically listed
  "Default": {
    "Default": {
      "Fast DC": 60,
      "AC": 240
    }
  }
};

/**
 * Estimates the real-world range of an EV based on various factors
 * @param params The estimation parameters
 * @returns Range estimation result with detailed breakdown
 */
export function estimateRealWorldRange(params: RangeEstimationParams): RangeEstimationResult {
  // Set default values for optional parameters
  const weatherCondition = params.weatherCondition || 'sunny';
  const drivingType = params.drivingType || 'mixed';
  const terrainType = params.terrainType || 'flat';
  const drivingStyle = params.drivingStyle || 'normal';
  const loadCondition = params.loadCondition || 'light';
  const hvacUsage = params.hvacUsage || 'low';
  const tireCondition = params.tireCondition || 'optimal';
  const batteryAgeYears = params.batteryAgeYears || 0;
  const tripDistanceKm = params.tripDistanceKm || 0;
  const startingChargePercent = params.startingChargePercent || 100;
  
  // Calculate battery age impact
  let batteryAgeImpact = 0;
  if (batteryAgeYears < 1) {
    batteryAgeImpact = EFFICIENCY_FACTORS.batteryAge.new;
  } else if (batteryAgeYears < 3) {
    batteryAgeImpact = EFFICIENCY_FACTORS.batteryAge.moderate;
  } else {
    batteryAgeImpact = EFFICIENCY_FACTORS.batteryAge.aged;
  }
  
  // Get vehicle-specific correction if available
  let vehicleCorrection = 0;
  if (
    VEHICLE_EFFICIENCY_CORRECTION[params.vehicleMake] && 
    VEHICLE_EFFICIENCY_CORRECTION[params.vehicleMake][params.vehicleModel]
  ) {
    vehicleCorrection = VEHICLE_EFFICIENCY_CORRECTION[params.vehicleMake][params.vehicleModel];
  }
  
  // Calculate total efficiency impact
  const factorsBreakdown = {
    "Weather": EFFICIENCY_FACTORS.weather[weatherCondition],
    "Driving Conditions": EFFICIENCY_FACTORS.speed[drivingType],
    "Terrain": EFFICIENCY_FACTORS.terrain[terrainType],
    "Driving Style": EFFICIENCY_FACTORS.drivingStyle[drivingStyle],
    "Load": EFFICIENCY_FACTORS.load[loadCondition],
    "Climate Control": EFFICIENCY_FACTORS.hvac[hvacUsage],
    "Tire Condition": EFFICIENCY_FACTORS.tires[tireCondition],
    "Battery Age": batteryAgeImpact,
    "Vehicle Model Specific": vehicleCorrection
  };
  
  // Calculate total efficiency percentage
  const totalEfficiencyImpact = Object.values(factorsBreakdown).reduce((sum, factor) => sum + factor, 0);
  const efficiencyPercent = 100 + totalEfficiencyImpact;
  
  // Calculate estimated range
  const baseRange = params.ratedRangeKm;
  const estimatedFullRangeKm = Math.round((baseRange * efficiencyPercent) / 100);
  
  // Calculate actual available range based on battery charge
  const estimatedRangeKm = Math.round((estimatedFullRangeKm * startingChargePercent) / 100);
  
  // Determine if the range is sufficient for the trip
  const isRangeSufficient = tripDistanceKm <= estimatedRangeKm;
  
  // Calculate battery remaining at destination (if applicable)
  let batteryRemaining = null;
  if (tripDistanceKm > 0) {
    batteryRemaining = Math.max(0, Math.round(startingChargePercent - (tripDistanceKm / estimatedFullRangeKm * 100)));
  }
  
  // Calculate required charging stops
  const rangePerFullCharge = estimatedFullRangeKm;
  const requiredChargingStops = tripDistanceKm > 0 
    ? Math.max(0, Math.ceil((tripDistanceKm - estimatedRangeKm) / (rangePerFullCharge * 0.7))) // Assuming charging to 80% and starting at 10%
    : 0;
  
  // Calculate charging time estimate (minutes)
  let chargingTimeEstimateMinutes = 0;
  if (requiredChargingStops > 0) {
    // Use vehicle-specific charging profile if available, otherwise use default
    let chargingProfile = CHARGING_PROFILES.Default.Default;
    if (
      CHARGING_PROFILES[params.vehicleMake] && 
      CHARGING_PROFILES[params.vehicleMake][params.vehicleModel]
    ) {
      chargingProfile = CHARGING_PROFILES[params.vehicleMake][params.vehicleModel];
    } else if (CHARGING_PROFILES[params.vehicleMake] && CHARGING_PROFILES[params.vehicleMake].Default) {
      chargingProfile = CHARGING_PROFILES[params.vehicleMake].Default;
    }
    
    // Assume fast DC charging for trips
    chargingTimeEstimateMinutes = requiredChargingStops * chargingProfile["Fast DC"];
  }
  
  return {
    estimatedRangeKm,
    estimatedEfficiencyPercent: efficiencyPercent,
    factorsBreakdown,
    isRangeSufficient,
    requiredChargingStops,
    chargingTimeEstimateMinutes,
    batteryRemaining: batteryRemaining !== null ? batteryRemaining : undefined
  };
}

/**
 * Calculates energy consumption per km for a specific vehicle
 * @param batteryCapacityKwh Battery capacity in kWh
 * @param rangeKm Range in kilometers
 * @returns Energy consumption in kWh/km
 */
export function calculateEnergyConsumptionPerKm(batteryCapacityKwh: number, rangeKm: number): number {
  return batteryCapacityKwh / rangeKm;
}

/**
 * Calculates expected range at the current battery level
 * @param fullRangeKm Full range in kilometers
 * @param currentBatteryPercent Current battery percentage (0-100)
 * @returns Current range in kilometers
 */
export function calculateCurrentRange(fullRangeKm: number, currentBatteryPercent: number): number {
  return Math.round((fullRangeKm * currentBatteryPercent) / 100);
}

/**
 * Predicts battery percentage remaining after traveling a certain distance
 * @param fullRangeKm Full range in kilometers
 * @param distanceTraveledKm Distance traveled in kilometers
 * @param startingBatteryPercent Starting battery percentage (0-100)
 * @returns Remaining battery percentage
 */
export function predictBatteryRemaining(
  fullRangeKm: number, 
  distanceTraveledKm: number, 
  startingBatteryPercent: number
): number {
  const percentUsed = (distanceTraveledKm / fullRangeKm) * 100;
  return Math.max(0, Math.round(startingBatteryPercent - percentUsed));
}

/**
 * Estimates the charging time required
 * @param vehicleMake The make of the vehicle
 * @param vehicleModel The model of the vehicle
 * @param chargerType The type of charger ('Fast DC' or 'AC')
 * @param startPercent Starting battery percentage
 * @param targetPercent Target battery percentage
 * @returns Estimated charging time in minutes
 */
export function estimateChargingTime(
  vehicleMake: string,
  vehicleModel: string,
  chargerType: 'Fast DC' | 'AC',
  startPercent: number,
  targetPercent: number
): number {
  // Normalize percentages to the 10-80% range used in our profiles
  const normalizedStartPercent = Math.max(10, startPercent);
  const normalizedTargetPercent = Math.min(80, targetPercent);
  
  if (normalizedTargetPercent <= normalizedStartPercent) {
    return 0; // No charging needed
  }
  
  // Get the charging profile
  let chargingProfile = CHARGING_PROFILES.Default.Default;
  if (
    CHARGING_PROFILES[vehicleMake] && 
    CHARGING_PROFILES[vehicleMake][vehicleModel]
  ) {
    chargingProfile = CHARGING_PROFILES[vehicleMake][vehicleModel];
  } else if (CHARGING_PROFILES[vehicleMake] && CHARGING_PROFILES[vehicleMake].Default) {
    chargingProfile = CHARGING_PROFILES[vehicleMake].Default;
  }
  
  // Calculate the proportion of the reference charge (10-80%)
  const referenceCharge = 70; // 80% - 10%
  const requiredCharge = normalizedTargetPercent - normalizedStartPercent;
  const proportion = requiredCharge / referenceCharge;
  
  // Estimate time based on proportion of reference charge time
  // Charging is not linear, but this is a reasonable approximation
  return Math.round(chargingProfile[chargerType] * proportion);
}