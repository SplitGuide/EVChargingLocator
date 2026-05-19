import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  estimateRealWorldRange,
  RangeEstimationParams,
  RangeEstimationResult
} from '@/lib/batteryRangeEstimation';
import { Battery, Thermometer, Mountain, Gauge, Users, Fan, RotateCcw, AlertCircle } from 'lucide-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Progress } from '@/components/ui/progress';

interface Vehicle {
  id?: number;
  make: string;
  model: string;
  batteryCapacityKwh: number;
  rangeKm: number;
  year?: number;
  type?: string;
  connectorTypes?: string[];
}

interface BatteryRangeEstimatorProps {
  selectedVehicle?: Vehicle;
  tripDistanceKm?: number;
  onRangeEstimated?: (result: RangeEstimationResult) => void;
  compact?: boolean;
}

export function BatteryRangeEstimator({
  selectedVehicle,
  tripDistanceKm = 0,
  onRangeEstimated,
  compact = false
}: BatteryRangeEstimatorProps) {
  // Estimation parameters
  const [params, setParams] = useState<RangeEstimationParams>({
    vehicleMake: selectedVehicle?.make || '',
    vehicleModel: selectedVehicle?.model || '',
    batteryCapacityKwh: selectedVehicle?.batteryCapacityKwh || 0,
    ratedRangeKm: selectedVehicle?.rangeKm || 0,
    batteryAgeYears: selectedVehicle?.year ? new Date().getFullYear() - selectedVehicle.year : 0,
    weatherCondition: 'sunny',
    drivingType: 'mixed',
    terrainType: 'flat',
    drivingStyle: 'normal',
    loadCondition: 'light',
    hvacUsage: 'low',
    tireCondition: 'optimal',
    tripDistanceKm: tripDistanceKm,
    startingChargePercent: 100
  });

  // Estimation result
  const [estimationResult, setEstimationResult] = useState<RangeEstimationResult | null>(null);

  // Update parameters when vehicle or trip distance changes
  useEffect(() => {
    if (selectedVehicle) {
      setParams(prev => ({
        ...prev,
        vehicleMake: selectedVehicle.make,
        vehicleModel: selectedVehicle.model,
        batteryCapacityKwh: selectedVehicle.batteryCapacityKwh,
        ratedRangeKm: selectedVehicle.rangeKm,
        batteryAgeYears: selectedVehicle.year ? new Date().getFullYear() - selectedVehicle.year : 0,
      }));
    }
  }, [selectedVehicle]);

  useEffect(() => {
    setParams(prev => ({
      ...prev,
      tripDistanceKm
    }));
  }, [tripDistanceKm]);

  // Update estimation when parameters change
  useEffect(() => {
    if (params.vehicleMake && params.vehicleModel && (params.batteryCapacityKwh || 0) > 0 && (params.ratedRangeKm || 0) > 0) {
      const result = estimateRealWorldRange(params);
      setEstimationResult(result);
      
      if (onRangeEstimated) {
        onRangeEstimated(result);
      }
    }
  }, [params, onRangeEstimated]);

  // Handle parameter changes
  const handleParamChange = (key: keyof RangeEstimationParams, value: any) => {
    setParams(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Format battery percentage for display
  const formatBatteryPercentage = (percent: number) => {
    return `${percent}%`;
  };

  // Determine range status color
  const getRangeStatusColor = (result: RangeEstimationResult | null) => {
    if (!result) return 'bg-gray-200';
    
    if (result.isRangeSufficient) {
      return 'bg-green-500';
    } else if (result.requiredChargingStops === 1) {
      return 'bg-amber-500';
    } else {
      return 'bg-red-500';
    }
  };

  // Get human-readable status message
  const getRangeStatusMessage = (result: RangeEstimationResult | null) => {
    if (!result) return 'No estimation available';
    
    if (result.isRangeSufficient) {
      return 'Range is sufficient for this trip';
    } else if (result.requiredChargingStops === 1) {
      return `Need 1 charging stop (approx. ${Math.round(result.chargingTimeEstimateMinutes)} mins)`;
    } else {
      return `Need ${result.requiredChargingStops} charging stops (approx. ${Math.round(result.chargingTimeEstimateMinutes)} mins)`;
    }
  };

  if (compact) {
    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Battery className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Range Estimate</span>
          </div>
          {estimationResult && (
            <span className="text-sm font-bold">{estimationResult.estimatedRangeKm} km</span>
          )}
        </div>
        
        {estimationResult && (
          <>
            <Progress 
              value={((estimationResult.estimatedRangeKm || 0) / (params.ratedRangeKm || 1)) * 100} 
              className="h-2 mb-1"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatBatteryPercentage(params.startingChargePercent || 0)}</span>
              <span className="text-xs">{Math.round(estimationResult.estimatedEfficiencyPercent || 0)}% efficiency</span>
            </div>
            
            {tripDistanceKm > 0 && (
              <div className="mt-2 text-sm flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${getRangeStatusColor(estimationResult)}`}></div>
                <span>{getRangeStatusMessage(estimationResult)}</span>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <Card className="mt-4">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium mb-4">Battery Range Estimator</h3>
          
          {/* Starting Battery Level */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1">
                <Battery className="h-4 w-4" />
                Starting Battery
              </Label>
              <span className="text-sm font-medium">{formatBatteryPercentage(params.startingChargePercent || 0)}</span>
            </div>
            <Slider
              value={[params.startingChargePercent || 100]}
              min={10}
              max={100}
              step={1}
              onValueChange={(values) => handleParamChange('startingChargePercent', values[0])}
            />
          </div>
          
          {/* Weather Conditions */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Thermometer className="h-4 w-4" />
              Weather Conditions
            </Label>
            <Select
              value={params.weatherCondition}
              onValueChange={(value) => handleParamChange('weatherCondition', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select weather" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sunny">Sunny (20-25°C)</SelectItem>
                <SelectItem value="cloudy">Cloudy (15-20°C)</SelectItem>
                <SelectItem value="rain">Rain</SelectItem>
                <SelectItem value="snow">Snow</SelectItem>
                <SelectItem value="extremeHeat">Extreme Heat (above 35°C)</SelectItem>
                <SelectItem value="extremeCold">Extreme Cold (below 5°C)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Terrain Type */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Mountain className="h-4 w-4" />
              Terrain Type
            </Label>
            <Select
              value={params.terrainType}
              onValueChange={(value) => handleParamChange('terrainType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select terrain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flat">Flat</SelectItem>
                <SelectItem value="rolling">Rolling Hills</SelectItem>
                <SelectItem value="mountainous">Mountainous</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Driving Type */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Gauge className="h-4 w-4" />
              Driving Type
            </Label>
            <Select
              value={params.drivingType}
              onValueChange={(value) => handleParamChange('drivingType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select driving type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="city">City Driving</SelectItem>
                <SelectItem value="highway">Highway</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Load Condition */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Passenger & Cargo Load
            </Label>
            <Select
              value={params.loadCondition}
              onValueChange={(value) => handleParamChange('loadCondition', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select load" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light (Driver only)</SelectItem>
                <SelectItem value="medium">Medium (2-3 passengers)</SelectItem>
                <SelectItem value="heavy">Heavy (Full vehicle with luggage)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* HVAC Usage */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Fan className="h-4 w-4" />
              Climate Control Usage
            </Label>
            <Select
              value={params.hvacUsage}
              onValueChange={(value) => handleParamChange('hvacUsage', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select HVAC usage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Off</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Driving Style */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <RotateCcw className="h-4 w-4" />
              Driving Style
            </Label>
            <Select
              value={params.drivingStyle}
              onValueChange={(value) => handleParamChange('drivingStyle', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select driving style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eco">Eco (Gentle acceleration)</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="aggressive">Aggressive (Fast acceleration)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Results Section */}
          {estimationResult && (
            <div className="mt-6 p-4 bg-muted rounded-md space-y-3">
              <h3 className="text-lg font-medium">Estimated Range</h3>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Factory Rated Range:</span>
                <span className="font-bold">{params.ratedRangeKm || 0} km</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Real-World Estimated Range:</span>
                <span className="font-bold">{estimationResult.estimatedRangeKm || 0} km</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Efficiency Factor:</span>
                <span className="font-bold">{Math.round(estimationResult.estimatedEfficiencyPercent || 0)}%</span>
              </div>
              
              {tripDistanceKm > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Trip Distance:</span>
                    <span className="font-bold">{tripDistanceKm} km</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Battery Remaining at Destination:</span>
                    <span className="font-bold">
                      {estimationResult.batteryRemaining !== undefined 
                        ? `${estimationResult.batteryRemaining}%` 
                        : 'Not calculated'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Required Charging Stops:</span>
                    <span className="font-bold">{estimationResult.requiredChargingStops || 0}</span>
                  </div>
                  
                  {(estimationResult.requiredChargingStops || 0) > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Estimated Charging Time:</span>
                      <span className="font-bold">{Math.round(estimationResult.chargingTimeEstimateMinutes || 0)} minutes</span>
                    </div>
                  )}
                  
                  <div className="mt-2 flex items-center gap-2">
                    <AlertCircle className={`h-5 w-5 ${estimationResult.isRangeSufficient ? 'text-green-500' : 'text-red-500'}`} />
                    <span className={`font-medium ${estimationResult.isRangeSufficient ? 'text-green-500' : 'text-red-500'}`}>
                      {getRangeStatusMessage(estimationResult)}
                    </span>
                  </div>
                </>
              )}
              
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Range Impact Factors:</h4>
                <div className="space-y-2">
                  {Object.entries(estimationResult.factorsBreakdown).map(([factor, value]) => (
                    <div key={factor} className="grid grid-cols-2 text-sm">
                      <span>{factor}:</span>
                      <span className={value < 0 ? 'text-red-500' : value > 0 ? 'text-green-500' : 'text-gray-500'}>
                        {value > 0 ? `+${value}%` : `${value}%`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end">
            <HoverCard>
              <HoverCardTrigger asChild>
                <Button variant="link" size="sm" className="px-0">
                  How is this calculated?
                </Button>
              </HoverCardTrigger>
              <HoverCardContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-medium">Battery Range Estimation</h4>
                  <p className="text-sm text-muted-foreground">
                    This estimation uses real-world efficiency data for Indian EV models, adjusted for:
                  </p>
                  <ul className="text-xs space-y-1 list-disc pl-4 text-muted-foreground">
                    <li>Weather conditions (temperature affects battery chemistry)</li>
                    <li>Driving patterns (city vs highway)</li>
                    <li>Terrain (flat roads vs hills)</li>
                    <li>Climate control usage (AC/heater)</li>
                    <li>Vehicle load (passengers and cargo)</li>
                    <li>Battery age (degradation over time)</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2">
                    The calculation combines known efficiency patterns of each vehicle model with these factors to provide a realistic range estimate.
                  </p>
                </div>
              </HoverCardContent>
            </HoverCard>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}