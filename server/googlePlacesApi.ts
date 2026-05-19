/**
 * Google Places API Integration
 * 
 * This module provides functions to search and fetch data from Google Places API
 * to enhance our EV charging station database.
 * 
 * API Key required: GOOGLE_PLACES_API_KEY
 */

import axios from 'axios';
import { Storage } from '@google-cloud/storage';
import { Location, ChargingStation } from '@shared/schema';
import { storage } from './storage';

// Base URL for Google Places API
const PLACES_API_BASE_URL = 'https://maps.googleapis.com/maps/api/place';

// Use Google API key from environment variables
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

/**
 * Search for EV charging stations near specified location
 */
export async function searchNearbyChargingStations(
  latitude: number,
  longitude: number,
  radius: number = 5000 // Default 5km radius
): Promise<Location[]> {
  if (!GOOGLE_API_KEY) {
    throw new Error('Google Places API key is not configured');
  }

  try {
    // Search for "electric vehicle charging station" keyword
    const response = await axios.get(`${PLACES_API_BASE_URL}/nearbysearch/json`, {
      params: {
        location: `${latitude},${longitude}`,
        radius: radius,
        keyword: 'electric vehicle charging station',
        key: GOOGLE_API_KEY
      }
    });

    const results = response.data.results;
    const locations: Location[] = [];

    // Process each place and convert to our Location format
    for (const place of results) {
      // Check if this location already exists in our database
      const existingLocation = await storage.getLocationByGooglePlaceId(place.place_id);
      
      if (existingLocation) {
        locations.push(existingLocation);
        continue;
      }

      // Fetch more details about this place
      const details = await getPlaceDetails(place.place_id);
      
      // Create a new location
      const newLocation: Omit<Location, 'id'> = {
        name: place.name,
        type: 'charging',
        address: place.vicinity,
        city: extractCityFromAddress(place.vicinity),
        state: extractStateFromAddress(place.vicinity),
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        rating: place.rating || null,
        imageUrl: place.photos?.[0] ? await getPhotoUrl(place.photos[0].photo_reference) : null,
        imageUrls: place.photos ? await Promise.all(place.photos.slice(0, 5).map(photo => getPhotoUrl(photo.photo_reference))) : [],
        description: details.editorial_summary?.overview || null,
        phoneNumber: details.formatted_phone_number || null,
        isOpen: place.opening_hours?.open_now || false,
        openingHours: details.opening_hours?.weekday_text || null,
        hasParking: details.amenities?.includes('parking') || false,
        hasRestroom: details.amenities?.includes('restroom') || false,
        hasFoodCourt: details.amenities?.includes('restaurant') || false,
        hasWifi: details.amenities?.includes('wifi') || false,
        isPublic: true,
        amenities: extractAmenities(details),
        reviews: details.reviews?.map(review => ({
          rating: review.rating,
          text: review.text,
          author: review.author_name,
          time: new Date(review.time * 1000)
        })) || [],
        source: 'google',
        googlePlaceId: place.place_id,
        priceLevel: place.price_level || null
      };

      // Add to database
      const savedLocation = await storage.createLocation(newLocation);
      locations.push(savedLocation);

      // Create the charging station entry associated with this location
      await createChargingStationFromGooglePlace(savedLocation.id, details);
    }

    return locations;

  } catch (error) {
    console.error('Error searching Google Places API:', error);
    throw new Error('Failed to search Google Places API');
  }
}

/**
 * Get detailed information about a specific place
 */
async function getPlaceDetails(placeId: string) {
  if (!GOOGLE_API_KEY) {
    throw new Error('Google Places API key is not configured');
  }

  try {
    const response = await axios.get(`${PLACES_API_BASE_URL}/details/json`, {
      params: {
        place_id: placeId,
        fields: 'name,formatted_address,formatted_phone_number,opening_hours,editorial_summary,review,website,photo,address_component,user_ratings_total',
        key: GOOGLE_API_KEY
      }
    });

    return response.data.result;
  } catch (error) {
    console.error('Error fetching place details:', error);
    throw new Error('Failed to fetch place details');
  }
}

/**
 * Get photo URL for a place
 */
export async function getPhotoUrl(photoReference: string, maxWidth: number = 800): Promise<string | null> {
  if (!GOOGLE_API_KEY) {
    throw new Error('Google Places API key is not configured');
  }

  try {
    // Use the Places API photo endpoint
    return `${PLACES_API_BASE_URL}/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${GOOGLE_API_KEY}`;
  } catch (error) {
    console.error('Error fetching photo URL:', error);
    return null;
  }
}

/**
 * Get photos for a specific place by ID or by search text
 */
export async function getPlacePhotos(searchParams: { placeId?: string, searchText?: string, location?: { lat: number, lng: number } }): Promise<string[]> {
  if (!GOOGLE_API_KEY) {
    throw new Error('Google Places API key is not configured');
  }

  try {
    let placeDetails;
    
    // If we have a place ID, use it directly
    if (searchParams.placeId) {
      placeDetails = await getPlaceDetails(searchParams.placeId);
    } 
    // Otherwise search for the place by text and location
    else if (searchParams.searchText && searchParams.location) {
      // Find nearby places matching the search text
      const response = await axios.get(`${PLACES_API_BASE_URL}/findplacefromtext/json`, {
        params: {
          input: searchParams.searchText,
          inputtype: 'textquery',
          locationbias: `circle:5000@${searchParams.location.lat},${searchParams.location.lng}`,
          fields: 'place_id',
          key: GOOGLE_API_KEY
        }
      });
      
      if (response.data.candidates && response.data.candidates.length > 0) {
        const topPlaceId = response.data.candidates[0].place_id;
        placeDetails = await getPlaceDetails(topPlaceId);
      }
    }
    
    // If we have photos in the place details, get their URLs
    if (placeDetails && placeDetails.photos && placeDetails.photos.length > 0) {
      const photoUrls = [];
      
      // Get URLs for up to 5 photos
      const maxPhotos = Math.min(5, placeDetails.photos.length);
      for (let i = 0; i < maxPhotos; i++) {
        const photoReference = placeDetails.photos[i].photo_reference;
        const photoUrl = await getPhotoUrl(photoReference);
        if (photoUrl) {
          photoUrls.push(photoUrl);
        }
      }
      
      return photoUrls;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching place photos:', error);
    return [];
  }
}

/**
 * Extract city from address
 */
function extractCityFromAddress(address: string): string {
  // Simple extraction - in production this should be more sophisticated
  const parts = address.split(',');
  return parts.length > 1 ? parts[parts.length - 2].trim() : 'Unknown';
}

/**
 * Extract state from address
 */
function extractStateFromAddress(address: string): string {
  // Simple extraction - in production this should be more sophisticated
  const parts = address.split(',');
  return parts.length > 0 ? parts[parts.length - 1].trim() : 'Unknown';
}

/**
 * Extract amenities from place details
 */
function extractAmenities(details: any): string[] {
  const amenities: string[] = [];
  
  // Check for common amenities in the place details
  if (details.amenities) return details.amenities;
  
  // Otherwise try to extract from other data
  if (details.types?.includes('parking')) amenities.push('parking');
  if (details.types?.includes('restaurant')) amenities.push('restaurant');
  if (details.types?.includes('cafe')) amenities.push('cafe');
  if (details.types?.includes('convenience_store')) amenities.push('convenience store');
  
  return amenities;
}

/**
 * Create a charging station entry from Google place details
 */
async function createChargingStationFromGooglePlace(locationId: number, details: any) {
  // Try to determine connector types based on place details
  const connectorTypes = determineConnectorTypes(details);
  
  // Create charging station
  const chargingStation: Omit<ChargingStation, 'id'> = {
    locationId,
    operatorName: details.name,
    connectorTypes,
    powerKw: estimatePowerFromConnectors(connectorTypes),
    pricePerKwh: null, // Price not available from Google
    paymentMethods: null, // Not available from Google
    isAvailable: details.business_status === 'OPERATIONAL',
    numberOfPoints: estimateNumberOfPoints(details),
    waitTime: null, // Not available from Google
    lastReported: new Date(),
    networkName: determineNetworkName(details.name),
    queueLength: null, // Not available from Google
    supportContact: details.formatted_phone_number || null
  };

  return await storage.createChargingStation(chargingStation);
}

/**
 * Determine connector types based on place details
 * This is best-effort since Google doesn't provide connector specifics
 */
function determineConnectorTypes(details: any): string[] {
  // In a real implementation, this would analyze place details, reviews, photos
  // to try to determine connector types
  
  // For now, we'll make an educated guess based on the place name/description
  const name = details.name?.toLowerCase() || '';
  const types: string[] = [];
  
  if (name.includes('ccs') || name.includes('combo')) types.push('CCS-2');
  if (name.includes('chademo')) types.push('CHAdeMO');
  if (name.includes('type 2') || name.includes('type-2')) types.push('Type-2');
  if (name.includes('bharat ac')) types.push('Bharat AC');
  if (name.includes('bharat dc')) types.push('Bharat DC');
  
  // If we couldn't determine, provide common types in India
  if (types.length === 0) {
    types.push('CCS-2', 'Type-2');
  }
  
  return types;
}

/**
 * Estimate power based on connector types
 */
function estimatePowerFromConnectors(connectorTypes: string[]): number {
  if (connectorTypes.includes('CCS-2')) return 50;
  if (connectorTypes.includes('CHAdeMO')) return 50;
  if (connectorTypes.includes('Bharat DC')) return 15;
  return 7.4; // Default for Type-2 or Bharat AC
}

/**
 * Estimate number of charging points
 */
function estimateNumberOfPoints(details: any): number {
  // In a real implementation, this would analyze reviews, photos
  // For now, return a reasonable default
  return 2;
}

/**
 * Try to determine the charging network name
 */
function determineNetworkName(name: string): string {
  const nameLower = name.toLowerCase();
  
  // Check for known networks in India
  if (nameLower.includes('tata power') || nameLower.includes('tata.ev')) return 'Tata Power';
  if (nameLower.includes('ather')) return 'Ather Grid';
  if (nameLower.includes('fortum')) return 'Fortum';
  if (nameLower.includes('charge zone')) return 'Charge Zone';
  if (nameLower.includes('statiq')) return 'Statiq';
  if (nameLower.includes('kazam')) return 'Kazam';
  if (nameLower.includes('chargemod')) return 'ChargeMOD';
  if (nameLower.includes('jio-bp') || nameLower.includes('jio bp')) return 'Jio-bp Pulse';
  if (nameLower.includes('iocl') || nameLower.includes('indian oil')) return 'Indian Oil';
  if (nameLower.includes('bpcl') || nameLower.includes('bharat petroleum')) return 'BPCL';
  if (nameLower.includes('hpcl') || nameLower.includes('hindustan petroleum')) return 'HP';
  
  return 'Unknown Network';
}