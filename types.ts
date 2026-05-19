import { 
  Location,
  ChargingStation,
  LocationType,
  ConnectorType,
  Vehicle,
  VehicleType,
  TravelPlan,
  TravelWaypoint,
  User,
  Review
} from "@shared/schema";

// Extended location with calculated distance
export interface LocationWithDistance extends Location {
  distance?: number;
}

// Combined location and charging station details
export interface ChargingLocationDetails {
  location: Location;
  chargingStation?: ChargingStation;
  reviews?: Review[];
  amenities?: string[];
  photos?: string[];
}

// Map marker with extended properties
export interface MapMarker {
  id: number;
  latitude: number;
  longitude: number;
  type: LocationType;
  name: string;
  isAvailable?: boolean;
  connectorTypes?: ConnectorType[];
  imageUrl?: string;
  distance?: number;
}

// Enhanced filter options
export interface FilterOptions {
  types: LocationType[];
  connectorTypes?: ConnectorType[];
  amenities?: string[];
  isOpen?: boolean;
  minRating?: number;
  maxDistance?: number;
}

// Sheet states
export type SheetState = 'collapsed' | 'half' | 'full';

// User position
export interface UserPosition {
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp?: number;
}

// Search result with additional fields
export interface SearchResult {
  id?: number;
  name: string;
  address?: string;
  city?: string;
  type?: 'location' | 'city' | 'vehicle' | 'user';
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
  distance?: number;
  rating?: number;
}

// Travel planning options
export interface TravelPlanOptions {
  startAddress: string;
  endAddress: string;
  startLatitude: number;
  startLongitude: number;
  endLatitude: number;
  endLongitude: number;
  vehicleId?: number;
  departureTime?: string;
  includeRestStops?: boolean;
  includeFood?: boolean;
}

// TravelPlan with waypoints and vehicle details
export interface TravelPlanDetails extends TravelPlan {
  waypoints: TravelWaypoint[];
  vehicle: Vehicle;
  user: User;
}

// Vehicle registration form data
export interface VehicleRegistrationData {
  make: string;
  model: string;
  year: number;
  type: VehicleType;
  batteryCapacityKwh: number;
  rangeKm: number;
  registrationNumber?: string;
  connectorTypes: ConnectorType[];
  photo?: string;
  nickname?: string;
}

// User profile data
export interface UserProfile extends User {
  vehicles: Vehicle[];
  travelPlans: TravelPlan[];
  favoriteLocations: Location[];
}

// Google Maps integration types
export interface GoogleMapsConfig {
  apiKey: string;
  language: string;
  region: string;
}

// App settings
export interface AppSettings {
  language: string;
  distanceUnit: 'km' | 'mi';
  theme: 'light' | 'dark' | 'system';
  notificationsEnabled: boolean;
  trackHistory: boolean;
  defaultFilterSettings: FilterOptions;
  mapZoomLevel: number;
}

// Notification type
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  timestamp: string;
  action?: {
    label: string;
    url: string;
  };
}
