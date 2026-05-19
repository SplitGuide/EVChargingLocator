import { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Circle, Polyline, Polygon } from '@react-google-maps/api';
import { Zap, Navigation, MapPin, Map as MapIcon, Upload, Trash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { loadKmzFile, KmlFeature } from '@/lib/kmzLoader';

// Map container styles
const containerStyle = {
  width: '100%',
  height: '100%'
};

// Define marker icon type that matches Google Maps API
interface MarkerIcon {
  url: string;
  scaledSize: any; // Will be set to google.maps.Size when Google Maps is loaded
}

// Function to create marker icons with proper Size objects
// Create a marker icon - will properly initialize google.maps.Size when maps is loaded
const createMarkerIcon = (url: string, width: number, height: number, maps?: any): MarkerIcon => ({
  url,
  scaledSize: maps ? new maps.Size(width, height) : { width, height }
});

// Marker styles for different types - will be initialized after Google Maps loads
let markerIcons: Record<string, MarkerIcon> = {
  station: { url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png", scaledSize: { width: 40, height: 40 } },
  nearby: { url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png", scaledSize: { width: 32, height: 32 } },
  user: { url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png", scaledSize: { width: 36, height: 36 } },
  restaurant: { url: "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png", scaledSize: { width: 32, height: 32 } },
  hotel: { url: "https://maps.google.com/mapfiles/ms/icons/purple-dot.png", scaledSize: { width: 32, height: 32 } },
  restroom: { url: "https://maps.google.com/mapfiles/ms/icons/pink-dot.png", scaledSize: { width: 32, height: 32 } },
  busy: { url: "https://maps.google.com/mapfiles/ms/icons/orange-dot.png", scaledSize: { width: 36, height: 36 } },
  kmz: { url: "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png", scaledSize: { width: 30, height: 30 } }
};

// Default center (New Delhi, India)
const defaultCenter = {
  lat: 28.6139,
  lng: 77.2090
};

// Circle options for search radius
const circleOptions = {
  strokeColor: '#0066FF',
  strokeOpacity: 0.8,
  strokeWeight: 1,
  fillColor: '#0066FF',
  fillOpacity: 0.1,
};

interface GoogleMapComponentProps {
  stationLocation: {
    latitude: number;
    longitude: number;
    name: string;
  };
  stationName: string;
  nearbyStations: any[];
  amenities: any[];
  userLocation: [number, number] | null;
  searchRadius: number;
  onLocationFound: (lat: number, lng: number) => void;
  getDirections: (lat: number, lng: number) => void;
  getAmenityLabel: (type: string) => string;
}

function GoogleMapComponent({
  stationLocation,
  stationName,
  nearbyStations,
  amenities,
  userLocation,
  searchRadius,
  onLocationFound,
  getDirections,
  getAmenityLabel
}: GoogleMapComponentProps) {
  const { toast } = useToast();
  const [selectedMarker, setSelectedMarker] = useState<any>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [kmlFeatures, setKmlFeatures] = useState<KmlFeature[]>([]);
  const [isLoadingKmz, setIsLoadingKmz] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Google Maps API
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.GOOGLE_PLACES_API_KEY || '',
    libraries: ['places'],
  });

  // Initial map options
  const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: true,
    fullscreenControl: true,
    styles: [
      {
        featureType: 'poi.business',
        stylers: [{ visibility: 'off' }],
      },
      {
        featureType: 'poi',
        elementType: 'labels.icon',
        stylers: [{ visibility: 'off' }],
      },
    ],
  };

  // Handler for map load
  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMapInstance(map);
  }, []);

  // Handler for map click - close infowindow
  const onMapClick = useCallback(() => {
    setSelectedMarker(null);
  }, []);

  // Get user's current location
  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          
          if (mapInstance) {
            mapInstance.setCenter(userPos);
            mapInstance.setZoom(14);
          }
          
          onLocationFound(userPos.lat, userPos.lng);
        },
        (error) => {
          console.error('Error getting location:', error);
          toast({
            title: 'Location error',
            description: 'Unable to get your current location. Please check browser permissions.',
            variant: 'destructive',
          });
        }
      );
    } else {
      toast({
        title: 'Geolocation not supported',
        description: 'Your browser does not support geolocation.',
        variant: 'destructive',
      });
    }
  }, [mapInstance, onLocationFound, toast]);

  // Initialize marker icons once Google Maps is loaded
  useEffect(() => {
    if (isLoaded && google && google.maps) {
      // Now that Google Maps is loaded, we can initialize our marker icons properly
      markerIcons = {
        station: createMarkerIcon("https://maps.google.com/mapfiles/ms/icons/green-dot.png", 40, 40, google.maps),
        nearby: createMarkerIcon("https://maps.google.com/mapfiles/ms/icons/blue-dot.png", 32, 32, google.maps),
        user: createMarkerIcon("https://maps.google.com/mapfiles/ms/icons/red-dot.png", 36, 36, google.maps),
        restaurant: createMarkerIcon("https://maps.google.com/mapfiles/ms/icons/yellow-dot.png", 32, 32, google.maps),
        hotel: createMarkerIcon("https://maps.google.com/mapfiles/ms/icons/purple-dot.png", 32, 32, google.maps),
        restroom: createMarkerIcon("https://maps.google.com/mapfiles/ms/icons/pink-dot.png", 32, 32, google.maps),
        busy: createMarkerIcon("https://maps.google.com/mapfiles/ms/icons/orange-dot.png", 36, 36, google.maps),
        kmz: createMarkerIcon("https://maps.google.com/mapfiles/ms/icons/yellow-dot.png", 30, 30, google.maps)
      };
      
      // Get user location after icons are initialized
      getCurrentLocation();
    }
  }, [isLoaded, getCurrentLocation]);
  
  // Handle KMZ file upload
  const handleKmzFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      setIsLoadingKmz(true);
      const features = await loadKmzFile(file);
      setKmlFeatures(features);
      
      // If we have features with coordinates, fit the map to show them all
      if (features.length > 0 && mapInstance) {
        // Create bounds that include all features
        const bounds = new google.maps.LatLngBounds();
        
        features.forEach(feature => {
          if (feature.type === 'marker') {
            // For point features
            bounds.extend(feature.coordinates as google.maps.LatLngLiteral);
          } else {
            // For line or polygon features
            (feature.coordinates as google.maps.LatLngLiteral[]).forEach(coord => {
              bounds.extend(coord);
            });
          }
        });
        
        // Fit map to these bounds
        mapInstance.fitBounds(bounds);
        
        toast({
          title: "KMZ file loaded",
          description: `Successfully loaded ${features.length} features from ${file.name}`,
        });
      } else {
        toast({
          title: "KMZ file empty",
          description: "No valid features found in the KMZ file.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading KMZ file:", error);
      toast({
        title: "Error loading KMZ file",
        description: "Failed to load or parse the KMZ file. Please try a different file.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingKmz(false);
      
      // Reset file input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [mapInstance, toast]);
  
  // Clear all KMZ data
  const clearKmzData = useCallback(() => {
    if (kmlFeatures.length > 0) {
      setKmlFeatures([]);
      toast({
        title: "KMZ data cleared",
        description: "All KMZ data has been removed from the map.",
      });
    }
  }, [kmlFeatures.length, toast]);

  // If Maps API fails to load
  if (loadError) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 rounded-md">
        <div className="text-center p-4">
          <p className="text-red-600 font-semibold">Error loading Google Maps</p>
          <p className="text-sm text-gray-600 mt-2">
            {loadError.message || 'Please check your internet connection and try again.'}
          </p>
        </div>
      </div>
    );
  }

  // While Maps API is loading
  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 rounded-md">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading maps...</p>
        </div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={{
        lat: stationLocation.latitude,
        lng: stationLocation.longitude
      }}
      zoom={14}
      options={mapOptions}
      onClick={onMapClick}
      onLoad={onMapLoad}
    >
      {/* Main charging station marker */}
      <Marker
        position={{
          lat: stationLocation.latitude,
          lng: stationLocation.longitude
        }}
        icon={markerIcons.station}
        animation={google.maps.Animation.DROP}
        onClick={() => setSelectedMarker({
          id: 'main-station',
          type: 'main',
          name: stationName,
          lat: stationLocation.latitude,
          lng: stationLocation.longitude
        })}
      />

      {/* User location marker */}
      {userLocation && (
        <>
          <Marker
            position={{
              lat: userLocation[0],
              lng: userLocation[1]
            }}
            icon={markerIcons.user}
            animation={google.maps.Animation.BOUNCE}
            onClick={() => setSelectedMarker({
              id: 'user-location',
              type: 'user',
              name: 'Your Location',
              lat: userLocation[0],
              lng: userLocation[1]
            })}
          />
          
          {/* Search radius circle */}
          <Circle
            center={{
              lat: userLocation[0],
              lng: userLocation[1]
            }}
            radius={searchRadius * 1000} // Convert km to meters
            options={circleOptions}
          />
        </>
      )}

      {/* Nearby station markers */}
      {nearbyStations.map((station) => (
        <Marker
          key={`station-${station.id}`}
          position={{
            lat: station.latitude,
            lng: station.longitude
          }}
          icon={station.isBusy ? markerIcons.busy : markerIcons.nearby}
          animation={station.isBusy ? google.maps.Animation.BOUNCE : undefined}
          onClick={() => setSelectedMarker({
            ...station,
            type: 'station',
            lat: station.latitude,
            lng: station.longitude
          })}
        />
      ))}

      {/* Amenity markers */}
      {amenities.map((amenity) => (
        <Marker
          key={`amenity-${amenity.id}-${amenity.amenityType}`}
          position={{
            lat: amenity.latitude,
            lng: amenity.longitude
          }}
          icon={markerIcons[amenity.amenityType as keyof typeof markerIcons] || markerIcons.nearby}
          onClick={() => setSelectedMarker({
            ...amenity,
            type: 'amenity',
            lat: amenity.latitude, 
            lng: amenity.longitude
          })}
        />
      ))}

      {/* Info windows */}
      {selectedMarker && (
        <InfoWindow
          position={{
            lat: selectedMarker.lat,
            lng: selectedMarker.lng
          }}
          onCloseClick={() => setSelectedMarker(null)}
        >
          <div className="p-2 max-w-[200px]">
            {selectedMarker.type === 'main' && (
              <>
                <h3 className="font-bold text-green-600">{selectedMarker.name}</h3>
                <p className="text-xs">Current charging station</p>
                <Button 
                  size="sm" 
                  className="w-full mt-2 text-xs"
                  onClick={() => getDirections(selectedMarker.lat, selectedMarker.lng)}
                >
                  <Navigation className="h-3 w-3 mr-1" />
                  Directions
                </Button>
              </>
            )}

            {selectedMarker.type === 'user' && (
              <>
                <h3 className="font-bold text-blue-600">{selectedMarker.name}</h3>
                <p className="text-xs text-gray-600">Your current location</p>
              </>
            )}

            {selectedMarker.type === 'station' && (
              <>
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-green-600" />
                  <h3 className="font-bold text-sm">{selectedMarker.name}</h3>
                </div>
                
                {selectedMarker.isBusy && (
                  <Badge variant="outline" className="bg-red-50 text-red-700 text-xs mt-1">
                    Busy
                  </Badge>
                )}
                
                <div className="mt-1 text-xs text-gray-600">
                  <p className="line-clamp-2">{selectedMarker.address}</p>
                  {selectedMarker.distance && (
                    <p className="mt-0.5 font-medium">
                      {selectedMarker.distance.toFixed(1)} km away
                    </p>
                  )}
                </div>
                
                <div className="flex gap-1 mt-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={() => getDirections(selectedMarker.lat, selectedMarker.lng)}
                  >
                    <Navigation className="h-3 w-3 mr-1" />
                    Directions
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={() => window.open(`/stations/${selectedMarker.id}`, "_blank")}
                  >
                    <MapIcon className="h-3 w-3 mr-1" />
                    Details
                  </Button>
                </div>
              </>
            )}

            {selectedMarker.type === 'amenity' && (
              <>
                <div className="mb-1">
                  <Badge className="mb-1" variant="outline">
                    {getAmenityLabel(selectedMarker.amenityType)}
                  </Badge>
                  <h3 className="font-bold text-sm">{selectedMarker.name}</h3>
                </div>
                
                <div className="mt-1 text-xs text-gray-600">
                  <p className="line-clamp-2">{selectedMarker.address}</p>
                  {selectedMarker.distance && (
                    <p className="mt-0.5 font-medium">
                      {selectedMarker.distance.toFixed(1)} km away
                    </p>
                  )}
                </div>
                
                <Button 
                  size="sm" 
                  variant="outline"
                  className="w-full mt-2 text-xs"
                  onClick={() => getDirections(selectedMarker.lat, selectedMarker.lng)}
                >
                  <Navigation className="h-3 w-3 mr-1" />
                  Get Directions
                </Button>
              </>
            )}
            
            {selectedMarker.type === 'kmz' && (
              <>
                <div className="mb-1">
                  <Badge className="mb-1" variant="outline">
                    KMZ Point
                  </Badge>
                  <h3 className="font-bold text-sm">{selectedMarker.name}</h3>
                </div>
                
                {selectedMarker.description && (
                  <div className="mt-1 text-xs text-gray-600">
                    <p className="line-clamp-3">{selectedMarker.description}</p>
                  </div>
                )}
                
                <Button 
                  size="sm" 
                  variant="outline"
                  className="w-full mt-2 text-xs"
                  onClick={() => getDirections(selectedMarker.lat, selectedMarker.lng)}
                >
                  <Navigation className="h-3 w-3 mr-1" />
                  Get Directions
                </Button>
              </>
            )}
          </div>
        </InfoWindow>
      )}

      {/* Render KML features from loaded KMZ file */}
      {kmlFeatures.map((feature, index) => {
        if (feature.type === 'marker') {
          // Create a custom icon for KMZ markers
          const kmzIcon = feature.style?.icon 
            ? { 
                url: feature.style.icon, 
                scaledSize: google && google.maps ? new google.maps.Size(30, 30) : { width: 30, height: 30 } 
              } 
            : markerIcons.kmz;
            
          return (
            <Marker
              key={`kmz-marker-${index}`}
              position={feature.coordinates as google.maps.LatLngLiteral}
              icon={kmzIcon}
              onClick={() => setSelectedMarker({
                id: `kmz-${index}`,
                type: 'kmz',
                name: feature.name || 'KMZ Point',
                description: feature.description,
                lat: (feature.coordinates as google.maps.LatLngLiteral).lat,
                lng: (feature.coordinates as google.maps.LatLngLiteral).lng
              })}
            />
          );
        } else if (feature.type === 'polyline') {
          return (
            <Polyline
              key={`kmz-polyline-${index}`}
              path={feature.coordinates as google.maps.LatLngLiteral[]}
              options={{
                strokeColor: feature.style?.strokeColor || '#FF0000',
                strokeWeight: feature.style?.strokeWeight || 2,
                strokeOpacity: 0.8
              }}
            />
          );
        } else if (feature.type === 'polygon') {
          return (
            <Polygon
              key={`kmz-polygon-${index}`}
              paths={feature.coordinates as google.maps.LatLngLiteral[]}
              options={{
                strokeColor: feature.style?.strokeColor || '#0000FF',
                strokeWeight: feature.style?.strokeWeight || 2,
                strokeOpacity: 0.8,
                fillColor: feature.style?.fillColor || '#0000FF',
                fillOpacity: 0.35
              }}
            />
          );
        }
        return null;
      })}

      {/* Add map controls */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="bg-white shadow-md"
          onClick={getCurrentLocation}
          title="Find my location"
        >
          <MapPin className="h-4 w-4" />
        </Button>
        
        <Button
          size="sm"
          variant="secondary"
          className="bg-white shadow-md"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoadingKmz}
          title="Upload KMZ/KML file"
        >
          {isLoadingKmz ? (
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
        </Button>
        
        {kmlFeatures.length > 0 && (
          <Button
            size="sm"
            variant="secondary"
            className="bg-white shadow-md"
            onClick={clearKmzData}
            title="Clear KMZ data"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </Button>
        )}
        
        {/* Hidden file input for KMZ upload */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleKmzFileUpload}
          accept=".kmz,.kml"
          className="hidden"
        />
      </div>
    </GoogleMap>
  );
}

export default GoogleMapComponent;