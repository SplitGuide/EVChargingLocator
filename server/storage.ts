import { 
  Location, InsertLocation, 
  ChargingStation, InsertChargingStation,
  LocationFilter, LocationType, ConnectorType,
  Vehicle, InsertVehicle, VehicleType,
  TravelPlan, InsertTravelPlan,
  TravelWaypoint, InsertTravelWaypoint,
  User, InsertUser,
  Review, InsertReview,
  locations, chargingStations,
  locationTypes
} from "@shared/schema";

// Custom types for additional features
interface ChargingBooking {
  id: number;
  userId: number;
  stationId: number;
  vehicleId: number;
  startTime: Date;
  endTime: Date;
  connectorType: ConnectorType;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod?: string;
  totalAmount?: number;
  created: Date;
}

interface HomeCharger {
  id: number;
  userId: number;
  name: string;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  connectorTypes: ConnectorType[];
  powerKw: number;
  pricePerKwh: number;
  availableHours: string;
  isPublic: boolean;
  description?: string;
  photos?: string[];
}

interface EmergencyContact {
  id: number;
  userId: number;
  name: string;
  phone: string;
  email?: string;
  relationship: string;
}

interface SosRequest {
  id: number;
  userId: number;
  latitude: number;
  longitude: number;
  requestType: 'battery' | 'mechanical' | 'accident' | 'other';
  description: string;
  status: 'pending' | 'assigned' | 'resolved';
  responderName?: string;
  responderPhone?: string;
  created: Date;
  resolvedAt?: Date;
}

interface ChatMessage {
  id: number;
  userId: number;
  message: string;
  response: string;
  timestamp: Date;
}

interface VehicleData {
  id: number;
  vehicleId: number;
  batteryPercentage: number;
  estimatedRangeKm: number;
  lastUpdated: Date;
  status: 'parked' | 'charging' | 'driving';
  currentLatitude?: number;
  currentLongitude?: number;
  chargingSpeed?: number; // In kW if charging
  timeToFullCharge?: number; // In minutes if charging
}

interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  created: Date;
  relatedEntityType?: 'charging_station' | 'booking' | 'vehicle' | 'travel_plan';
  relatedEntityId?: number;
}

// Enhanced interface for storage operations
// Photo related interfaces
interface LocationPhoto {
  id: number;
  locationId: number;
  url: string;
  source: string;
  created?: Date;
}

interface InsertLocationPhoto {
  locationId: number;
  url: string;
  source: string;
}

export interface IStorage {
  // Location CRUD operations
  getLocations(): Promise<Location[]>;
  getLocation(id: number): Promise<Location | undefined>;
  getLocationsByFilter(filter: LocationFilter): Promise<Location[]>;
  getLocationByGooglePlaceId(placeId: string): Promise<Location | undefined>;
  getNearbyLocations(
    lat: number, 
    lng: number, 
    radius: number, 
    types?: LocationType[],
    connectorTypes?: ConnectorType[]
  ): Promise<Location[]>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: number, location: Partial<InsertLocation>): Promise<Location | undefined>;
  deleteLocation(id: number): Promise<boolean>;
  
  // Location photo operations
  addLocationPhoto(photo: InsertLocationPhoto): Promise<LocationPhoto>;

  // Charging station operations
  getChargingStations(availableOnly?: boolean, connectorTypes?: ConnectorType[]): Promise<ChargingStation[]>;
  getChargingStation(id: number): Promise<ChargingStation | undefined>;
  getChargingStationsByLocationId(locationId: number): Promise<ChargingStation[]>;
  createChargingStation(station: InsertChargingStation): Promise<ChargingStation>;
  updateChargingStation(id: number, station: Partial<InsertChargingStation>): Promise<ChargingStation | undefined>;
  deleteChargingStation(id: number): Promise<boolean>;

  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: Omit<InsertUser, 'passwordHash'> & { passwordHash: string }): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  verifyUserEmail(email: string): Promise<boolean>;
  deleteUser(id: number): Promise<boolean>;

  // Vehicle operations
  getVehicle(id: number): Promise<Vehicle | undefined>;
  getVehiclesByUserId(userId: number): Promise<Vehicle[]>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: number, vehicle: Partial<InsertVehicle>): Promise<Vehicle | undefined>;
  deleteVehicle(id: number): Promise<boolean>;

  // Travel plan operations
  getTravelPlan(id: number): Promise<TravelPlan | undefined>;
  getTravelPlansByUserId(userId: number): Promise<TravelPlan[]>;
  createTravelPlan(plan: InsertTravelPlan): Promise<TravelPlan>;
  updateTravelPlan(id: number, plan: Partial<InsertTravelPlan>): Promise<TravelPlan | undefined>;
  deleteTravelPlan(id: number): Promise<boolean>;

  // Travel waypoint operations
  getTravelWaypoint(id: number): Promise<TravelWaypoint | undefined>;
  getTravelWaypointsByPlanId(planId: number): Promise<TravelWaypoint[]>;
  createTravelWaypoint(waypoint: InsertTravelWaypoint): Promise<TravelWaypoint>;
  updateTravelWaypoint(id: number, waypoint: Partial<InsertTravelWaypoint>): Promise<TravelWaypoint | undefined>;
  deleteTravelWaypoint(id: number): Promise<boolean>;

  // Review operations
  getReview(id: number): Promise<Review | undefined>;
  getReviewsByLocationId(locationId: number): Promise<Review[]>;
  getReviewsByUserId(userId: number): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  updateReview(id: number, review: Partial<InsertReview>): Promise<Review | undefined>;
  deleteReview(id: number): Promise<boolean>;

  // Charging booking operations
  getChargingBooking(id: number): Promise<ChargingBooking | undefined>;
  getChargingBookingsByUserId(userId: number): Promise<ChargingBooking[]>;
  getChargingBookingsByStationId(stationId: number): Promise<ChargingBooking[]>;
  createChargingBooking(booking: Omit<ChargingBooking, 'id' | 'created'>): Promise<ChargingBooking>;
  updateChargingBooking(id: number, booking: Partial<ChargingBooking>): Promise<ChargingBooking | undefined>;
  deleteChargingBooking(id: number): Promise<boolean>;

  // Home charger sharing operations
  getHomeCharger(id: number): Promise<HomeCharger | undefined>;
  getHomeChargersByUserId(userId: number): Promise<HomeCharger[]>;
  getNearbyHomeChargers(lat: number, lng: number, radius: number): Promise<HomeCharger[]>;
  createHomeCharger(charger: Omit<HomeCharger, 'id'>): Promise<HomeCharger>;
  updateHomeCharger(id: number, charger: Partial<HomeCharger>): Promise<HomeCharger | undefined>;
  deleteHomeCharger(id: number): Promise<boolean>;

  // SOS emergency operations
  getSosRequest(id: number): Promise<SosRequest | undefined>;
  getSosRequestsByUserId(userId: number): Promise<SosRequest[]>;
  createSosRequest(request: Omit<SosRequest, 'id' | 'created' | 'status'> & { status?: SosRequest['status'] }): Promise<SosRequest>;
  updateSosRequest(id: number, request: Partial<SosRequest>): Promise<SosRequest | undefined>;
  deleteSosRequest(id: number): Promise<boolean>;

  // Emergency contact operations
  getEmergencyContact(id: number): Promise<EmergencyContact | undefined>;
  getEmergencyContactsByUserId(userId: number): Promise<EmergencyContact[]>;
  createEmergencyContact(contact: Omit<EmergencyContact, 'id'>): Promise<EmergencyContact>;
  updateEmergencyContact(id: number, contact: Partial<EmergencyContact>): Promise<EmergencyContact | undefined>;
  deleteEmergencyContact(id: number): Promise<boolean>;

  // Chat history operations
  getChatMessagesByUserId(userId: number): Promise<ChatMessage[]>;
  createChatMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage>;

  // Vehicle data operations
  getVehicleData(vehicleId: number): Promise<VehicleData | undefined>;
  updateVehicleData(vehicleId: number, data: Partial<Omit<VehicleData, 'id' | 'vehicleId'>>): Promise<VehicleData | undefined>;
  getVehicleDataHistory(vehicleId: number, days: number): Promise<VehicleData[]>;

  // Notification operations
  getNotifications(userId: number, unreadOnly?: boolean): Promise<Notification[]>;
  createNotification(notification: Omit<Notification, 'id' | 'created' | 'read'>): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<boolean>;
  markAllNotificationsAsRead(userId: number): Promise<boolean>;
  deleteNotification(id: number): Promise<boolean>;
  
  // Location photos operations
  addLocationPhoto(photo: InsertLocationPhoto): Promise<LocationPhoto>;
  getLocationPhotos(locationId: number): Promise<LocationPhoto[]>;
}

export class MemStorage implements IStorage {
  private locations: Map<number, Location>;
  private chargingStations: Map<number, ChargingStation>;
  private users: Map<number, User>;
  private vehicles: Map<number, Vehicle>;
  private travelPlans: Map<number, TravelPlan>;
  private travelWaypoints: Map<number, TravelWaypoint>;
  private reviews: Map<number, Review>;
  private chargingBookings: Map<number, ChargingBooking>;
  private homeChargers: Map<number, HomeCharger>;
  private sosRequests: Map<number, SosRequest>;
  private emergencyContacts: Map<number, EmergencyContact>;
  private chatMessages: Map<number, ChatMessage>;
  private vehicleData: Map<number, VehicleData>;
  private vehicleDataHistory: Map<number, VehicleData[]>;
  private notifications: Map<number, Notification>;
  private locationPhotos: Map<number, LocationPhoto>;
  
  currentLocationId: number;
  currentChargingStationId: number;
  currentUserId: number;
  currentVehicleId: number;
  currentTravelPlanId: number;
  currentTravelWaypointId: number;
  currentReviewId: number;
  currentChargingBookingId: number;
  currentHomeChargerId: number;
  currentSosRequestId: number;
  currentEmergencyContactId: number;
  currentChatMessageId: number;
  currentVehicleDataId: number;
  currentNotificationId: number;

  currentLocationPhotoId: number;
    
  constructor() {
    this.locations = new Map();
    this.chargingStations = new Map();
    this.users = new Map();
    this.vehicles = new Map();
    this.travelPlans = new Map();
    this.travelWaypoints = new Map();
    this.reviews = new Map();
    this.chargingBookings = new Map();
    this.homeChargers = new Map();
    this.sosRequests = new Map();
    this.emergencyContacts = new Map();
    this.chatMessages = new Map();
    this.vehicleData = new Map();
    this.vehicleDataHistory = new Map();
    this.notifications = new Map();
    this.locationPhotos = new Map();
    
    this.currentLocationId = 1;
    this.currentChargingStationId = 1;
    this.currentUserId = 1;
    this.currentVehicleId = 1;
    this.currentTravelPlanId = 1;
    this.currentTravelWaypointId = 1;
    this.currentReviewId = 1;
    this.currentChargingBookingId = 1;
    this.currentHomeChargerId = 1; 
    this.currentSosRequestId = 1;
    this.currentEmergencyContactId = 1;
    this.currentChatMessageId = 1;
    this.currentVehicleDataId = 1;
    this.currentNotificationId = 1;
    this.currentLocationPhotoId = 1;

    // Add some initial data
    this.seedData();
  }

  // Location CRUD operations
  async getLocations(): Promise<Location[]> {
    return Array.from(this.locations.values());
  }

  async getLocation(id: number): Promise<Location | undefined> {
    return this.locations.get(id);
  }
  
  async getLocationByGooglePlaceId(placeId: string): Promise<Location | undefined> {
    for (const location of this.locations.values()) {
      if (location.googlePlaceId === placeId) {
        return location;
      }
    }
    return undefined;
  }

  async getLocationsByFilter(filter: LocationFilter): Promise<Location[]> {
    let result = Array.from(this.locations.values());

    // Filter by types
    if (filter.types && filter.types.length > 0) {
      result = result.filter(location => 
        filter.types!.includes(location.type as LocationType)
      );
    }

    // Enhanced Filter by city - more forgiving for any city in India
    if (filter.city) {
      const cityLower = filter.city.toLowerCase();
      
      // First try exact matches
      let cityFiltered = result.filter(location => 
        location.city?.toLowerCase() === cityLower ||
        location.state?.toLowerCase() === cityLower
      );
      
      // If no exact matches, try partial matches
      if (cityFiltered.length === 0) {
        cityFiltered = result.filter(location => 
          (location.city && location.city.toLowerCase().includes(cityLower)) ||
          (location.state && location.state.toLowerCase().includes(cityLower)) ||
          (location.address && location.address.toLowerCase().includes(cityLower))
        );
      }
      
      // If still no matches, just return an empty array to indicate no results
      if (cityFiltered.length === 0) {
        console.log(`No matches for city: ${filter.city}, returning empty results`);
        result = [];
      } else {
        console.log(`Filter by city: ${filter.city}, found ${cityFiltered.length} locations`);
        result = cityFiltered;
      }
    }

    // Filter by search query (name or address)
    if (filter.query) {
      const queryLower = filter.query.toLowerCase();
      result = result.filter(location => 
        location.name.toLowerCase().includes(queryLower) || 
        location.address.toLowerCase().includes(queryLower) ||
        location.city.toLowerCase().includes(queryLower) ||
        location.state.toLowerCase().includes(queryLower)
      );
      console.log(`Filter by query: ${filter.query}, found ${result.length} locations`);
    }

    // Filter by radius around a point
    if (filter.latitude !== undefined && filter.longitude !== undefined && filter.radius !== undefined) {
      result = this.filterByDistance(
        result, 
        filter.latitude, 
        filter.longitude, 
        filter.radius
      );
    }

    return result;
  }

  // Get locations within a specific radius of coordinates (in kilometers)
  async getLocationsWithinRadius(
    lat: number,
    lng: number,
    radius: number
  ): Promise<Location[]> {
    return this.filterByDistance(
      Array.from(this.locations.values()),
      lat,
      lng,
      radius
    );
  }

  async getNearbyLocations(
    lat: number, 
    lng: number, 
    radius: number, 
    types?: LocationType[],
    connectorTypes?: ConnectorType[]
  ): Promise<Location[]> {
    let locations = Array.from(this.locations.values());
    
    // Filter by types if specified
    if (types && types.length > 0) {
      locations = locations.filter(loc => types.includes(loc.type as LocationType));
    }
    
    // Filter by connector types if specified and for charging stations
    if (connectorTypes && connectorTypes.length > 0) {
      // Get charging station ids with matching connector types
      const chargingStationsFiltered = Array.from(this.chargingStations.values())
        .filter(station => {
          return station.connectorTypes.some(type => 
            connectorTypes.includes(type as ConnectorType)
          );
        });
      
      const stationIds = new Set(chargingStationsFiltered.map(s => s.locationId));
      
      // Filter locations to only those matching the charging stations with the right connectors
      locations = locations.filter(loc => 
        loc.type !== 'charging' || stationIds.has(loc.id)
      );
    }

    // Create an array of locations with their associated charging stations
    const locationsWithStations = locations.map(location => {
      if (location.type === 'charging') {
        // Find charging stations for this location
        const stationsForLocation = Array.from(this.chargingStations.values())
          .filter(station => station.locationId === location.id);
          
        return {
          ...location,
          chargingStations: stationsForLocation
        };
      }
      return location;
    });

    // Filter by distance and return
    return this.filterByDistance(locationsWithStations, lat, lng, radius);
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    const id = this.currentLocationId++;
    const newLocation: Location = { ...location, id };
    this.locations.set(id, newLocation);
    return newLocation;
  }

  async updateLocation(id: number, locationUpdate: Partial<InsertLocation>): Promise<Location | undefined> {
    const location = this.locations.get(id);
    if (!location) return undefined;

    const updatedLocation = { ...location, ...locationUpdate };
    this.locations.set(id, updatedLocation);
    return updatedLocation;
  }

  async deleteLocation(id: number): Promise<boolean> {
    // Delete associated charging stations first
    const chargingStations = await this.getChargingStationsByLocationId(id);
    for (const station of chargingStations) {
      await this.deleteChargingStation(station.id);
    }
    
    return this.locations.delete(id);
  }
  
  // Location photo operations
  async addLocationPhoto(photo: InsertLocationPhoto): Promise<LocationPhoto> {
    const id = this.currentLocationPhotoId++;
    const now = new Date();
    const newPhoto: LocationPhoto = { 
      ...photo, 
      id,
      created: now
    };
    this.locationPhotos.set(id, newPhoto);
    
    // Update the location's imageUrl if it doesn't have one
    const location = this.locations.get(photo.locationId);
    if (location && !location.imageUrl) {
      location.imageUrl = photo.url;
      this.locations.set(photo.locationId, location);
    }
    
    return newPhoto;
  }
  
  async getLocationPhotos(locationId: number): Promise<LocationPhoto[]> {
    return Array.from(this.locationPhotos.values())
      .filter(photo => photo.locationId === locationId);
  }

  // Charging station CRUD operations
  async getChargingStations(): Promise<ChargingStation[]> {
    return Array.from(this.chargingStations.values());
  }

  async getChargingStation(id: number): Promise<ChargingStation | undefined> {
    return this.chargingStations.get(id);
  }

  async getChargingStationsByLocationId(locationId: number): Promise<ChargingStation[]> {
    return Array.from(this.chargingStations.values())
      .filter(station => station.locationId === locationId);
  }

  async createChargingStation(station: InsertChargingStation): Promise<ChargingStation> {
    const id = this.currentChargingStationId++;
    const newStation: ChargingStation = { ...station, id };
    this.chargingStations.set(id, newStation);
    return newStation;
  }

  async updateChargingStation(id: number, stationUpdate: Partial<InsertChargingStation>): Promise<ChargingStation | undefined> {
    const station = this.chargingStations.get(id);
    if (!station) return undefined;

    const updatedStation = { ...station, ...stationUpdate };
    this.chargingStations.set(id, updatedStation);
    return updatedStation;
  }

  async deleteChargingStation(id: number): Promise<boolean> {
    return this.chargingStations.delete(id);
  }

  // User related operations from original template
  async getUser(id: number): Promise<any | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<any | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(user: any): Promise<any> {
    const id = this.currentUserId++;
    const newUser = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }
  
  async updateUser(id: number, userUpdate: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...userUpdate };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async verifyUserEmail(email: string): Promise<boolean> {
    const user = await this.getUserByEmail(email);
    if (!user) return false;
    
    // Simulate email verification
    await this.updateUser(user.id, { emailVerified: true });
    return true;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  // Helper function to calculate distance between coordinates (Haversine formula)
  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  private filterByDistance(locations: Location[], lat: number, lng: number, radius: number): Location[] {
    return locations.filter(location => {
      const distance = this.haversineDistance(
        lat, 
        lng, 
        location.latitude, 
        location.longitude
      );
      return distance <= radius;
    });
  }

  // Seed initial data
  private seedData() {
    // Seed charging stations in Delhi
    this.seedLocation({
      name: "Tata Power EV Station",
      type: "charging",
      address: "Connaught Place",
      city: "New Delhi",
      state: "Delhi",
      latitude: 28.6329,
      longitude: 77.2195,
      imageUrl: "https://images.unsplash.com/photo-1558815585-ebcb5c99c6d1?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&h=200&q=80",
      isOpen: true,
      hasParking: true,
      hasRestroom: true,
      hasFoodOption: true,
      phoneNumber: "+91-1234567890"
    }, {
      operatorName: "Tata Power",
      connectorTypes: ["CCS-2", "Type-2"],
      powerKw: 50,
      pricePerKwh: 20,
      isAvailable: true,
      numberOfPoints: 4
    });

    this.seedLocation({
      name: "EESL Charging Hub",
      type: "charging",
      address: "Nehru Place",
      city: "New Delhi",
      state: "Delhi",
      latitude: 28.5494,
      longitude: 77.2501,
      imageUrl: "https://images.unsplash.com/photo-1562965795-11aa8d55afe2?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&h=200&q=80",
      isOpen: true,
      hasParking: true,
      hasRestroom: false,
      hasFoodOption: false,
      phoneNumber: "+91-9876543210"
    }, {
      operatorName: "EESL",
      connectorTypes: ["Bharat AC", "Type-2"],
      powerKw: 22,
      pricePerKwh: 18,
      isAvailable: true,
      numberOfPoints: 2
    });

    // Seed charging stations in Mumbai
    this.seedLocation({
      name: "Ather Grid",
      type: "charging",
      address: "Bandra West",
      city: "Mumbai",
      state: "Maharashtra",
      latitude: 19.0596,
      longitude: 72.8295,
      imageUrl: "https://images.unsplash.com/photo-1593941707882-a5bba53b0824?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&h=200&q=80",
      isOpen: true,
      hasParking: true,
      hasRestroom: true,
      hasFoodOption: true,
      phoneNumber: "+91-8877665544"
    }, {
      operatorName: "Ather Energy",
      connectorTypes: ["Type-2"],
      powerKw: 7.4,
      pricePerKwh: 15,
      isAvailable: true,
      numberOfPoints: 6
    });

    this.seedLocation({
      name: "Revolt Hub",
      type: "charging",
      address: "Powai",
      city: "Mumbai",
      state: "Maharashtra",
      latitude: 19.1176,
      longitude: 72.9060,
      imageUrl: "https://images.unsplash.com/photo-1647495299720-7c0e16c34279?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&h=200&q=80",
      isOpen: false,
      hasParking: true,
      hasRestroom: false,
      hasFoodOption: false,
      phoneNumber: "+91-7766554433"
    }, {
      operatorName: "Revolt Motors",
      connectorTypes: ["Type-2", "Bharat AC"],
      powerKw: 11,
      pricePerKwh: 16,
      isAvailable: false,
      numberOfPoints: 3
    });

    // Seed charging stations in Bangalore
    this.seedLocation({
      name: "Fortum Charge & Drive",
      type: "charging",
      address: "Koramangala",
      city: "Bengaluru",
      state: "Karnataka",
      latitude: 12.9352,
      longitude: 77.6245,
      imageUrl: "https://images.unsplash.com/photo-1587157949-0a5874515d73?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&h=200&q=80",
      isOpen: true,
      hasParking: true,
      hasRestroom: true,
      hasFoodOption: true,
      phoneNumber: "+91-9988776655"
    }, {
      operatorName: "Fortum",
      connectorTypes: ["CCS-2", "CHAdeMO"],
      powerKw: 60,
      pricePerKwh: 22,
      isAvailable: true,
      numberOfPoints: 2
    });

    this.seedLocation({
      name: "Kazam Fast Charger",
      type: "charging",
      address: "HSR Layout",
      city: "Bengaluru",
      state: "Karnataka",
      latitude: 12.9116,
      longitude: 77.6741,
      imageUrl: "https://images.unsplash.com/photo-1593032580308-d4beba13an65?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&h=200&q=80",
      isOpen: true,
      hasParking: true,
      hasRestroom: false,
      hasFoodOption: true,
      phoneNumber: "+91-8866554433"
    }, {
      operatorName: "Kazam",
      connectorTypes: ["CCS-2", "Type-2"],
      powerKw: 30,
      pricePerKwh: 19,
      isAvailable: true,
      numberOfPoints: 4
    });
    
    // Add charging stations in Goa
    this.seedLocation({
      name: "Goa Electric Mobility Hub",
      type: "charging",
      address: "Panjim Main Road",
      city: "Goa",
      state: "Goa",
      latitude: 15.4909,
      longitude: 73.8278,
      imageUrl: "https://images.unsplash.com/photo-1596482498833-9e3b11bc3096?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&h=200&q=80",
      rating: 4.6,
      isOpen: true,
      hasParking: true,
      hasRestroom: true,
      hasFoodOption: true,
      phoneNumber: "+91-9876509876"
    }, {
      operatorName: "Goa Energy Development Agency",
      connectorTypes: ["CCS-2", "Type-2", "Bharat AC"],
      powerKw: 60,
      pricePerKwh: 16,
      paymentMethods: ["UPI", "Credit Card", "Cash"],
      isAvailable: true,
      numberOfPoints: 6
    });
    
    this.seedLocation({
      name: "Magenta ChargeGrid - Candolim",
      type: "charging",
      address: "Candolim Beach Road",
      city: "Goa",
      state: "Goa",
      latitude: 15.5185,
      longitude: 73.7636,
      imageUrl: "https://images.unsplash.com/photo-1587613991419-fdd23979a0ed?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&h=200&q=80",
      rating: 4.3,
      isOpen: true,
      hasParking: true,
      hasRestroom: true,
      hasFoodOption: false,
      phoneNumber: "+91-8765409876"
    }, {
      operatorName: "Magenta Power",
      connectorTypes: ["Type-2", "Bharat DC"],
      powerKw: 30,
      pricePerKwh: 17,
      paymentMethods: ["UPI", "ChargeGrid App"],
      isAvailable: true,
      numberOfPoints: 2
    });

    // Seed restaurants
    this.seedLocation({
      name: "Spice Garden Restaurant",
      type: "restaurant",
      address: "HSR Layout",
      city: "Bengaluru",
      state: "Karnataka",
      latitude: 12.9143,
      longitude: 77.6566,
      imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&h=200&q=80",
      rating: 4.3,
      isOpen: true,
      hasParking: true,
      hasRestroom: true,
      hasFoodOption: true,
      priceLevel: 2,
      phoneNumber: "+91-9876543210"
    });

    this.seedLocation({
      name: "Delhi Darbar",
      type: "restaurant",
      address: "Connaught Place",
      city: "New Delhi",
      state: "Delhi",
      latitude: 28.6315,
      longitude: 77.2167,
      imageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&h=200&q=80",
      rating: 4.5,
      isOpen: true,
      hasParking: true,
      hasRestroom: true,
      hasFoodOption: true,
      priceLevel: 3,
      phoneNumber: "+91-9988776655"
    });

    this.seedLocation({
      name: "Coastal Spice",
      type: "restaurant",
      address: "Bandra West",
      city: "Mumbai",
      state: "Maharashtra",
      latitude: 19.0614,
      longitude: 72.8283,
      imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&h=200&q=80",
      rating: 4.2,
      isOpen: true,
      hasParking: false,
      hasRestroom: true,
      hasFoodOption: true,
      priceLevel: 2,
      phoneNumber: "+91-8877665544"
    });

    // Seed hotels
    this.seedLocation({
      name: "Grand Inn Hotel",
      type: "hotel",
      address: "Indiranagar",
      city: "Bengaluru",
      state: "Karnataka",
      latitude: 12.9784,
      longitude: 77.6408,
      imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&h=200&q=80",
      rating: 4.5,
      isOpen: true,
      hasParking: true,
      hasRestroom: true,
      hasFoodOption: true,
      priceLevel: 3,
      phoneNumber: "+91-7766554433"
    });

    this.seedLocation({
      name: "Royal Palace Hotel",
      type: "hotel",
      address: "Karol Bagh",
      city: "New Delhi",
      state: "Delhi",
      latitude: 28.6419,
      longitude: 77.1901,
      imageUrl: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&h=200&q=80",
      rating: 4.3,
      isOpen: true,
      hasParking: true,
      hasRestroom: true,
      hasFoodOption: true,
      priceLevel: 4,
      phoneNumber: "+91-9988776655"
    });

    this.seedLocation({
      name: "Seaview Resort",
      type: "hotel",
      address: "Worli",
      city: "Mumbai",
      state: "Maharashtra",
      latitude: 19.0096,
      longitude: 72.8169,
      imageUrl: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&h=200&q=80",
      rating: 4.7,
      isOpen: true,
      hasParking: true,
      hasRestroom: true,
      hasFoodOption: true,
      priceLevel: 5,
      phoneNumber: "+91-8866554433"
    });

    // Seed restrooms
    this.seedLocation({
      name: "Public Convenience",
      type: "restroom",
      address: "MG Road Metro Station",
      city: "Bengaluru",
      state: "Karnataka",
      latitude: 12.9758,
      longitude: 77.6026,
      imageUrl: "https://images.unsplash.com/photo-1585508564825-d8c3abfa6184?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&h=200&q=80",
      isOpen: true,
      hasParking: false,
      hasRestroom: true,
      hasFoodOption: false,
      priceLevel: 1
    });

    this.seedLocation({
      name: "Rest Area",
      type: "restroom",
      address: "NH-8 Highway",
      city: "New Delhi",
      state: "Delhi",
      latitude: 28.5561,
      longitude: 77.1535,
      imageUrl: "https://images.unsplash.com/photo-1588075299639-8c1795d04cca?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&h=200&q=80",
      isOpen: true,
      hasParking: true,
      hasRestroom: true,
      hasFoodOption: true,
      priceLevel: 1
    });
  }

  private async seedLocation(location: Omit<InsertLocation, 'id'>, chargingStation?: Omit<InsertChargingStation, 'id' | 'locationId'>) {
    // Convert the seed data to match the correct schemas
    const locationData: InsertLocation = {
      name: location.name as string,
      type: location.type as LocationType,
      address: location.address as string,
      city: location.city as string,
      state: location.state as string,
      latitude: location.latitude as number,
      longitude: location.longitude as number,
      rating: location.rating as number || null,
      phoneNumber: location.phoneNumber as string || null,
      isOpen: location.isOpen as boolean || true,
      description: location.description as string || null,
      source: null,
      openingHours: location.openingHours as string || null,
      imageUrl: location.imageUrl as string || null,
      imageUrls: location.imageUrls as string[] || null,
      priceLevel: location.priceLevel as number || null,
      hasParking: location.hasParking as boolean || false,
      hasRestroom: location.hasRestroom as boolean || false,
      hasFoodOption: location.hasFoodOption as boolean || false,
      hasWifi: location.hasWifi as boolean || false,
      amenities: location.amenities as string[] || null,
    };
    
    const newLocation = await this.createLocation(locationData);
    
    if (chargingStation && location.type === 'charging') {
      const stationData: InsertChargingStation = {
        locationId: newLocation.id,
        operatorName: chargingStation.operatorName as string || 'Unknown',
        connectorTypes: chargingStation.connectorTypes as ConnectorType[] || ['Type-2'],
        powerKw: chargingStation.powerKw as number || 22,
        pricePerKwh: chargingStation.pricePerKwh as number || null,
        paymentMethods: chargingStation.paymentMethods as string[] || null,
        isAvailable: chargingStation.isAvailable as boolean || true,
        numberOfPoints: chargingStation.numberOfPoints as number || 1,
        waitTime: chargingStation.waitTime as number || 0,
        lastReported: new Date(),
        networkName: chargingStation.networkName as string || null,
        queueLength: chargingStation.queueLength as number || 0,
        supportContact: chargingStation.supportContact as string || null,
      };
      
      await this.createChargingStation(stationData);
    }
    
    return newLocation;
  }
  
  // Review operations
  async getReview(id: number): Promise<Review | undefined> {
    return this.reviews.get(id);
  }
  
  async getReviewsByLocationId(locationId: number): Promise<Review[]> {
    return Array.from(this.reviews.values())
      .filter(review => review.locationId === locationId);
  }
  
  async getReviewsByUserId(userId: number): Promise<Review[]> {
    return Array.from(this.reviews.values())
      .filter(review => review.userId === userId);
  }
  
  async createReview(review: InsertReview): Promise<Review> {
    const id = this.currentReviewId++;
    const newReview: Review = { ...review, id };
    this.reviews.set(id, newReview);
    return newReview;
  }
  
  async updateReview(id: number, reviewUpdate: Partial<InsertReview>): Promise<Review | undefined> {
    const review = this.reviews.get(id);
    if (!review) return undefined;
    
    const updatedReview = { ...review, ...reviewUpdate };
    this.reviews.set(id, updatedReview);
    return updatedReview;
  }
  
  async deleteReview(id: number): Promise<boolean> {
    return this.reviews.delete(id);
  }
  
  // Vehicle operations
  async getVehicle(id: number): Promise<Vehicle | undefined> {
    return this.vehicles.get(id);
  }
  
  async getVehiclesByUserId(userId: number): Promise<Vehicle[]> {
    return Array.from(this.vehicles.values())
      .filter(vehicle => vehicle.userId === userId);
  }
  
  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    const id = this.currentVehicleId++;
    const newVehicle: Vehicle = { ...vehicle, id };
    this.vehicles.set(id, newVehicle);
    return newVehicle;
  }
  
  async updateVehicle(id: number, vehicleUpdate: Partial<InsertVehicle>): Promise<Vehicle | undefined> {
    const vehicle = this.vehicles.get(id);
    if (!vehicle) return undefined;
    
    const updatedVehicle = { ...vehicle, ...vehicleUpdate };
    this.vehicles.set(id, updatedVehicle);
    return updatedVehicle;
  }
  
  async deleteVehicle(id: number): Promise<boolean> {
    return this.vehicles.delete(id);
  }
  
  // Travel plan operations
  async getTravelPlan(id: number): Promise<TravelPlan | undefined> {
    return this.travelPlans.get(id);
  }
  
  async getTravelPlansByUserId(userId: number): Promise<TravelPlan[]> {
    return Array.from(this.travelPlans.values())
      .filter(plan => plan.userId === userId);
  }
  
  async createTravelPlan(plan: InsertTravelPlan): Promise<TravelPlan> {
    const id = this.currentTravelPlanId++;
    const newPlan: TravelPlan = { ...plan, id };
    this.travelPlans.set(id, newPlan);
    return newPlan;
  }
  
  async updateTravelPlan(id: number, planUpdate: Partial<InsertTravelPlan>): Promise<TravelPlan | undefined> {
    const plan = this.travelPlans.get(id);
    if (!plan) return undefined;
    
    const updatedPlan = { ...plan, ...planUpdate };
    this.travelPlans.set(id, updatedPlan);
    return updatedPlan;
  }
  
  async deleteTravelPlan(id: number): Promise<boolean> {
    return this.travelPlans.delete(id);
  }
  
  // Travel waypoint operations
  async getTravelWaypoint(id: number): Promise<TravelWaypoint | undefined> {
    return this.travelWaypoints.get(id);
  }
  
  async getTravelWaypointsByPlanId(planId: number): Promise<TravelWaypoint[]> {
    return Array.from(this.travelWaypoints.values())
      .filter(waypoint => waypoint.planId === planId);
  }
  
  async createTravelWaypoint(waypoint: InsertTravelWaypoint): Promise<TravelWaypoint> {
    const id = this.currentTravelWaypointId++;
    const newWaypoint: TravelWaypoint = { ...waypoint, id };
    this.travelWaypoints.set(id, newWaypoint);
    return newWaypoint;
  }
  
  async updateTravelWaypoint(id: number, waypointUpdate: Partial<InsertTravelWaypoint>): Promise<TravelWaypoint | undefined> {
    const waypoint = this.travelWaypoints.get(id);
    if (!waypoint) return undefined;
    
    const updatedWaypoint = { ...waypoint, ...waypointUpdate };
    this.travelWaypoints.set(id, updatedWaypoint);
    return updatedWaypoint;
  }
  
  async deleteTravelWaypoint(id: number): Promise<boolean> {
    return this.travelWaypoints.delete(id);
  }
  
  // Charging booking operations
  async getChargingBooking(id: number): Promise<ChargingBooking | undefined> {
    return this.chargingBookings.get(id);
  }
  
  async getChargingBookingsByUserId(userId: number): Promise<ChargingBooking[]> {
    return Array.from(this.chargingBookings.values())
      .filter(booking => booking.userId === userId);
  }
  
  async getChargingBookingsByStationId(stationId: number): Promise<ChargingBooking[]> {
    return Array.from(this.chargingBookings.values())
      .filter(booking => booking.stationId === stationId);
  }
  
  async createChargingBooking(booking: Omit<ChargingBooking, 'id' | 'created'>): Promise<ChargingBooking> {
    const id = this.currentChargingBookingId++;
    const newBooking: ChargingBooking = { 
      ...booking, 
      id,
      created: new Date()
    };
    this.chargingBookings.set(id, newBooking);
    return newBooking;
  }
  
  async updateChargingBooking(id: number, bookingUpdate: Partial<ChargingBooking>): Promise<ChargingBooking | undefined> {
    const booking = this.chargingBookings.get(id);
    if (!booking) return undefined;
    
    const updatedBooking = { ...booking, ...bookingUpdate };
    this.chargingBookings.set(id, updatedBooking);
    return updatedBooking;
  }
  
  async deleteChargingBooking(id: number): Promise<boolean> {
    return this.chargingBookings.delete(id);
  }
}

export const storage = new MemStorage();
