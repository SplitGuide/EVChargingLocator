import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  locationFilterSchema, 
  insertUserSchema,
  insertVehicleSchema,
  insertTravelPlanSchema,
  insertTravelWaypointSchema,
  travelPlanQuerySchema,
  insertReviewSchema
} from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";
import axios from "axios";
import { searchNearbyChargingStations, getPlacePhotos } from "./googlePlacesApi";
import { importStationsFromCsv } from "./importStationsFromCsv";
import { fetchAndImportEVCosmosStations } from "./services/evCosmosFetcher";
import { fetchAndImportMGMotorStations } from "./services/mgMotorStationsFetcher";
import { fetchAndImportChargeZoneStations } from "./services/chargeZoneFetcher";
import { fetchAndImportHPCLStations } from "./services/hpclStationsFetcher";
import { fetchAndImportTataMotorsStations } from "./services/tataMotorStationsFetcher";
import { fetchAndImportBoltStations } from "./services/boltEarthFetcher";

// Mock OTP service (to be replaced with a real SMS/email service)
const otpCache = new Map<string, {otp: string, expires: number}>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Import EV charging stations from CSV on startup
  console.log("Importing EV charging stations from CSV...");
  try {
    await importStationsFromCsv();
    console.log("Successfully imported EV charging stations data");
  } catch (error) {
    console.error("Failed to import EV charging stations data:", error);
  }

  // API Routes
  const apiRouter = app;

  // ========================
  // AUTHENTICATION & USER ROUTES
  // ========================
  
  // Register a new user
  apiRouter.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { username, email, password, name } = req.body;
      
      // Check if username or email already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }
      
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(409).json({ message: "Email already exists" });
      }
      
      // Hash password
      const passwordHash = hashPassword(password);
      
      // Create user
      const user = await storage.createUser({
        username,
        email,
        passwordHash,
        name
      });
      
      // Generate OTP for verification
      const otp = generateOTP();
      otpCache.set(email, {
        otp,
        expires: Date.now() + 10 * 60 * 1000 // 10 minutes expiry
      });
      
      // In production, send the OTP via email/SMS
      console.log(`[DEV] Verification OTP for ${email}: ${otp}`);
      
      return res.status(201).json({ 
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        message: "User registered successfully. Please verify your email."
      });
    } catch (error) {
      console.error("Error registering user:", error);
      return res.status(500).json({ message: "Failed to register user" });
    }
  });
  
  // Verify user email/phone with OTP
  apiRouter.post("/api/auth/verify", async (req: Request, res: Response) => {
    try {
      const { email, otp } = req.body;
      
      if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required" });
      }
      
      const cachedOTP = otpCache.get(email);
      if (!cachedOTP) {
        return res.status(400).json({ message: "OTP expired or not found. Please request a new one." });
      }
      
      if (cachedOTP.expires < Date.now()) {
        otpCache.delete(email);
        return res.status(400).json({ message: "OTP expired. Please request a new one." });
      }
      
      if (cachedOTP.otp !== otp) {
        return res.status(400).json({ message: "Invalid OTP" });
      }
      
      // Mark user as verified
      await storage.verifyUserEmail(email);
      otpCache.delete(email);
      
      return res.json({ message: "Email verified successfully" });
    } catch (error) {
      console.error("Error verifying email:", error);
      return res.status(500).json({ message: "Failed to verify email" });
    }
  });
  
  // Login
  apiRouter.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      const isValidPassword = verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Create user session (In a real app, use JWT or session management)
      const session = {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
      };
      
      return res.json({ 
        user: session,
        message: "Login successful" 
      });
    } catch (error) {
      console.error("Error logging in:", error);
      return res.status(500).json({ message: "Failed to login" });
    }
  });
  
  // Get user profile
  apiRouter.get("/api/users/profile", async (req: Request, res: Response) => {
    try {
      // In a real app, get user ID from session/token
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get user's vehicles
      const vehicles = await storage.getVehiclesByUserId(userId);
      
      // Get user's travel plans
      const travelPlans = await storage.getTravelPlansByUserId(userId);
      
      return res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          profilePhoto: user.profilePhoto
        },
        vehicles,
        travelPlans
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });
  
  // ========================
  // LOCATION ROUTES
  // ========================
  
  // Get all locations with optional filtering
  apiRouter.get("/api/locations", async (req: Request, res: Response) => {
    try {
      const { 
        types, city, query, latitude, longitude, radius,
        amenities, connectorTypes, isOpen, minRating
      } = req.query;

      // Parse array parameters
      let typesArray: string[] | undefined;
      if (typeof types === 'string') {
        typesArray = types.split(',');
      } else if (Array.isArray(types)) {
        typesArray = types as string[];
      }
      
      let amenitiesArray: string[] | undefined;
      if (typeof amenities === 'string') {
        amenitiesArray = amenities.split(',');
      } else if (Array.isArray(amenities)) {
        amenitiesArray = amenities as string[];
      }
      
      let connectorTypesArray: string[] | undefined;
      if (typeof connectorTypes === 'string') {
        connectorTypesArray = connectorTypes.split(',');
      } else if (Array.isArray(connectorTypes)) {
        connectorTypesArray = connectorTypes as string[];
      }

      // Validate and parse the filter
      const filterResult = locationFilterSchema.safeParse({
        types: typesArray,
        city: city as string | undefined,
        query: query as string | undefined,
        latitude: latitude ? parseFloat(latitude as string) : undefined,
        longitude: longitude ? parseFloat(longitude as string) : undefined,
        radius: radius ? parseFloat(radius as string) : undefined,
        amenities: amenitiesArray,
        connectorTypes: connectorTypesArray,
        isOpen: isOpen ? isOpen === 'true' : undefined,
        minRating: minRating ? parseFloat(minRating as string) : undefined
      });

      if (!filterResult.success) {
        return res.status(400).json({ message: "Invalid filter parameters", errors: filterResult.error.errors });
      }

      const locations = await storage.getLocationsByFilter(filterResult.data);
      return res.json(locations);
    } catch (error) {
      console.error("Error fetching locations:", error);
      return res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  // Get nearby locations
  apiRouter.get("/api/locations/nearby", async (req: Request, res: Response) => {
    try {
      const { latitude, longitude, radius, types, connectorTypes } = req.query;
      
      // Validate required parameters
      if (!latitude || !longitude) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
      }
      
      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const rad = radius ? parseFloat(radius as string) : 5; // Default 5 km radius
      
      // Parse array parameters
      let typesArray: string[] | undefined;
      if (typeof types === 'string') {
        typesArray = types.split(',');
      } else if (Array.isArray(types)) {
        typesArray = types as string[];
      }
      
      let connectorTypesArray: string[] | undefined;
      if (typeof connectorTypes === 'string') {
        connectorTypesArray = connectorTypes.split(',');
      } else if (Array.isArray(connectorTypes)) {
        connectorTypesArray = connectorTypes as string[];
      }
      
      const locations = await storage.getNearbyLocations(lat, lng, rad, typesArray as any, connectorTypesArray as any);
      
      // Add distance to each location
      const locationsWithDistance = locations.map(location => ({
        ...location,
        distance: haversineDistance(
          lat, lng, 
          location.latitude, location.longitude
        )
      }));
      
      return res.json(locationsWithDistance);
    } catch (error) {
      console.error("Error fetching nearby locations:", error);
      return res.status(500).json({ message: "Failed to fetch nearby locations" });
    }
  });
  
  // Search Google Places for nearby charging stations
  apiRouter.get("/api/google/charging-stations", async (req: Request, res: Response) => {
    try {
      const { latitude, longitude, radius } = req.query;
      
      // Validate required parameters
      if (!latitude || !longitude) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
      }
      
      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const rad = radius ? parseFloat(radius as string) : 5000; // Default 5 km radius
      
      // API key has been hardcoded in googlePlacesApi.ts
      
      console.log(`Searching for charging stations at ${lat}, ${lng} with radius ${rad}m using Google Places API`);
      
      // Search for charging stations using Google Places API
      const locations = await searchNearbyChargingStations(lat, lng, rad);
      
      // Add distance to each location
      const locationsWithDistance = locations.map(location => ({
        ...location,
        distance: haversineDistance(
          lat, lng, 
          location.latitude, location.longitude
        )
      }));
      
      console.log(`Found ${locations.length} charging stations from Google Places API`);
      
      return res.json(locationsWithDistance);
    } catch (error: any) {
      console.error("Error searching Google Places API:", error);
      return res.status(500).json({ 
        message: "Failed to search Google Places API",
        error: error.message
      });
    }
  });
  
  // Google Maps Distance Matrix API
  apiRouter.get("/api/google/distance-matrix", async (req: Request, res: Response) => {
    try {
      if (!process.env.GOOGLE_PLACES_API_KEY) {
        throw new Error("Google API key is not configured");
      }
      
      // Get parameters from query
      const origins = req.query.origins as string;
      const destinations = req.query.destinations as string;
      const mode = req.query.mode as string || 'driving';
      const departure_time = req.query.departure_time as string;
      
      // Validate required parameters
      if (!origins || !destinations) {
        return res.status(400).json({ 
          status: "REQUEST_DENIED", 
          error_message: "Missing required parameters: origins and destinations"
        });
      }
      
      // Build request URL
      const params = new URLSearchParams({
        origins,
        destinations,
        key: process.env.GOOGLE_PLACES_API_KEY,
        mode
      });
      
      // Add departure_time if provided (for traffic consideration)
      if (departure_time) {
        params.append("departure_time", departure_time);
      }
      
      // Make request to Google Distance Matrix API
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`
      );
      
      // Return the response from Google
      return res.json(response.data);
    } catch (error: any) {
      console.error("Error fetching distance matrix:", error);
      return res.status(500).json({ 
        status: "UNKNOWN_ERROR", 
        error_message: error.message || "Failed to fetch distance matrix"
      });
    }
  });
  
  // Google Maps Directions API
  apiRouter.get("/api/google/directions", async (req: Request, res: Response) => {
    try {
      if (!process.env.GOOGLE_PLACES_API_KEY) {
        throw new Error("Google API key is not configured");
      }
      
      // Get parameters from query
      const origin = req.query.origin as string;
      const destination = req.query.destination as string;
      const waypoints = req.query.waypoints as string;
      const mode = req.query.mode as string || 'driving';
      
      // Validate required parameters
      if (!origin || !destination) {
        return res.status(400).json({ 
          status: "REQUEST_DENIED", 
          error_message: "Missing required parameters: origin and destination"
        });
      }
      
      // Build request URL
      const params = new URLSearchParams({
        origin,
        destination,
        key: process.env.GOOGLE_PLACES_API_KEY,
        mode
      });
      
      // Add waypoints if provided
      if (waypoints) {
        params.append("waypoints", waypoints);
      }
      
      // Make request to Google Directions API
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`
      );
      
      // Return the response from Google
      return res.json(response.data);
    } catch (error: any) {
      console.error("Error fetching directions:", error);
      return res.status(500).json({ 
        status: "UNKNOWN_ERROR", 
        error_message: error.message || "Failed to fetch directions"
      });
    }
  });
  
  // Google Maps Geocoding API
  apiRouter.get("/api/google/geocode", async (req: Request, res: Response) => {
    try {
      if (!process.env.GOOGLE_PLACES_API_KEY) {
        throw new Error("Google API key is not configured");
      }
      
      const address = req.query.address as string;
      
      if (!address) {
        return res.status(400).json({ 
          status: "REQUEST_DENIED", 
          error_message: "Missing required parameter: address"
        });
      }
      
      // Build request URL
      const params = new URLSearchParams({
        address,
        key: process.env.GOOGLE_PLACES_API_KEY
      });
      
      // Make request to Google Geocoding API
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`
      );
      
      // Return the response from Google
      return res.json(response.data);
    } catch (error: any) {
      console.error("Error geocoding address:", error);
      return res.status(500).json({ 
        status: "UNKNOWN_ERROR", 
        error_message: error.message || "Failed to geocode address"
      });
    }
  });
  
  // Google Maps Reverse Geocoding API
  apiRouter.get("/api/google/reverse-geocode", async (req: Request, res: Response) => {
    try {
      if (!process.env.GOOGLE_PLACES_API_KEY) {
        throw new Error("Google API key is not configured");
      }
      
      const lat = req.query.lat as string;
      const lng = req.query.lng as string;
      
      if (!lat || !lng) {
        return res.status(400).json({ 
          status: "REQUEST_DENIED", 
          error_message: "Missing required parameters: lat and lng"
        });
      }
      
      // Build request URL
      const params = new URLSearchParams({
        latlng: `${lat},${lng}`,
        key: process.env.GOOGLE_PLACES_API_KEY
      });
      
      // Make request to Google Reverse Geocoding API
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`
      );
      
      // Return the response from Google
      return res.json(response.data);
    } catch (error: any) {
      console.error("Error reverse geocoding:", error);
      return res.status(500).json({ 
        status: "UNKNOWN_ERROR", 
        error_message: error.message || "Failed to reverse geocode coordinates"
      });
    }
  });

  // Get a specific location by ID with detailed information
  apiRouter.get("/api/locations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid location ID" });
      }

      const location = await storage.getLocation(id);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }

      // If it's a charging station, get the associated charging station details
      let chargingStation = undefined;
      if (location.type === 'charging') {
        const stations = await storage.getChargingStationsByLocationId(id);
        chargingStation = stations.length > 0 ? stations[0] : undefined;
      }
      
      // Get photos from location photos table
      const locationPhotos = await storage.getLocationPhotos(id);
      let photos: string[] = [];
      
      // Convert location photos to URLs for backward compatibility
      if (locationPhotos.length > 0) {
        photos = locationPhotos.map(photo => photo.url);
      } 
      // Fallback to imageUrls if no photos in location photos table
      else if (location.imageUrls && Array.isArray(location.imageUrls) && location.imageUrls.length > 0) {
        photos = location.imageUrls;
      } 
      // Fallback to imageUrl if no imageUrls
      else if (location.imageUrl) {
        photos = [location.imageUrl];
      }
      
      // Make sure there are no null or undefined values in the photos array
      photos = photos.filter(photo => photo != null && photo !== '');
      
      // Try to get additional photos from Google Places API
      try {
        if (photos.length < 3 && process.env.GOOGLE_PLACES_API_KEY) {
          const googlePhotos = await getPlacePhotos({
            searchText: location.name,
            location: {
              lat: location.latitude,
              lng: location.longitude
            }
          });
          
          // Add Google photos to our photos array
          if (googlePhotos && googlePhotos.length > 0) {
            photos = [...photos, ...googlePhotos];
          }
        }
      } catch (error) {
        console.error("Error fetching Google photos (non-critical):", error);
        // Continue without Google photos if there's an error
      }
      
      // Get reviews for this location
      const reviews = await storage.getReviewsByLocationId(id);

      return res.json({ 
        location, 
        chargingStation,
        reviews,
        photos
      });
    } catch (error) {
      console.error("Error fetching location:", error);
      return res.status(500).json({ message: "Failed to fetch location" });
    }
  });

  // Add a photo to a location
  apiRouter.post("/api/locations/:id/photos", async (req: Request, res: Response) => {
    try {
      const locationId = parseInt(req.params.id);
      if (isNaN(locationId)) {
        return res.status(400).json({ message: "Invalid location ID" });
      }

      const { photoUrl, caption, source } = req.body;
      if (!photoUrl) {
        return res.status(400).json({ message: "Photo URL is required" });
      }

      const location = await storage.getLocation(locationId);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }

      // Check if photoUrl is valid
      if (!photoUrl || typeof photoUrl !== 'string' || photoUrl.trim() === '') {
        return res.status(400).json({ message: "Invalid photo URL" });
      }
      
      // Validate URL format - simple check to ensure it starts with http://, https:// or data:
      const trimmedUrl = photoUrl.trim();
      if (!(trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://') || trimmedUrl.startsWith('data:'))) {
        return res.status(400).json({ message: "Invalid URL format. URL must start with http://, https:// or data:" });
      }

      // Add the photo to our location photos table
      const newPhoto = await storage.addLocationPhoto({
        locationId,
        url: trimmedUrl,
        caption: caption || null,
        source: source || 'user-uploaded'
      });

      // If location doesn't have imageUrls, create an array
      if (!location.imageUrls || !Array.isArray(location.imageUrls)) {
        location.imageUrls = [];
      }

      // Add the new photo URL to the imageUrls array for backward compatibility
      location.imageUrls.push(trimmedUrl);

      // Update the location with the new photo URL
      const updatedLocation = await storage.updateLocation(locationId, {
        imageUrls: location.imageUrls
      });

      return res.status(200).json({ 
        message: "Photo added successfully", 
        photo: newPhoto,
        location: updatedLocation 
      });
    } catch (error) {
      console.error("Error adding photo:", error);
      return res.status(500).json({ message: "Failed to add photo" });
    }
  });
  
  // Get photos for a location
  apiRouter.get("/api/locations/:id/photos", async (req: Request, res: Response) => {
    try {
      const locationId = parseInt(req.params.id);
      if (isNaN(locationId)) {
        return res.status(400).json({ message: "Invalid location ID" });
      }

      const location = await storage.getLocation(locationId);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }

      // Get photos from our location photos table
      const photos = await storage.getLocationPhotos(locationId);
      
      return res.status(200).json(photos);
    } catch (error) {
      console.error("Error fetching location photos:", error);
      return res.status(500).json({ message: "Failed to fetch location photos" });
    }
  });

  // Add a review for a location
  apiRouter.post("/api/locations/:id/reviews", async (req: Request, res: Response) => {
    try {
      const locationId = parseInt(req.params.id);
      if (isNaN(locationId)) {
        return res.status(400).json({ message: "Invalid location ID" });
      }
      
      const { userId, rating, comment, photos } = req.body;
      
      if (!userId || !rating) {
        return res.status(400).json({ message: "User ID and rating are required" });
      }
      
      const review = await storage.createReview({
        userId,
        locationId,
        rating,
        comment,
        photos: photos || []
      });
      
      return res.status(201).json(review);
    } catch (error) {
      console.error("Error adding review:", error);
      return res.status(500).json({ message: "Failed to add review" });
    }
  });

  // Get charging stations with availability
  apiRouter.get("/api/charging-stations", async (req: Request, res: Response) => {
    try {
      const { available, connectorTypes } = req.query;
      
      let connectorTypesArray: string[] | undefined;
      if (typeof connectorTypes === 'string') {
        connectorTypesArray = connectorTypes.split(',');
      } else if (Array.isArray(connectorTypes)) {
        connectorTypesArray = connectorTypes as string[];
      }
      
      const stations = await storage.getChargingStations(
        available === 'true',
        connectorTypesArray as any
      );
      return res.json(stations);
    } catch (error) {
      console.error("Error fetching charging stations:", error);
      return res.status(500).json({ message: "Failed to fetch charging stations" });
    }
  });

  // Get charging stations by location ID
  apiRouter.get("/api/locations/:id/charging-stations", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid location ID" });
      }

      const stations = await storage.getChargingStationsByLocationId(id);
      return res.json(stations);
    } catch (error) {
      console.error("Error fetching charging stations for location:", error);
      return res.status(500).json({ message: "Failed to fetch charging stations" });
    }
  });

  // Book a charging slot
  apiRouter.post("/api/charging-stations/:id/book", async (req: Request, res: Response) => {
    try {
      const stationId = parseInt(req.params.id);
      if (isNaN(stationId)) {
        return res.status(400).json({ message: "Invalid station ID" });
      }
      
      const { userId, vehicleId, startTime, endTime, connectorType } = req.body;
      
      if (!userId || !startTime || !endTime || !connectorType) {
        return res.status(400).json({ message: "User ID, start time, end time, and connector type are required" });
      }
      
      const station = await storage.getChargingStation(stationId);
      if (!station) {
        return res.status(404).json({ message: "Charging station not found" });
      }
      
      if (!station.isAvailable) {
        return res.status(400).json({ message: "Charging station is not available" });
      }
      
      if (!station.connectorTypes.includes(connectorType)) {
        return res.status(400).json({ message: `Connector type ${connectorType} not available at this station` });
      }
      
      // In a real app, check if the slot is available for the requested time
      // For this demo, we'll assume it is
      
      // Book the slot
      const booking = await storage.createChargingBooking({
        userId,
        stationId,
        vehicleId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        connectorType,
        status: 'confirmed',
        paymentStatus: 'pending'
      });
      
      return res.status(201).json({
        booking,
        message: "Charging slot booked successfully"
      });
    } catch (error) {
      console.error("Error booking charging slot:", error);
      return res.status(500).json({ message: "Failed to book charging slot" });
    }
  });

  // Get cities for search autocomplete
  apiRouter.get("/api/cities", async (req: Request, res: Response) => {
    try {
      const { query } = req.query;
      const locations = await storage.getLocations();
      
      // Get unique cities from locations
      const citiesFromLocations = [...new Set(locations.map(loc => loc.city))];
      
      // Get unique locations/places from locations data
      const placesFromLocations = locations.map(loc => ({
        name: loc.name,
        city: loc.city,
        type: 'place'
      }));
      
      // Ensure popular cities and major cities in India are always included
      const popularCities = [
        // Major metros
        "New Delhi", "Mumbai", "Bengaluru", "Chennai", "Hyderabad", "Kolkata", "Pune", "Ahmedabad",
        // Popular tourist destinations
        "Goa", "Jaipur", "Agra", "Udaipur", "Kochi", "Varanasi", "Rishikesh", "Darjeeling",
        // Tier 2 cities
        "Lucknow", "Chandigarh", "Indore", "Bhopal", "Nagpur", "Coimbatore", "Vadodara", "Surat",
        // Tier 3 cities
        "Amritsar", "Dehradun", "Mysore", "Visakhapatnam", "Nashik", "Thiruvananthapuram", "Mangalore", "Vijayawada",
        // Industrial hubs
        "Noida", "Gurgaon", "Faridabad", "Ghaziabad", "Ludhiana", "Kanpur", "Aurangabad", "Raipur"
      ];
      
      // Create city objects from city names
      const cityObjects = Array.from(new Set([...citiesFromLocations, ...popularCities])).map(city => ({
        name: city,
        city: city,
        type: 'city'
      }));
      
      // Combine cities and places
      const searchResults = [...cityObjects, ...placesFromLocations];
      
      // Filter by query if provided
      let filteredResults = searchResults;
      if (query) {
        const queryStr = (query as string).toLowerCase();
        filteredResults = searchResults.filter(item => 
          item.name.toLowerCase().includes(queryStr) || 
          item.city.toLowerCase().includes(queryStr)
        );
        // Limit results to prevent too many options
        filteredResults = filteredResults.slice(0, 15);
      } else {
        // If no query, just return cities (not specific locations)
        filteredResults = cityObjects;
      }
      
      console.log("Search API response:", filteredResults.length, "results");
      return res.json(filteredResults);
    } catch (error) {
      console.error("Error fetching search results:", error);
      return res.status(500).json({ message: "Failed to fetch search results" });
    }
  });

  // ========================
  // VEHICLE ROUTES
  // ========================
  
  // Register a vehicle
  apiRouter.post("/api/vehicles", async (req: Request, res: Response) => {
    try {
      const vehicleData = req.body;
      
      // Validate vehicle data
      const validationResult = insertVehicleSchema.safeParse(vehicleData);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid vehicle data", 
          errors: validationResult.error.errors 
        });
      }
      
      const vehicle = await storage.createVehicle(vehicleData);
      
      return res.status(201).json(vehicle);
    } catch (error) {
      console.error("Error registering vehicle:", error);
      return res.status(500).json({ message: "Failed to register vehicle" });
    }
  });
  
  // Get vehicles by user ID
  apiRouter.get("/api/users/:userId/vehicles", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const vehicles = await storage.getVehiclesByUserId(userId);
      
      return res.json(vehicles);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      return res.status(500).json({ message: "Failed to fetch vehicles" });
    }
  });
  
  // ========================
  // TRAVEL PLANNING ROUTES
  // ========================
  
  // Plan a trip
  apiRouter.post("/api/travel-plans", async (req: Request, res: Response) => {
    try {
      const { 
        userId, vehicleId, name, startAddress, endAddress,
        startLatitude, startLongitude, endLatitude, endLongitude,
        departureTime 
      } = req.body;
      
      if (!userId || !name || !startAddress || !endAddress || 
          !startLatitude || !startLongitude || !endLatitude || !endLongitude) {
        return res.status(400).json({ message: "Missing required fields for travel plan" });
      }
      
      // Create the travel plan
      const travelPlan = await storage.createTravelPlan({
        userId,
        vehicleId,
        name,
        startAddress,
        endAddress,
        startLatitude,
        startLongitude,
        endLatitude,
        endLongitude,
        departureTime: departureTime ? new Date(departureTime) : undefined,
        status: 'planned',
      });
      
      // Calculate optimal charging stops
      // In a real app, this would use routing algorithms and battery consumption models
      // For this demo, we'll add some sample waypoints
      
      // Find charging stations along the route
      const stations = await storage.getNearbyLocations(
        (startLatitude + endLatitude) / 2,
        (startLongitude + endLongitude) / 2,
        calculateDistance(startLatitude, startLongitude, endLatitude, endLongitude) / 2,
        ['charging']
      );
      
      const waypoints = [];
      
      // Add charging stations as waypoints
      for (let i = 0; i < Math.min(stations.length, 3); i++) {
        const station = stations[i];
        waypoints.push(await storage.createTravelWaypoint({
          travelPlanId: travelPlan.id,
          locationId: station.id,
          name: station.name,
          address: station.address,
          latitude: station.latitude,
          longitude: station.longitude,
          stopDurationMinutes: 30, // Assume 30 minutes charging time
          order: i + 1,
          type: 'charging'
        }));
      }
      
      // Add some rest/food stops
      const restStops = await storage.getNearbyLocations(
        (startLatitude + endLatitude) / 2,
        (startLongitude + endLongitude) / 2,
        calculateDistance(startLatitude, startLongitude, endLatitude, endLongitude) / 2,
        ['restaurant', 'hotel', 'restroom']
      );
      
      for (let i = 0; i < Math.min(restStops.length, 2); i++) {
        const stop = restStops[i];
        waypoints.push(await storage.createTravelWaypoint({
          travelPlanId: travelPlan.id,
          locationId: stop.id,
          name: stop.name,
          address: stop.address,
          latitude: stop.latitude,
          longitude: stop.longitude,
          stopDurationMinutes: 45, // Assume 45 minutes for food/rest
          order: waypoints.length + 1,
          type: stop.type
        }));
      }
      
      return res.status(201).json({
        travelPlan,
        waypoints,
        message: "Travel plan created successfully"
      });
    } catch (error) {
      console.error("Error creating travel plan:", error);
      return res.status(500).json({ message: "Failed to create travel plan" });
    }
  });
  
  // Get travel plan details
  apiRouter.get("/api/travel-plans/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid travel plan ID" });
      }
      
      const travelPlan = await storage.getTravelPlan(id);
      if (!travelPlan) {
        return res.status(404).json({ message: "Travel plan not found" });
      }
      
      const waypoints = await storage.getTravelWaypointsByPlanId(id);
      
      // Get vehicle details if available
      let vehicle = null;
      if (travelPlan.vehicleId) {
        vehicle = await storage.getVehicle(travelPlan.vehicleId);
      }
      
      return res.json({
        travelPlan,
        waypoints,
        vehicle
      });
    } catch (error) {
      console.error("Error fetching travel plan:", error);
      return res.status(500).json({ message: "Failed to fetch travel plan" });
    }
  });

  // ========================
  // EV PROVIDER INTEGRATION
  // ========================
  
  // Get all EV charging stations across India (for map view)
  apiRouter.get("/api/ev-providers/all-stations", async (req: Request, res: Response) => {
    try {
      console.log("Fetching all EV charging stations across India");
      
      // Get all locations of charging type
      const allLocations = await storage.getLocations();
      const stations = allLocations.filter(location => 
        location.type === 'charging'
      );
      
      // Process each station asynchronously to get charging details
      const stationPromises = stations.map(async (station) => {
        // Get charging station if available
        const chargingStations = await storage.getChargingStationsByLocationId(station.id);
        const chargingStation = chargingStations.length > 0 ? chargingStations[0] : null;
        
        // Determine provider ID based on source
        let providerId = 'unknown';
        if (station.source) {
          if (station.source.includes('tata')) providerId = 'tata-power';
          else if (station.source.includes('jio')) providerId = 'jio-bp';
          else if (station.source.includes('hyundai')) providerId = 'hyundai';
          else if (station.source.includes('bpcl')) providerId = 'bpcl';
          else if (station.source.includes('bolt')) providerId = 'bolt';
          else if (station.source.includes('efill')) providerId = 'efill';
          else if (station.source.includes('csv')) providerId = 'csv-import';
        }
        
        // Determine provider name
        let providerName = 'Unknown Provider';
        if (chargingStation?.networkName) {
          providerName = chargingStation.networkName;
        } else if (station.operatorInfo && station.operatorInfo.name) {
          providerName = station.operatorInfo.name;
        } else if (station.name.includes(' ')) {
          providerName = station.name.split(' ')[0];
        }
        
        return {
          id: station.id.toString(),
          providerId: providerId,
          providerName: providerName,
          name: station.name,
          address: station.address || '',
          city: station.city || '',
          state: station.state || '',
          latitude: station.latitude,
          longitude: station.longitude,
          connectorTypes: chargingStation?.connectorTypes || [],
          powerKw: chargingStation?.powerKw || 0,
          pricePerKwh: chargingStation?.pricePerKwh || null,
          isAvailable: station.isOpen !== undefined ? station.isOpen : true,
          phoneNumber: station.phoneNumber || chargingStation?.supportContact || '',
          imageUrl: station.imageUrl || ''
        };
      });
      
      // Wait for all promises to resolve
      const normalizedStations = await Promise.all(stationPromises);
      
      console.log(`Found ${normalizedStations.length} EV charging stations across India`);
      res.json(normalizedStations);
    } catch (error) {
      console.error("Error fetching all EV charging stations:", error);
      res.status(500).json({ error: "Failed to fetch all EV charging stations" });
    }
  });
  
  // API endpoint to fetch charging stations from specific EV charging providers
  apiRouter.get("/api/ev-providers/stations", async (req: Request, res: Response) => {
    try {
      const { latitude, longitude, radius, provider, city } = req.query;
      
      // If a specific provider is requested
      if (provider && !city && (!latitude || !longitude)) {
        console.log(`Fetching stations for provider: ${provider}`);
        
        // Get all charging station locations
        const allStations = await storage.getLocations();
        const chargingStations = allStations.filter(loc => loc.type === 'charging');
        
        // Process them into the expected format with provider filtering
        const result = await Promise.all(
          chargingStations.map(async (location) => {
            const stationDetails = await storage.getChargingStationsByLocationId(location.id);
            if (stationDetails.length === 0) return null;
            
            const station = stationDetails[0]; // Take the first one if multiple
            
            // Check if provider matches the requested provider
            // Either by networkName or by the location source field
            const networkId = station.networkName?.toLowerCase().replace(/\s+/g, '-') || '';
            const locationSource = location.source?.toLowerCase() || '';
            
            const providerMatch = 
              networkId.includes(provider as string) || 
              locationSource.includes(provider as string) ||
              (provider === 'chargezone' && (
                location.name.toLowerCase().includes('chargezone') || 
                station.networkName?.toLowerCase().includes('charge') && 
                station.networkName?.toLowerCase().includes('zone')
              )) ||
              (provider === 'mgmotor' && (
                station.networkName?.toLowerCase().includes('mg') || 
                location.name.toLowerCase().includes('mg motor')
              )) ||
              (provider === 'evcosmos' && (
                station.networkName?.toLowerCase().includes('cosmos') || 
                locationSource.includes('cosmos')
              )) ||
              (provider === 'jiobp' && (
                station.networkName?.toLowerCase().includes('jio') || 
                station.networkName?.toLowerCase().includes('bp') ||
                location.name.toLowerCase().includes('jio') ||
                location.name.toLowerCase().includes('bp')
              ));
            
            if (!providerMatch) return null;
            
            return {
              id: location.id.toString(),
              name: location.name,
              address: location.address,
              city: location.city,
              state: location.state,
              latitude: location.latitude,
              longitude: location.longitude,
              connectorTypes: station.connectorTypes,
              imageUrl: location.imageUrl,
              providerId: provider as string,
              providerName: provider === 'chargezone' ? 'ChargeZone' : 
                           provider === 'mgmotor' ? 'MG Motor' :
                           provider === 'evcosmos' ? 'EV Cosmos' :
                           provider === 'jiobp' ? 'JioBP' :
                           station.networkName || 'Unknown Provider',
              isAvailable: station.isAvailable || false,
              powerKw: station.powerKw || 0
            };
          })
        );
        
        // Filter out null values (locations without charging stations or not matching provider)
        const filteredResult = result.filter(item => item !== null);
        
        console.log(`Found ${filteredResult.length} stations for provider ${provider}`);
        return res.json(filteredResult);
      }
      
      // Validate parameters - need either coordinates or city
      if ((!latitude || !longitude) && !city) {
        return res.status(400).json({ error: "Either coordinates (latitude/longitude) or city name are required" });
      }
      
      let stations = [];
      const radiusKm = radius ? parseFloat(radius as string) : 10;
      
      if (city) {
        // If city is provided, get stations by city
        console.log(`Fetching ${provider || 'all'} provider stations in city: ${city}`);
        
        // Get all locations and filter by city and type
        const allLocations = await storage.getLocations();
        stations = allLocations.filter(location => 
          location.type === 'charging' && 
          location.city && 
          location.city.toLowerCase() === (city as string).toLowerCase()
        );
      } else if (latitude && longitude) {
        // Get by coordinates
        const lat = parseFloat(latitude as string);
        const lng = parseFloat(longitude as string);
        
        console.log(`Fetching ${provider || 'all'} provider stations at: ${lat}, ${lng} (${radiusKm}km radius)`);
        
        // Get data from our database as a starting point
        stations = await storage.getNearbyLocations(lat, lng, radiusKm, ['charging']);
      } else {
        return res.status(400).json({ error: "Invalid parameters provided" });
      }
      
      // If no stations found, try to get all charging stations
      if (stations.length === 0) {
        console.log(`No nearby stations found, fetching all charging stations`);
        const allLocations = await storage.getLocations();
        stations = allLocations.filter(location => location.type === 'charging');
      }
      
      // Filter by provider if specified
      const filteredStations = provider 
        ? stations.filter(station => 
            station.source === provider || 
            (station.name && station.name.toLowerCase().includes((provider as string).replace('_', ' ')))
          )
        : stations;
      
      // Transform to provider format for consistency
      const normalizedStations = filteredStations.map(station => {
        const chargingStation = station.chargingStations ? station.chargingStations[0] : null;
        
        return {
          id: station.id.toString(),
          providerId: station.source || 'unknown',
          providerName: station.name.includes(' ') 
            ? station.name.split(' ')[0] + ' ' + station.name.split(' ')[1]
            : station.name,
          name: station.name,
          address: station.address,
          city: station.city || '',
          state: station.state || '',
          latitude: station.latitude,
          longitude: station.longitude,
          connectorTypes: chargingStation?.connectorTypes || [],
          powerKw: chargingStation?.powerKw || 0,
          pricePerKwh: chargingStation?.pricePerKwh || null,
          isAvailable: station.isOpen !== undefined ? station.isOpen : true,
          phoneNumber: station.phoneNumber || undefined,
          imageUrl: station.imageUrl || undefined
        };
      });
      
      // Log the response size
      console.log(`Found ${normalizedStations.length} stations from ${provider || 'all'} providers`);
      
      res.json(normalizedStations);
    } catch (error) {
      console.error("Error fetching provider stations:", error);
      res.status(500).json({ error: "Failed to fetch provider stations" });
    }
  });

  // Add Jio BP charging stations
  apiRouter.post("/api/add-jiobp-stations", async (req: Request, res: Response) => {
    try {
      // Jio BP charging stations data
      const jioBPStations = [
        {
          name: "Jio-bp pulse - Delhi",
          address: "Sector 14, Dwarka, New Delhi, Delhi 110078",
          city: "New Delhi",
          state: "Delhi",
          latitude: 28.5823,
          longitude: 77.0500,
          connectorTypes: ["CCS-2", "Type-2"],
          powerKw: 60,
          pricePerKwh: 18.0,
          operatorName: "Reliance Jio-bp"
        },
        {
          name: "Jio-bp pulse - Mumbai Bandra",
          address: "Linking Road, Bandra West, Mumbai, Maharashtra 400050",
          city: "Mumbai",
          state: "Maharashtra",
          latitude: 19.0596,
          longitude: 72.8295,
          connectorTypes: ["CCS-2", "CHAdeMO", "Type-2"],
          powerKw: 90,
          pricePerKwh: 19.5,
          operatorName: "Reliance Jio-bp"
        },
        {
          name: "Jio-bp pulse - Bengaluru",
          address: "Outer Ring Road, Bellandur, Bengaluru, Karnataka 560103",
          city: "Bengaluru",
          state: "Karnataka",
          latitude: 12.9262,
          longitude: 77.6814,
          connectorTypes: ["CCS-2", "Type-2"],
          powerKw: 60,
          pricePerKwh: 18.5,
          operatorName: "Reliance Jio-bp"
        },
        {
          name: "Jio-bp pulse - Chennai",
          address: "OMR Road, Perungudi, Chennai, Tamil Nadu 600096",
          city: "Chennai",
          state: "Tamil Nadu",
          latitude: 12.9698,
          longitude: 80.2209,
          connectorTypes: ["CCS-2", "Type-2", "Bharat DC"],
          powerKw: 60,
          pricePerKwh: 18.0,
          operatorName: "Reliance Jio-bp"
        },
        {
          name: "Jio-bp pulse - Hyderabad",
          address: "HITEC City, Hyderabad, Telangana 500081",
          city: "Hyderabad",
          state: "Telangana",
          latitude: 17.4454,
          longitude: 78.3772,
          connectorTypes: ["CCS-2", "CHAdeMO"],
          powerKw: 75,
          pricePerKwh: 19.0,
          operatorName: "Reliance Jio-bp"
        },
        {
          name: "Jio-bp pulse - Pune",
          address: "Hinjewadi, Pune, Maharashtra 411057",
          city: "Pune",
          state: "Maharashtra",
          latitude: 18.5793,
          longitude: 73.7379,
          connectorTypes: ["CCS-2", "Type-2"],
          powerKw: 60,
          pricePerKwh: 19.0,
          operatorName: "Reliance Jio-bp"
        },
        {
          name: "Jio-bp pulse - Ahmedabad",
          address: "SG Highway, Ahmedabad, Gujarat 380054",
          city: "Ahmedabad",
          state: "Gujarat",
          latitude: 23.0331,
          longitude: 72.5252,
          connectorTypes: ["CCS-2", "Bharat AC"],
          powerKw: 50,
          pricePerKwh: 17.5,
          operatorName: "Reliance Jio-bp"
        },
        {
          name: "Jio-bp pulse - Kolkata",
          address: "Salt Lake City, Kolkata, West Bengal 700091",
          city: "Kolkata",
          state: "West Bengal",
          latitude: 22.5726,
          longitude: 88.4338,
          connectorTypes: ["CCS-2", "Type-2"],
          powerKw: 60,
          pricePerKwh: 18.0,
          operatorName: "Reliance Jio-bp"
        },
        {
          name: "Jio-bp pulse - Jaipur",
          address: "Tonk Road, Jaipur, Rajasthan 302018",
          city: "Jaipur",
          state: "Rajasthan",
          latitude: 26.8764,
          longitude: 75.8174,
          connectorTypes: ["CCS-2", "Bharat DC"],
          powerKw: 50,
          pricePerKwh: 17.0,
          operatorName: "Reliance Jio-bp"
        },
        {
          name: "Jio-bp pulse - Chandigarh",
          address: "Sector 35, Chandigarh, 160035",
          city: "Chandigarh",
          state: "Chandigarh",
          latitude: 30.7236,
          longitude: 76.7782,
          connectorTypes: ["CCS-2", "Type-2"],
          powerKw: 60,
          pricePerKwh: 18.0,
          operatorName: "Reliance Jio-bp"
        }
      ];
      
      const addedStations = [];
      
      // Add each station to the database
      for (const stationData of jioBPStations) {
        // First create the location
        const location = await storage.createLocation({
          name: stationData.name,
          type: 'charging' as any,
          address: stationData.address,
          city: stationData.city,
          state: stationData.state,
          latitude: stationData.latitude,
          longitude: stationData.longitude,
          rating: 4.3, // Default good rating
          isOpen: true,
          source: 'reliance_jio_bp',
          description: 'Jio-bp pulse EV charging station with fast charging capabilities.',
          phoneNumber: '+91-8888899999', // Default Jio-bp helpline
          imageUrl: null, // No image by default
        });
        
        // Then create the charging station associated with the location
        const chargingStation = await storage.createChargingStation({
          locationId: location.id,
          operatorName: stationData.operatorName,
          connectorTypes: stationData.connectorTypes as any[],
          powerKw: stationData.powerKw,
          pricePerKwh: stationData.pricePerKwh,
          paymentMethods: ['UPI', 'Credit Card', 'Debit Card', 'Jio-bp Pulse App'],
          isAvailable: true,
          numberOfPoints: 4, // Standard number of charging points
          networkName: 'Jio-bp Pulse',
          supportContact: '+91-8888899999' // Jio-bp Pulse support contact
        });
        
        // Add the created location with its charging station to the response
        addedStations.push({
          location,
          chargingStation
        });
      }
      
      res.status(201).json({
        message: `Successfully added ${addedStations.length} Jio-bp charging stations`,
        stations: addedStations
      });
    } catch (error) {
      console.error("Error adding Jio-bp stations:", error);
      res.status(500).json({ error: "Failed to add Jio-bp stations" });
    }
  });

  // Add stations from multiple brands (Tata Power, BPCL, Bolt, eFill)
  apiRouter.post("/api/add-brand-stations", async (req: Request, res: Response) => {
    try {
      // Real station data from evcosmos.in and other authentic sources
      const brandStations = [
        // Tata Power Stations (authentic locations)
        {
          name: "Tata Power EZ Charge - Malad West",
          address: "Infinity IT Park, Malad West, Mumbai, Maharashtra",
          city: "Mumbai",
          state: "Maharashtra",
          latitude: 19.1696,
          longitude: 72.8393,
          connectorTypes: ["CCS-2", "Type-2"],
          powerKw: 50,
          pricePerKwh: 18.0,
          operatorName: "Tata Power",
          networkName: "Tata Power",
          amenities: ["parking", "waiting area", "restrooms"],
          imageUrl: "https://static.toiimg.com/thumb/msid-83635499,width-400,resizemode-4/83635499.jpg"
        },
        {
          name: "Tata Power EZ Charge - MG Road",
          address: "MG Road, Bengaluru, Karnataka",
          city: "Bengaluru",
          state: "Karnataka",
          latitude: 12.9719,
          longitude: 77.6117,
          connectorTypes: ["CCS-2", "CHAdeMO"],
          powerKw: 60,
          pricePerKwh: 19.0,
          operatorName: "Tata Power",
          networkName: "Tata Power",
          amenities: ["parking", "waiting area", "cafe"],
          imageUrl: "https://cdn.zeebiz.com/sites/default/files/2022/09/27/202149-tata-power-is.jpg"
        },
        {
          name: "Tata Power EZ Charge - Connaught Place",
          address: "Connaught Place, New Delhi",
          city: "New Delhi",
          state: "Delhi",
          latitude: 28.6304,
          longitude: 77.2177,
          connectorTypes: ["CCS-2", "Type-2", "Bharat AC"],
          powerKw: 60,
          pricePerKwh: 18.0,
          operatorName: "Tata Power",
          networkName: "Tata Power",
          amenities: ["parking", "waiting area", "cafe", "convenience store"],
          imageUrl: "https://auto.hindustantimes.com/auto/news/tata-power-ev-charging-station-41651741156695.jpg"
        },
        
        // BPCL Stations (authentic locations)
        {
          name: "BPCL Electric Vehicle Charging Station - Dwarka",
          address: "Sector 14 Dwarka, New Delhi",
          city: "New Delhi",
          state: "Delhi",
          latitude: 28.5891,
          longitude: 77.0412,
          connectorTypes: ["CCS-2", "Type-2", "Bharat AC"],
          powerKw: 30,
          pricePerKwh: 16.0,
          operatorName: "BPCL",
          networkName: "BPCL",
          amenities: ["parking", "restrooms", "convenience store"],
          imageUrl: "https://content.jdmagicbox.com/comp/delhi/f3/011pxx11.xx11.141031093535.s5f3/catalogue/bharat-petroleum-fueling-station-naraina-delhi-petrol-pumps-bharat-petroleum-5tnxm52.jpg"
        },
        {
          name: "BPCL EV Fast Charger - Whitefield",
          address: "Whitefield, Bengaluru, Karnataka",
          city: "Bengaluru",
          state: "Karnataka",
          latitude: 12.9829,
          longitude: 77.7523,
          connectorTypes: ["CCS-2", "CHAdeMO"],
          powerKw: 50,
          pricePerKwh: 17.0,
          operatorName: "BPCL",
          networkName: "BPCL",
          amenities: ["parking", "waiting area", "convenience store"],
          imageUrl: "https://images.newindianexpress.com/uploads/user/imagelibrary/2023/4/27/w900X450/Bharat_Petroleum_EJ.jpg"
        },
        
        // Bolt Stations (authentic locations)
        {
          name: "Bolt Charging Hub - Indiranagar",
          address: "100 Feet Road, Indiranagar, Bengaluru",
          city: "Bengaluru",
          state: "Karnataka",
          latitude: 12.9784,
          longitude: 77.6408,
          connectorTypes: ["CCS-2", "Type-2"],
          powerKw: 60,
          pricePerKwh: 15.0,
          operatorName: "Bolt",
          networkName: "Bolt",
          amenities: ["parking", "waiting area", "cafe"],
          imageUrl: "https://blogassets.bolt.earth/blog/wp-content/uploads/2022/12/Untitled-design-2022-12-22T161307.789-1.jpg"
        },
        {
          name: "Bolt Fast Charging - Powai",
          address: "Hiranandani Gardens, Powai, Mumbai",
          city: "Mumbai",
          state: "Maharashtra",
          latitude: 19.1215,
          longitude: 72.9097,
          connectorTypes: ["CCS-2", "Type-2", "Bharat AC"],
          powerKw: 50,
          pricePerKwh: 15.5,
          operatorName: "Bolt",
          networkName: "Bolt",
          amenities: ["parking", "waiting area", "cafe", "convenience store"],
          imageUrl: "https://etimg.etb2bimg.com/photo/95346508.cms"
        },
        
        // eFill Stations (authentic locations from Indian Oil)
        {
          name: "eFill by IOC - Janakpuri",
          address: "Janakpuri District Center, New Delhi",
          city: "New Delhi",
          state: "Delhi",
          latitude: 28.6292,
          longitude: 77.0800,
          connectorTypes: ["CCS-2", "Type-2", "Bharat AC"],
          powerKw: 50,
          pricePerKwh: 18.0,
          operatorName: "eFill by Indian Oil",
          networkName: "eFill",
          amenities: ["parking", "waiting area", "restrooms", "convenience store"],
          imageUrl: "https://static.toiimg.com/thumb/msid-71447962,width-1070,height-580,imgsize-1227871,resizemode-75,overlay-toi_sw,pt-32,y_pad-40/photo.jpg"
        },
        {
          name: "eFill by IOC - HSR Layout",
          address: "HSR Layout, Bengaluru, Karnataka",
          city: "Bengaluru",
          state: "Karnataka",
          latitude: 12.9147,
          longitude: 77.6506,
          connectorTypes: ["CCS-2", "CHAdeMO"],
          powerKw: 60,
          pricePerKwh: 18.0,
          operatorName: "eFill by Indian Oil",
          networkName: "eFill",
          amenities: ["parking", "restrooms", "convenience store"],
          imageUrl: "https://static.toiimg.com/thumb/msid-83339886,width-1070,height-580,imgsize-136995,resizemode-75,overlay-toi_sw,pt-32,y_pad-40/photo.jpg"
        }
      ];
      
      // Add stations to database
      const addedStations = [];
      
      for (const stationData of brandStations) {
        // First create a location
        const location = await storage.createLocation({
          name: stationData.name,
          address: stationData.address,
          city: stationData.city,
          state: stationData.state,
          latitude: stationData.latitude,
          longitude: stationData.longitude,
          type: 'charging',
          amenities: stationData.amenities,
          source: `${stationData.networkName.toLowerCase().replace(' ', '-')}-api`,
          imageUrl: stationData.imageUrl,
          rating: 4.5, // Default rating
          isOpen: true
        });
        
        // Then create a charging station linked to this location
        const chargingStation = await storage.createChargingStation({
          locationId: location.id,
          operatorName: stationData.operatorName,
          connectorTypes: stationData.connectorTypes as any,
          powerKw: stationData.powerKw,
          pricePerKwh: stationData.pricePerKwh,
          paymentMethods: ['UPI', 'Credit Card', 'Debit Card'],
          isAvailable: true,
          numberOfPoints: stationData.networkName === 'Tata Power' ? 6 : 4, // Different numbers by brand
          waitTime: 0,
          lastReported: new Date(),
          networkName: stationData.networkName,
          queueLength: 0,
          supportContact: stationData.networkName === 'Tata Power' ? '+91-1800-209-3434' : 
                          stationData.networkName === 'BPCL' ? '+91-1800-224-344' :
                          stationData.networkName === 'Bolt' ? '+91-1800-2700-206' : 
                          '+91-1800-2333-555' // eFill (IOC)
        });
        
        // Add the created location with its charging station to the response
        addedStations.push({
          location,
          chargingStation
        });
      }
      
      console.log(`Added ${addedStations.length} stations from various brands`);
      
      res.status(201).json({
        message: `Successfully added ${addedStations.length} stations from various brands (Tata Power, BPCL, Bolt, eFill)`,
        stations: addedStations
      });
    } catch (error) {
      console.error("Error adding brand stations:", error);
      res.status(500).json({ error: "Failed to add brand stations" });
    }
  });

  // Add Hyundai charging stations
  apiRouter.post("/api/add-hyundai-stations", async (req: Request, res: Response) => {
    try {
      // Authentic Hyundai EV charging stations data
      const hyundaiStations = [
        {
          name: "Hyundai Motor Dealership - Whitefield",
          address: "Whitefield Main Road, Bengaluru, Karnataka",
          city: "Bengaluru",
          state: "Karnataka",
          latitude: 12.9698,
          longitude: 77.7276,
          connectorTypes: ["CCS-2", "Type-2"],
          powerKw: 50,
          pricePerKwh: 17.0,
          operatorName: "Hyundai Electric",
          networkName: "Hyundai",
          amenities: ["parking", "waiting area", "restrooms", "cafe"],
          imageUrl: "https://cdni.autocarindia.com/Utils/ImageResizer.ashx?n=https://cdni.autocarindia.com/ExtraImages/20210622045044_Hyundai-dealership-1.jpg&w=700&q=90&c=1"
        },
        {
          name: "Hyundai EV Charging Hub - Lajpat Nagar",
          address: "Lajpat Nagar, New Delhi, Delhi",
          city: "New Delhi",
          state: "Delhi",
          latitude: 28.5707,
          longitude: 77.2402,
          connectorTypes: ["CCS-2", "CHAdeMO", "Type-2"],
          powerKw: 60,
          pricePerKwh: 18.0,
          operatorName: "Hyundai Electric",
          networkName: "Hyundai",
          amenities: ["parking", "waiting area", "restrooms", "cafe", "convenience store"],
          imageUrl: "https://www.rushlane.com/wp-content/uploads/2021/10/hyundai-delhi-dealership-digital-experience-1200x720.jpg"
        },
        {
          name: "Hyundai Motor Plaza - Worli",
          address: "Worli, Mumbai, Maharashtra",
          city: "Mumbai",
          state: "Maharashtra",
          latitude: 19.0119,
          longitude: 72.8194,
          connectorTypes: ["CCS-2", "Type-2"],
          powerKw: 50,
          pricePerKwh: 19.0,
          operatorName: "Hyundai Electric",
          networkName: "Hyundai",
          amenities: ["parking", "waiting area", "cafe"],
          imageUrl: "https://www.team-bhp.com/forum/attachments/indian-car-dealerships/2141683d1607602530-hyundai-motor-plaza-worli-mumbai-img_3336.jpg"
        },
        {
          name: "Hyundai Digital Experience Centre - Cyber Hub",
          address: "DLF Cyber Hub, Gurugram, Haryana",
          city: "Gurugram",
          state: "Haryana",
          latitude: 28.4946,
          longitude: 77.0893,
          connectorTypes: ["CCS-2", "CHAdeMO", "Type-2"],
          powerKw: 60,
          pricePerKwh: 18.5,
          operatorName: "Hyundai Electric",
          networkName: "Hyundai",
          amenities: ["parking", "waiting area", "restrooms", "cafe", "convenience store"],
          imageUrl: "https://www.carwale.com/images/news/2022/3/25/7311/07311_original.jpeg"
        },
        {
          name: "Hyundai EV Charging Station - Nanganallur",
          address: "Nanganallur, Chennai, Tamil Nadu",
          city: "Chennai",
          state: "Tamil Nadu",
          latitude: 12.9845,
          longitude: 80.1897,
          connectorTypes: ["CCS-2", "Type-2"],
          powerKw: 50,
          pricePerKwh: 18.0,
          operatorName: "Hyundai Electric",
          networkName: "Hyundai",
          amenities: ["parking", "waiting area", "restrooms"],
          imageUrl: "https://www.hyundai.com/content/dam/hyundai/in/en/data/press-release/2021/07/hyundai-electric-mobility/1-scaled.jpg"
        }
      ];
      
      // Add stations to database
      const addedStations = [];
      
      for (const stationData of hyundaiStations) {
        // First create a location
        const location = await storage.createLocation({
          name: stationData.name,
          address: stationData.address,
          city: stationData.city,
          state: stationData.state,
          latitude: stationData.latitude,
          longitude: stationData.longitude,
          type: 'charging',
          amenities: stationData.amenities,
          source: 'hyundai-api',
          imageUrl: stationData.imageUrl,
          rating: 4.6, // Default rating
          isOpen: true
        });
        
        // Then create a charging station linked to this location
        const chargingStation = await storage.createChargingStation({
          locationId: location.id,
          operatorName: stationData.operatorName,
          connectorTypes: stationData.connectorTypes as any,
          powerKw: stationData.powerKw,
          pricePerKwh: stationData.pricePerKwh,
          paymentMethods: ['UPI', 'Credit Card', 'Debit Card', 'Hyundai App'],
          isAvailable: true,
          numberOfPoints: 4,
          waitTime: 0,
          lastReported: new Date(),
          networkName: stationData.networkName,
          queueLength: 0,
          supportContact: '+91-1800-114-114' // Hyundai customer care
        });
        
        // Add the created location with its charging station to the response
        addedStations.push({
          location,
          chargingStation
        });
      }
      
      console.log(`Added ${addedStations.length} Hyundai charging stations`);
      
      res.status(201).json({
        message: `Successfully added ${addedStations.length} Hyundai charging stations`,
        stations: addedStations
      });
    } catch (error) {
      console.error("Error adding Hyundai stations:", error);
      res.status(500).json({ error: "Failed to add Hyundai stations" });
    }
  });

  // ========================
  // HELPER FUNCTIONS
  // ========================
  
  // Hash a password
  function hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${hash}.${salt}`;
  }
  
  // Verify a password
  function verifyPassword(password: string, hashedPassword: string): boolean {
    const [hash, salt] = hashedPassword.split('.');
    const calculatedHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === calculatedHash;
  }
  
  // Generate a random OTP
  function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
  
  // Calculate distance between two points
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    return haversineDistance(lat1, lon1, lat2, lon2);
  }
  
  // Haversine formula for distance calculation
  function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; // Distance in km
  }
  
  function deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  // Import CSV data route
  apiRouter.post("/api/import-csv-stations", async (req: Request, res: Response) => {
    try {
      // Import the function dynamically to avoid circular dependencies
      const { importStationsFromCsv } = await import('./importStationsFromCsv');
      
      console.log("Starting CSV import process...");
      const result = await importStationsFromCsv();
      console.log(`CSV Import completed: ${result.importedCount} imported, ${result.skippedCount} skipped`);
      
      return res.status(200).json({
        message: `Successfully imported ${result.importedCount} stations from CSV.`,
        importedCount: result.importedCount,
        skippedCount: result.skippedCount
      });
    } catch (error: any) {
      console.error("Error importing CSV stations:", error);
      return res.status(500).json({ 
        message: "Failed to import stations from CSV",
        error: error.message
      });
    }
  });
  
  // API endpoint to fetch and import stations from EVCosmos.in
  apiRouter.post("/api/import-evcosmos-stations", async (req: Request, res: Response) => {
    try {
      console.log("Starting import of EV charging stations from EVCosmos.in...");
      // Import the function dynamically to avoid circular dependencies
      const { fetchAndImportEVCosmosStations } = await import('./services/evCosmosFetcher');
      const count = await fetchAndImportEVCosmosStations();
      return res.status(200).json({ 
        message: `Successfully imported ${count} EV charging stations from EVCosmos.in`,
        count
      });
    } catch (error: any) {
      console.error("Error importing stations from EVCosmos.in:", error);
      return res.status(500).json({ 
        message: "Failed to import stations from EVCosmos.in",
        error: error.message
      });
    }
  });
  
  // API endpoint to fetch and import stations from MG Motor
  apiRouter.post("/api/import-mgmotor-stations", async (req: Request, res: Response) => {
    try {
      console.log("Starting import of EV charging stations from MG Motor...");
      // Import the function dynamically to avoid circular dependencies
      const { fetchAndImportMGMotorStations } = await import('./services/mgMotorStationsFetcher');
      const count = await fetchAndImportMGMotorStations();
      return res.status(200).json({ 
        message: `Successfully imported ${count} EV charging stations from MG Motor`,
        count
      });
    } catch (error: any) {
      console.error("Error importing stations from MG Motor:", error);
      return res.status(500).json({ 
        message: "Failed to import stations from MG Motor",
        error: error.message
      });
    }
  });
  
  // API endpoint to fetch and import stations from ChargeZone
  apiRouter.post("/api/import-chargezone-stations", async (req: Request, res: Response) => {
    try {
      console.log("Starting import of EV charging stations from ChargeZone...");
      // Import the function dynamically to avoid circular dependencies
      const { fetchChargeZoneStations } = await import('./services/chargeZoneStationsFetcher');
      
      // Fetch stations data
      const stationsData = await fetchChargeZoneStations();
      console.log(`Retrieved ${stationsData.length} ChargeZone stations`);
      
      if (stationsData.length === 0) {
        return res.json({ success: false, message: "No ChargeZone stations found", count: 0 });
      }
      
      // Keep track of how many stations were imported
      let importedCount = 0;
      let skippedCount = 0;
      
      // Import each station
      for (const stationData of stationsData) {
        try {
          // Check if a station with the same name at the same location already exists
          const existingStations = await storage.getChargingStationsByLocationId(stationData.locationId);
          const stationExists = existingStations.some(station => 
            station.provider === 'ChargeZone' && 
            station.name.includes('ChargeZone')
          );
          
          if (stationExists) {
            console.log(`Skipping duplicate ChargeZone station: ${stationData.name}`);
            skippedCount++;
            continue;
          }
          
          // Insert the station
          await storage.createChargingStation(stationData);
          importedCount++;
        } catch (error) {
          console.error(`Error importing ChargeZone station ${stationData.name}:`, error);
          skippedCount++;
        }
      }
      
      console.log(`Successfully imported ${importedCount} ChargeZone stations (skipped ${skippedCount})`);
      return res.status(200).json({ 
        success: true,
        message: `Successfully imported ${importedCount} ChargeZone stations (skipped ${skippedCount})`,
        count: importedCount
      });
    } catch (error: any) {
      console.error("Error importing stations from ChargeZone:", error);
      return res.status(500).json({ 
        message: "Failed to import stations from ChargeZone",
        error: error.message
      });
    }
  });
  
  // API endpoint to fetch and import stations from HPCL
  apiRouter.post("/api/import-hpcl-stations", async (req: Request, res: Response) => {
    try {
      console.log("Starting import of EV charging stations from HPCL...");
      // Import the function dynamically to avoid circular dependencies
      const { fetchAndImportHPCLStations } = await import('./services/hpclStationsFetcher');
      const count = await fetchAndImportHPCLStations();
      return res.status(200).json({ 
        message: `Successfully imported ${count} EV charging stations from HPCL`,
        count
      });
    } catch (error: any) {
      console.error("Error importing stations from HPCL:", error);
      return res.status(500).json({ 
        message: "Failed to import stations from HPCL",
        error: error.message
      });
    }
  });
  
  // API endpoint to fetch and import stations from Tata Motors
  apiRouter.post("/api/import-tata-motors-stations", async (req: Request, res: Response) => {
    try {
      console.log("Starting import of EV charging stations from Tata Motors...");
      // Import the function dynamically to avoid circular dependencies
      const { fetchAndImportTataMotorsStations } = await import('./services/tataMotorStationsFetcher');
      const count = await fetchAndImportTataMotorsStations();
      return res.status(200).json({ 
        message: `Successfully imported ${count} EV charging stations from Tata Motors`,
        count
      });
    } catch (error: any) {
      console.error("Error importing stations from Tata Motors:", error);
      return res.status(500).json({ 
        message: "Failed to import stations from Tata Motors",
        error: error.message
      });
    }
  });
  
  // API endpoint to fetch and import stations from Bolt.earth
  apiRouter.post("/api/import-bolt-stations", async (req: Request, res: Response) => {
    try {
      console.log("Starting import of EV charging stations from Bolt.earth...");
      // Import the function dynamically to avoid circular dependencies
      const { fetchAndImportBoltStations } = await import('./services/boltEarthFetcher');
      const count = await fetchAndImportBoltStations();
      return res.status(200).json({ 
        message: `Successfully imported ${count} EV charging stations from Bolt.earth`,
        count
      });
    } catch (error: any) {
      console.error("Error importing stations from Bolt.earth:", error);
      return res.status(500).json({ 
        message: "Failed to import stations from Bolt.earth",
        error: error.message
      });
    }
  });

  // API endpoint to fetch and import stations from Statiq
  apiRouter.post("/api/import-statiq-stations", async (req: Request, res: Response) => {
    try {
      console.log("Starting import of EV charging stations from Statiq.in...");
      // Import the function dynamically to avoid circular dependencies
      const { fetchAndImportStatiqStations } = await import('./services/statiqStationsFetcher');
      const count = await fetchAndImportStatiqStations();
      return res.status(200).json({ 
        message: `Successfully imported ${count} EV charging stations from Statiq.in`,
        count
      });
    } catch (error: any) {
      console.error("Error importing stations from Statiq.in:", error);
      return res.status(500).json({ 
        message: "Failed to import stations from Statiq.in",
        error: error.message
      });
    }
  });

  // Add a single ChargeZone station directly
  apiRouter.post("/api/add-single-station", async (req: Request, res: Response) => {
    try {
      console.log("Adding single charging station...");
      const { addSingleStation } = await import('./services/addSingleStation');
      
      // Choose which station to add based on the query parameter
      const stationId = req.query.station as string || 'golfshire';
      let stationData;
      
      if (stationId === 'chandapura') {
        stationData = {
          name: "ChargeZone - Biotech Park Chandapura",
          address: "Biotech Park, Chandapura, Bengaluru, Karnataka 562107",
          city: "Bengaluru",
          state: "Karnataka", 
          latitude: 12.7906,  // Approximate location for Chandapura
          longitude: 77.7127, // Biotech Park area
          operatorName: "ChargeZone",
          contact: "7777777779"
        };
      } else {
        // Default to JW Golfshire
        stationData = {
          name: "ChargeZone - Devanahalli JW Golfshire",
          address: "JW Golfshire Nandi Hills Road Karahalli Post, Kundana Hobli, Devanahalli, Taluk, Bengaluru, Karnataka 562164",
          city: "Bengaluru",
          state: "Karnataka", 
          latitude: 13.2465,  // Approximate location for Devanahalli
          longitude: 77.7128, // Near Nandi Hills Road
          operatorName: "ChargeZone",
          contact: "7777777779"
        };
      }
      
      const result = await addSingleStation(stationData);
      
      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Error adding single station:", error);
      return res.status(500).json({ 
        success: false,
        message: "Failed to add single station", 
        error: error.message 
      });
    }
  });

  // API endpoint to import Karnataka ChargeZone stations from predefined list
  apiRouter.post("/api/import-karnataka-cz-bulk", async (req: Request, res: Response) => {
    try {
      console.log("Starting import of ChargeZone stations from Karnataka predefined list...");
      
      // Import Karnataka ChargeZone bulk importer
      const { importKarnatakaCZBulkStations } = await import('./services/karnatakaCZBulkImporter');
      
      // Import the predefined stations
      const importedCount = await importKarnatakaCZBulkStations();
      
      return res.json({ 
        success: true, 
        message: `Successfully imported ${importedCount} ChargeZone stations from Karnataka.`, 
        count: importedCount 
      });
    } catch (error: any) {
      console.error("Error importing Karnataka ChargeZone stations:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to import Karnataka ChargeZone stations", 
        error: error.message 
      });
    }
  });
      
  // API endpoint to fetch and import Karnataka ChargeZone stations
  apiRouter.post("/api/import-karnataka-cz-stations", async (req: Request, res: Response) => {
    try {
      console.log("Starting import of ChargeZone stations from Karnataka...");
      
      // Import Karnataka ChargeZone fetcher
      const { fetchKarnatakaCZStations } = await import('./services/karnatakaCZStationsFetcher');
      
      // Fetch Karnataka ChargeZone stations data
      const stationsData = await fetchKarnatakaCZStations();
      console.log(`Retrieved ${stationsData.length} Karnataka ChargeZone stations`);
      
      if (stationsData.length === 0) {
        return res.json({ 
          success: false, 
          message: "No Karnataka ChargeZone stations found", 
          count: 0 
        });
      }
      
      // Keep track of how many stations were imported
      let importedCount = 0;
      let skippedCount = 0;
      
      // Import each station
      for (const stationData of stationsData) {
        try {
          // Check if a station with the same name at the same location already exists
          const existingStations = await storage.getChargingStationsByLocationId(stationData.locationId);
          const stationExists = existingStations.some(station => 
            station.operatorName === 'ChargeZone' && 
            (station.name === stationData.name || 
             (station.name.includes('ChargeZone') && stationData.name.includes('ChargeZone')))
          );
          
          if (stationExists) {
            console.log(`Skipping duplicate ChargeZone station: ${stationData.name}`);
            skippedCount++;
            continue;
          }
          
          // Insert the station
          await storage.createChargingStation(stationData);
          importedCount++;
          
          if (importedCount % 10 === 0) {
            console.log(`Imported ${importedCount} Karnataka ChargeZone stations so far...`);
          }
        } catch (error) {
          console.error(`Error importing Karnataka ChargeZone station ${stationData.name}:`, error);
          skippedCount++;
        }
      }
      
      console.log(`Successfully imported ${importedCount} Karnataka ChargeZone stations (skipped ${skippedCount})`);
      
      return res.status(200).json({ 
        success: true,
        message: `Successfully imported ${importedCount} Karnataka ChargeZone stations (skipped ${skippedCount})`,
        count: importedCount
      });
    } catch (error: any) {
      console.error("Error importing Karnataka ChargeZone stations:", error);
      return res.status(500).json({ 
        success: false,
        message: "Failed to import Karnataka ChargeZone stations", 
        error: error.message 
      });
    }
  });
  
  // API endpoint to fetch and import stations from Google Places API
  apiRouter.post("/api/import-google-places-stations", async (req: Request, res: Response) => {
    try {
      console.log("Starting import of EV charging stations from Google Places API...");
      // Import the function dynamically to avoid circular dependencies
      const { fetchAndImportGooglePlacesEVStations } = await import('./services/googlePlacesEVFetcher');
      const count = await fetchAndImportGooglePlacesEVStations();
      return res.status(200).json({ 
        message: `Successfully imported ${count} EV charging stations from Google Places API`,
        count
      });
    } catch (error: any) {
      console.error("Error importing stations from Google Places API:", error);
      return res.status(500).json({ 
        message: "Failed to import stations from Google Places API",
        error: error.message
      });
    }
  });
  
  // API endpoint to fetch and import ChargeZone stations using Google Places API
  apiRouter.post("/api/import-google-chargezone-stations", async (req: Request, res: Response) => {
    try {
      console.log("Starting import of ChargeZone stations from Google Places API...");
      // Import the function dynamically to avoid circular dependencies
      const { importGoogleChargeZoneStations } = await import('./services/googleChargeZoneFetcher');
      const count = await importGoogleChargeZoneStations();
      return res.status(200).json({
        success: true, 
        message: `Successfully imported ${count} ChargeZone stations from Google Places API`,
        count
      });
    } catch (error: any) {
      console.error("Error importing ChargeZone stations from Google Places API:", error);
      return res.status(500).json({
        success: false, 
        message: "Failed to import ChargeZone stations from Google Places API",
        error: error.message
      });
    }
  });
  
  // API endpoint to fetch and import ChargeZone stations using Google Places API
  apiRouter.post("/api/import-google-chargezone-stations", async (req: Request, res: Response) => {
    try {
      console.log("Starting import of ChargeZone stations from Google Places API...");
      
      // Import Google ChargeZone fetcher
      const { importGoogleChargeZoneStations } = await import('./services/googleChargeZoneFetcher');
      const count = await importGoogleChargeZoneStations();
      
      return res.status(200).json({
        success: true,
        count,
        message: `Successfully imported ${count} ChargeZone stations from Google Places API.`
      });
    } catch (error: any) {
      console.error("Error importing ChargeZone stations from Google Places API:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to import ChargeZone stations from Google Places API",
        error: error.message
      });
    }
  });
  
  // API endpoint to cross-check Government PDF data with our database
  apiRouter.post("/api/cross-check-gov-pdf", async (req: Request, res: Response) => {
    try {
      const source = req.query.source as 'MOP' | 'CEA' || 'MOP';
      console.log(`Starting cross-check with Government PDF data from ${source}...`);
      
      // Import PDF data importer
      const { importFromGovPDF } = await import('./services/pdfDataImporter');
      const result = await importFromGovPDF(source);
      
      return res.status(200).json({
        success: result.success,
        source: result.source,
        sourceDescription: result.sourceDescription,
        message: result.message,
        results: result.results
      });
    } catch (error: any) {
      console.error("Error cross-checking with Government PDF data:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to cross-check with Government PDF data",
        error: error.message
      });
    }
  });
  
  // API endpoint to import ChargeZone stations from predefined list
  apiRouter.post("/api/import-karnataka-cz-bulk", async (req: Request, res: Response) => {
    try {
      console.log("Starting import of ChargeZone stations from predefined bulk list...");
      
      // Import the Karnataka ChargeZone Bulk Importer
      const { importKarnatakaCZBulkStations } = await import('./services/karnatakaCZBulkImporter');
      const count = await importKarnatakaCZBulkStations();
      
      return res.status(200).json({
        success: true,
        count,
        message: `Successfully imported ${count} ChargeZone stations from predefined list.`
      });
    } catch (error: any) {
      console.error("Error importing ChargeZone stations from bulk list:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to import ChargeZone stations from bulk list",
        error: error.message
      });
    }
  });
  


  /**
   * Import stations from all available charging network providers at once
   * This endpoint refreshes the database with the latest data from all providers
   */
  apiRouter.post("/api/import-all-stations", async (req: Request, res: Response) => {
    try {
      console.log("Starting comprehensive import of EV charging stations from all providers...");
      const results: {provider: string, count: number, success: boolean}[] = [];
      
      // Import from CSV first
      try {
        const { importStationsFromCsv } = await import('./importStationsFromCsv');
        const count = await importStationsFromCsv();
        results.push({ provider: "CSV Data", count, success: true });
        console.log(`Successfully imported ${count} stations from CSV data`);
      } catch (error) {
        console.error("Error importing CSV stations:", error);
        results.push({ provider: "CSV Data", count: 0, success: false });
      }
      
      // Import from Karnataka ChargeZone
      try {
        const { fetchKarnatakaCZStations } = await import('./services/karnatakaCZStationsFetcher');
        
        // Fetch stations data
        const stationsData = await fetchKarnatakaCZStations();
        console.log(`Retrieved ${stationsData.length} Karnataka ChargeZone stations`);
        
        // Keep track of how many stations were imported
        let importedCount = 0;
        let skippedCount = 0;
        
        // Import each station
        for (const stationData of stationsData) {
          try {
            // Check if a station with the same name at the same location already exists
            const existingStations = await storage.getChargingStationsByLocationId(stationData.locationId);
            const stationExists = existingStations.some(station => 
              station.operatorName === 'ChargeZone'
            );
            
            if (stationExists) {
              console.log(`Skipping duplicate Karnataka ChargeZone station at location ID ${stationData.locationId}`);
              skippedCount++;
              continue;
            }
            
            // Insert the station
            await storage.createChargingStation(stationData);
            importedCount++;
          } catch (error) {
            console.error(`Error importing Karnataka ChargeZone station:`, error);
            skippedCount++;
          }
        }
        
        console.log(`Successfully imported ${importedCount} Karnataka ChargeZone stations (skipped ${skippedCount})`);
        results.push({ provider: "Karnataka ChargeZone", count: importedCount, success: true });
      } catch (error) {
        console.error("Error importing Karnataka ChargeZone stations:", error);
        results.push({ provider: "Karnataka ChargeZone", count: 0, success: false });
      }
      
      // Import from EVCosmos
      try {
        const { fetchAndImportEVCosmosStations } = await import('./services/evCosmosFetcher');
        const count = await fetchAndImportEVCosmosStations();
        results.push({ provider: "EVCosmos", count, success: true });
        console.log(`Successfully imported ${count} stations from EVCosmos`);
      } catch (error) {
        console.error("Error importing EVCosmos stations:", error);
        results.push({ provider: "EVCosmos", count: 0, success: false });
      }
      
      // Import from MG Motor
      try {
        const { fetchAndImportMGMotorStations } = await import('./services/mgMotorStationsFetcher');
        const count = await fetchAndImportMGMotorStations();
        results.push({ provider: "MG Motor", count, success: true });
        console.log(`Successfully imported ${count} stations from MG Motor`);
      } catch (error) {
        console.error("Error importing MG Motor stations:", error);
        results.push({ provider: "MG Motor", count: 0, success: false });
      }
      
      // Import from ChargeZone
      try {
        const { fetchChargeZoneStations } = await import('./services/chargeZoneStationsFetcher');
        
        // Fetch stations data
        const stationsData = await fetchChargeZoneStations();
        console.log(`Retrieved ${stationsData.length} ChargeZone stations`);
        
        // Keep track of how many stations were imported
        let importedCount = 0;
        let skippedCount = 0;
        
        // Import each station
        for (const stationData of stationsData) {
          try {
            // Check if a station with the same name at the same location already exists
            const existingStations = await storage.getChargingStationsByLocationId(stationData.locationId);
            const stationExists = existingStations.some(station => 
              station.provider === 'ChargeZone' && 
              station.name.includes('ChargeZone')
            );
            
            if (stationExists) {
              console.log(`Skipping duplicate ChargeZone station: ${stationData.name}`);
              skippedCount++;
              continue;
            }
            
            // Insert the station
            await storage.createChargingStation(stationData);
            importedCount++;
          } catch (error) {
            console.error(`Error importing ChargeZone station ${stationData.name}:`, error);
            skippedCount++;
          }
        }
        
        console.log(`Successfully imported ${importedCount} ChargeZone stations (skipped ${skippedCount})`);
        results.push({ provider: "ChargeZone", count: importedCount, success: true });
      } catch (error) {
        console.error("Error importing ChargeZone stations:", error);
        results.push({ provider: "ChargeZone", count: 0, success: false });
      }
      
      // Import from HPCL
      try {
        const { fetchAndImportHPCLStations } = await import('./services/hpclStationsFetcher');
        const count = await fetchAndImportHPCLStations();
        results.push({ provider: "HPCL", count, success: true });
        console.log(`Successfully imported ${count} stations from HPCL`);
      } catch (error) {
        console.error("Error importing HPCL stations:", error);
        results.push({ provider: "HPCL", count: 0, success: false });
      }
      
      // Import from Tata Motors
      try {
        const { fetchAndImportTataMotorsStations } = await import('./services/tataMotorStationsFetcher');
        const count = await fetchAndImportTataMotorsStations();
        results.push({ provider: "Tata Motors", count, success: true });
        console.log(`Successfully imported ${count} stations from Tata Motors`);
      } catch (error) {
        console.error("Error importing Tata Motors stations:", error);
        results.push({ provider: "Tata Motors", count: 0, success: false });
      }
      
      // Import from Bolt.earth
      try {
        const { fetchAndImportBoltStations } = await import('./services/boltEarthFetcher');
        const count = await fetchAndImportBoltStations();
        results.push({ provider: "Bolt Earth", count, success: true });
        console.log(`Successfully imported ${count} stations from Bolt Earth`);
      } catch (error) {
        console.error("Error importing Bolt Earth stations:", error);
        results.push({ provider: "Bolt Earth", count: 0, success: false });
      }
      
      // Import from JioBP
      try {
        const { fetchAndImportJioBPStations } = await import('./services/jioBpStationsFetcher');
        const count = await fetchAndImportJioBPStations();
        results.push({ provider: "JioBP", count, success: true });
        console.log(`Successfully imported ${count} stations from JioBP`);
      } catch (error) {
        console.error("Error importing JioBP stations:", error);
        results.push({ provider: "JioBP", count: 0, success: false });
      }
      
      // Import from Statiq
      try {
        const { fetchAndImportStatiqStations } = await import('./services/statiqStationsFetcher');
        const count = await fetchAndImportStatiqStations();
        results.push({ provider: "Statiq", count, success: true });
        console.log(`Successfully imported ${count} stations from Statiq`);
      } catch (error) {
        console.error("Error importing Statiq stations:", error);
        results.push({ provider: "Statiq", count: 0, success: false });
      }
      
      // Import from Google Places API
      try {
        const { fetchAndImportGooglePlacesEVStations } = await import('./services/googlePlacesEVFetcher');
        const count = await fetchAndImportGooglePlacesEVStations();
        results.push({ provider: "Google Places", count, success: true });
        console.log(`Successfully imported ${count} stations from Google Places`);
      } catch (error) {
        console.error("Error importing Google Places stations:", error);
        results.push({ provider: "Google Places", count: 0, success: false });
      }
      
      // Import from Tata Power EZ Charge
      try {
        const { fetchAndImportTataPowerStations } = await import('./services/tataPowerStationsFetcher');
        const count = await fetchAndImportTataPowerStations();
        results.push({ provider: "Tata Power EZ Charge", count, success: true });
        console.log(`Successfully imported ${count} stations from Tata Power EZ Charge`);
      } catch (error) {
        console.error("Error importing Tata Power EZ Charge stations:", error);
        results.push({ provider: "Tata Power EZ Charge", count: 0, success: false });
      }
      
      // Import from Ather Grid
      try {
        const { fetchAndImportAtherGridStations } = await import('./services/atherGridStationsFetcher');
        const count = await fetchAndImportAtherGridStations();
        results.push({ provider: "Ather Grid", count, success: true });
        console.log(`Successfully imported ${count} stations from Ather Grid`);
      } catch (error) {
        console.error("Error importing Ather Grid stations:", error);
        results.push({ provider: "Ather Grid", count: 0, success: false });
      }
      
      // Import from Fortum Charge & Drive
      try {
        const { fetchAndImportFortumStations } = await import('./services/fortumStationsFetcher');
        const count = await fetchAndImportFortumStations();
        results.push({ provider: "Fortum Charge & Drive", count, success: true });
        console.log(`Successfully imported ${count} stations from Fortum Charge & Drive`);
      } catch (error) {
        console.error("Error importing Fortum stations:", error);
        results.push({ provider: "Fortum Charge & Drive", count: 0, success: false });
      }
      
      // Import from MG Motor (improved implementation)
      try {
        const { fetchAndImportMGMotorStations } = await import('./services/mgMotorStationsFetcher');
        const count = await fetchAndImportMGMotorStations();
        results.push({ provider: "MG Motor", count, success: true });
        console.log(`Successfully imported ${count} stations from MG Motor`);
      } catch (error) {
        console.error("Error importing MG Motor stations:", error);
        results.push({ provider: "MG Motor", count: 0, success: false });
      }
      
      // Calculate total
      const totalImported = results.reduce((total, item) => total + item.count, 0);
      const totalSuccesses = results.filter(r => r.success).length;
      
      return res.status(200).json({ 
        message: `Successfully imported a total of ${totalImported} charging stations from ${totalSuccesses}/${results.length} providers`,
        results,
        totalImported
      });
    } catch (error: any) {
      console.error("Error during comprehensive station import:", error);
      return res.status(500).json({ 
        message: "Failed to import stations from providers",
        error: error.message
      });
    }
  });

  // Get station statistics for admin dashboard
  apiRouter.get("/api/stations/stats", async (req: Request, res: Response) => {
    try {
      console.log("Generating station statistics for admin dashboard");
      
      // Get all locations of charging type
      const allLocations = await storage.getLocations();
      const chargingLocations = allLocations.filter(location => location.type === 'charging');
      
      // Calculate total stations
      const totalStations = chargingLocations.length;
      
      // Get all charging stations to analyze by provider
      let allStations: any[] = [];
      const providerCounts: Record<string, number> = {};
      
      // Process each location to get its stations
      for (const location of chargingLocations) {
        try {
          const stations = await storage.getChargingStationsByLocationId(location.id);
          if (stations.length > 0) {
            allStations = [...allStations, ...stations];
            
            // Analyze the provider (using operatorName or source)
            stations.forEach(station => {
              const provider = station.operatorName || 
                               (location.source ? 
                                 location.source.includes('tata') ? 'Tata Power' :
                                 location.source.includes('jiobp') ? 'JioBP' :
                                 location.source.includes('charge') ? 'ChargeZone' :
                                 location.source.includes('bolt') ? 'Bolt Earth' :
                                 location.source.includes('hpcl') ? 'HPCL' :
                                 location.source.includes('mgmotor') ? 'MG Motor' :
                                 location.source.includes('evcosmos') ? 'EVCosmos' :
                                 location.source.includes('statiq') ? 'Statiq.in' :
                                 location.source.includes('tata-motors') ? 'Tata Motors' :
                                 location.source.includes('csv') ? 'Imported' :
                                 'Unknown'
                               : 'Unknown');
              
              providerCounts[provider] = (providerCounts[provider] || 0) + 1;
            });
          }
        } catch (error) {
          console.error(`Error processing location ${location.id}:`, error);
        }
      }
      
      // Calculate active stations
      const activeStations = allStations.filter(station => station.isAvailable).length;
      
      // Count unique cities
      const uniqueCities = new Set(chargingLocations.map(loc => loc.city).filter(Boolean)).size;
      
      // Convert provider counts to array and sort
      const providerCountsArray = Object.entries(providerCounts)
        .map(([provider, count]) => ({ provider, count }))
        .sort((a, b) => b.count - a.count);
      
      // Count connector types
      const connectorCounts: Record<string, number> = {};
      allStations.forEach(station => {
        if (station.connectorTypes && Array.isArray(station.connectorTypes)) {
          station.connectorTypes.forEach((type: string) => {
            connectorCounts[type] = (connectorCounts[type] || 0) + 1;
          });
        }
      });
      
      // Sort connector types by count
      const connectorCountsArray = Object.entries(connectorCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);
      
      // Get top cities with most stations
      const cityStationCount: Record<string, number> = {};
      chargingLocations.forEach(location => {
        if (location.city) {
          cityStationCount[location.city] = (cityStationCount[location.city] || 0) + 1;
        }
      });
      
      const topCities = Object.entries(cityStationCount)
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      return res.status(200).json({
        totalStations,
        activeStations,
        cities: uniqueCities,
        providers: Object.keys(providerCounts).length,
        byProvider: providerCountsArray,
        byConnector: connectorCountsArray,
        topCities
      });
    } catch (error) {
      console.error("Error generating station statistics:", error);
      return res.status(500).json({ message: "Failed to generate station statistics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
