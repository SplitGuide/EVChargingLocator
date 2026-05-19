import { pgTable, text, serial, integer, boolean, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Location type (Charging Station, Restaurant, Hotel, Restroom)
export const locationTypes = ["charging", "restaurant", "hotel", "restroom"] as const;

// Charging connector types
export const connectorTypes = ["CCS-2", "CHAdeMO", "Type-2", "Bharat AC", "Bharat DC"] as const;

// Vehicle types for EV registry
export const vehicleTypes = ["sedan", "suv", "hatchback", "motorcycle"] as const;

// Base location table with common fields for all types
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", { enum: locationTypes }).notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  imageUrl: text("image_url"),
  imageUrls: text("image_urls").array(), // Multiple photos of the location
  description: text("description"),
  rating: doublePrecision("rating"),
  phoneNumber: text("phone_number"),
  isOpen: boolean("is_open").default(true),
  openingHours: text("opening_hours"),
  hasParking: boolean("has_parking").default(false),
  hasRestroom: boolean("has_restroom").default(false),
  hasFoodOption: boolean("has_food").default(false),
  priceLevel: integer("price_level"),
  amenities: text("amenities").array(), // Array of available amenities
  source: text("source"), // Source of data (Google Maps, PlugShare, etc.)
  googlePlaceId: text("google_place_id"), // Google Places API place_id for this location
});

// Specific table for EV charging stations
export const chargingStations = pgTable("charging_stations", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").notNull(),
  operatorName: text("operator_name").notNull(),
  connectorTypes: text("connector_types", { enum: connectorTypes }).array().notNull(),
  powerKw: doublePrecision("power_kw").notNull(),
  pricePerKwh: doublePrecision("price_per_kwh"),
  paymentMethods: text("payment_methods").array(),
  isAvailable: boolean("is_available").default(true),
  numberOfPoints: integer("number_of_points").default(1),
  waitTime: integer("wait_time"), // Estimated wait time in minutes
  lastReported: timestamp("last_reported"), // When the status was last updated
  networkName: text("network_name"), // Charging network (Tata Power, EESL, etc.)
  queueLength: integer("queue_length").default(0), // Number of vehicles in queue
  supportContact: text("support_contact"), // Contact information for support
});

// Vehicle registry for users
export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Link to user
  make: text("make").notNull(), // Manufacturer (Tata, Mahindra, etc.)
  model: text("model").notNull(), // Model name (Nexon EV, XUV400, etc.)
  year: integer("year").notNull(),
  type: text("type", { enum: vehicleTypes }).notNull(),
  batteryCapacityKwh: doublePrecision("battery_capacity_kwh").notNull(),
  rangeKm: integer("range_km").notNull(), // Estimated range in km
  registrationNumber: text("registration_number"), // Vehicle registration number
  connectorTypes: text("connector_types", { enum: connectorTypes }).array().notNull(),
  photo: text("photo"), // Vehicle photo URL
  nickname: text("nickname"), // User's nickname for the vehicle
});

// Travel plans for trip planning
export const travelPlans = pgTable("travel_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Link to user
  vehicleId: integer("vehicle_id").notNull(), // Link to vehicle
  name: text("name").notNull(), // Trip name
  startLocationId: integer("start_location_id"), // Starting point
  endLocationId: integer("end_location_id"), // Destination
  startAddress: text("start_address").notNull(),
  endAddress: text("end_address").notNull(),
  startLatitude: doublePrecision("start_latitude").notNull(),
  startLongitude: doublePrecision("start_longitude").notNull(),
  endLatitude: doublePrecision("end_latitude").notNull(),
  endLongitude: doublePrecision("end_longitude").notNull(),
  totalDistanceKm: doublePrecision("total_distance_km"),
  departureTime: timestamp("departure_time"),
  estimatedArrivalTime: timestamp("estimated_arrival_time"),
  status: text("status").default("planned"), // planned, in-progress, completed
  notes: text("notes"),
  created: timestamp("created").defaultNow(),
});

// Waypoints for travel plans (stops along the route)
export const travelWaypoints = pgTable("travel_waypoints", {
  id: serial("id").primaryKey(),
  travelPlanId: integer("travel_plan_id").notNull(), // Link to travel plan
  locationId: integer("location_id"), // Link to location if it's in our database
  name: text("name").notNull(),
  address: text("address"),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  stopDurationMinutes: integer("stop_duration_minutes"), // Planned stop time
  estimatedArrivalTime: timestamp("estimated_arrival_time"),
  order: integer("order").notNull(), // Sequence in the trip
  type: text("type").default("charging"), // charging, food, rest, attraction, etc.
  notes: text("notes"),
});

// Reviews for locations
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  locationId: integer("location_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  created: timestamp("created").defaultNow(),
  photos: text("photos").array(),
});

// User table for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  phone: text("phone").unique(), // Added phone number field
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  profilePhoto: text("profile_photo"),
  created: timestamp("created").defaultNow(),
  preferences: text("preferences"), // JSON string of user preferences
});

// Schemas for API validation
export const insertLocationSchema = createInsertSchema(locations);
export const insertChargingStationSchema = createInsertSchema(chargingStations);
export const insertVehicleSchema = createInsertSchema(vehicles);
export const insertTravelPlanSchema = createInsertSchema(travelPlans);
export const insertTravelWaypointSchema = createInsertSchema(travelWaypoints);
export const insertUserSchema = createInsertSchema(users, {
  passwordHash: z.string().min(8) // Override validation for password
});
export const insertReviewSchema = createInsertSchema(reviews);

// Custom schema for filtering locations
export const locationFilterSchema = z.object({
  types: z.array(z.enum(locationTypes)).optional(),
  city: z.string().optional(),
  query: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  radius: z.number().optional(),
  amenities: z.array(z.string()).optional(),
  connectorTypes: z.array(z.enum(connectorTypes)).optional(),
  isOpen: z.boolean().optional(),
  minRating: z.number().optional(),
});

// Custom schema for travel planning
export const travelPlanQuerySchema = z.object({
  startLatitude: z.number(),
  startLongitude: z.number(),
  endLatitude: z.number(),
  endLongitude: z.number(),
  vehicleId: z.number().optional(),
  departureTime: z.string().optional(), // ISO datetime string
  includeRestStops: z.boolean().optional().default(true),
  includeFood: z.boolean().optional().default(true),
});

// Type definitions
export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type ChargingStation = typeof chargingStations.$inferSelect;
export type InsertChargingStation = z.infer<typeof insertChargingStationSchema>;
export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type TravelPlan = typeof travelPlans.$inferSelect;
export type InsertTravelPlan = z.infer<typeof insertTravelPlanSchema>;
export type TravelWaypoint = typeof travelWaypoints.$inferSelect;
export type InsertTravelWaypoint = z.infer<typeof insertTravelWaypointSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type LocationFilter = z.infer<typeof locationFilterSchema>;
export type TravelPlanQuery = z.infer<typeof travelPlanQuerySchema>;
// Location photos table
export const locationPhotos = pgTable("location_photos", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").notNull(),
  url: text("url").notNull(),
  source: text("source"), // Source of the photo (user-uploaded, Google Places, etc.)
  caption: text("caption"),
  created: timestamp("created").defaultNow(),
});

// Photo schema for validation
export const insertLocationPhotoSchema = createInsertSchema(locationPhotos, {
  // Ensure nullability for optional fields
  caption: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
});

// Photo type definitions
export type LocationPhoto = typeof locationPhotos.$inferSelect;
export type InsertLocationPhoto = z.infer<typeof insertLocationPhotoSchema>;

export type LocationType = typeof locationTypes[number];
export type ConnectorType = typeof connectorTypes[number];
export type VehicleType = typeof vehicleTypes[number];
