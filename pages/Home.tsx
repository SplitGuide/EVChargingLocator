import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useLocation } from "@/hooks/use-location";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Search, Zap, MapPin, Fuel, ChevronDown, Filter, Phone, Navigation, Mic, Plus } from "lucide-react";
import { StationFiltersComponent } from "@/components/StationFilters";
import { TripPlanner } from "@/components/TripPlanner";
import { VoiceSearch } from "@/components/VoiceSearch";
import { apiRequest, queryClient } from "@/lib/queryClient";


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

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const { userPosition, getCurrentPosition, setCustomLocation, isLoading: isLocationLoading } = useLocation();
  const { toast } = useToast();
  
  // Removed JioBP stations mutation

  // Fetch nearby charging stations from multiple providers based on user location
  const { data: nearbyStations, isLoading: isStationsLoading } = useQuery({
    queryKey: ["/api/ev-providers/stations", userPosition?.latitude, userPosition?.longitude, selectedCity],
    queryFn: async () => {
      // If neither position nor city is available, return empty array
      if (!userPosition && !selectedCity) return [];
      
      const params = new URLSearchParams();
      
      // Add parameters based on what's available
      if (userPosition) {
        params.append('latitude', userPosition.latitude.toString());
        params.append('longitude', userPosition.longitude.toString());
        params.append('radius', "10"); // 10km radius
        
        console.log("Fetching nearby stations at:", 
          `${userPosition.latitude}, ${userPosition.longitude} (${selectedCity || 'Custom location'})`);
      } else if (selectedCity) {
        params.append('city', selectedCity);
        console.log("Fetching stations in city:", selectedCity);
      }
      
      // First try to get data from multiple providers API
      try {
        const response = await fetch(`/api/ev-providers/stations?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch from providers API');
        }
        
        const providerData = await response.json();
        
        // Convert provider data to our app schema
        const stationsWithDistance = providerData.map((station: any) => ({
          id: parseInt(station.id),
          name: station.name,
          type: 'charging' as const,
          address: station.address,
          city: station.city || '',
          state: station.state || '',
          latitude: station.latitude,
          longitude: station.longitude,
          rating: 4.5, // Default rating
          source: station.providerId,
          phoneNumber: station.phoneNumber || null,
          imageUrl: station.imageUrl || null,
          isOpen: station.isAvailable,
          description: `${station.providerName} charging station`,
          distance: 0, // Will be calculated below if userPosition is available
          chargingStations: [{
            id: parseInt(station.id),
            locationId: parseInt(station.id),
            operatorName: station.providerName,
            connectorTypes: station.connectorTypes || [],
            powerKw: station.powerKw || 0,
            pricePerKwh: station.pricePerKwh || null,
            paymentMethods: ['UPI', 'Credit Card'],
            isAvailable: station.isAvailable,
            numberOfPoints: 2,
            waitTime: 0,
            networkName: station.providerName,
            queueLength: 0,
            supportContact: station.phoneNumber || null
          }]
        }));
        
        // Calculate distance if user position is available
        let stationsWithCalculatedDistance = stationsWithDistance;
        if (userPosition) {
          stationsWithCalculatedDistance = stationsWithDistance.map(station => ({
            ...station,
            distance: haversineDistance(
              userPosition.latitude, userPosition.longitude,
              station.latitude, station.longitude
            )
          }));
        }
        
        console.log(`Found ${stationsWithCalculatedDistance.length} stations from providers`);
        return stationsWithCalculatedDistance;
      } catch (error) {
        // Fallback to traditional API if provider API fails
        console.error("Provider API failed, falling back to locations API:", error);
        
        if (userPosition) {
          // Use nearby API with coordinates
          const fallbackParams = new URLSearchParams({
            latitude: userPosition.latitude.toString(),
            longitude: userPosition.longitude.toString(),
            radius: "10", // 10km radius
            types: "charging", // Only get charging type locations
            connectorTypes: "" // Get all connector types for now
          });
          
          const response = await fetch(`/api/locations/nearby?${fallbackParams.toString()}`);
          if (!response.ok) {
            throw new Error('Failed to fetch nearby stations');
          }
          
          const data = await response.json();
          console.log(`Found ${data.length} nearby stations from fallback API`);
          return data;
        } else if (selectedCity) {
          // Use locations API with city filter
          const response = await fetch(`/api/locations?city=${encodeURIComponent(selectedCity)}`);
          if (!response.ok) {
            throw new Error('Failed to fetch city stations');
          }
          
          const data = await response.json();
          console.log(`Found ${data.length} stations in ${selectedCity} from fallback API`);
          return data.filter((location: any) => location.type === 'charging');
        }
        
        return [];
      }
    },
    enabled: !!(userPosition || selectedCity),
  });

  // Fetch popular cities and locations
  const { data: citiesData = [] } = useQuery({
    queryKey: ["/api/cities"],
  });

  // Extract just the city names for easier handling
  const cities = useMemo(() => 
    citiesData
      .filter((item: any) => item.type === 'city')
      .map((item: any) => item.name), 
    [citiesData]
  );

  // Handle search
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Search query is empty",
        description: "Please enter a location or charging station name",
        variant: "destructive",
      });
      return;
    }

    // Create a URLSearchParams object for query building
    const params = new URLSearchParams();
    
    // Add search query
    params.append('query', searchQuery);
    
    // Add city filter if selected
    if (selectedCity) {
      params.append('city', selectedCity);
    }

    // Enhanced city matching logic for any Indian city
    const lowerQuery = searchQuery.toLowerCase();
    
    // First try exact matches in our predefined city list
    let matchedCity = cities.find(city => 
      typeof city === 'string' && city.toLowerCase() === lowerQuery
    );
    
    // If no exact match, try partial matches
    if (!matchedCity) {
      matchedCity = cities.find(city => 
        typeof city === 'string' && city.toLowerCase().includes(lowerQuery)
      );
    }
    
    // If still no match, treat the query as a potential city
    // This allows searching for any city in India, even if not in our predefined list
    if (!matchedCity && lowerQuery.length > 2) {
      // Heuristic: if query is more than 2 chars and seems like a place name
      const isLikelyCity = /^[a-z\s]+$/i.test(searchQuery) && 
                           !searchQuery.includes('charger') && 
                           !searchQuery.includes('station');
      
      if (isLikelyCity) {
        console.log(`Query "${searchQuery}" looks like a city name, treating as city search`);
        matchedCity = searchQuery;
      }
    }
    
    if (matchedCity && matchedCity !== selectedCity) {
      // If the query matches a city and it's not the selected city, update it
      console.log(`Search query "${searchQuery}" matched city: ${matchedCity}`);
      setSelectedCity(matchedCity);
      params.set('city', matchedCity);
      // Remove the query parameter if it's just a city name
      if (searchQuery.toLowerCase() === matchedCity.toLowerCase()) {
        params.delete('query');
      }
    }

    console.log("Searching with params:", params.toString());

    // Fetch locations based on search query with better logging
    fetch(`/api/locations?${params.toString()}`)
      .then(response => {
        if (!response.ok) {
          console.error('Search response error:', response.status, response.statusText);
          throw new Error(`Network response error: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log("Search results:", data);
        
        // Update state with search results
        setSearchResults(data);
        
        // Show appropriate toast based on results
        if (data.length === 0) {
          toast({
            title: "No results found",
            description: `No charging stations found ${selectedCity ? `in ${selectedCity}` : ''} ${(params.has('query') && params.get('query')) ? `matching "${params.get('query')}"` : ''}`.trim(),
            variant: "destructive"
          });
        } else {
          toast({
            title: `Found ${data.length} results`,
            description: `Showing charging stations ${selectedCity ? `in ${selectedCity}` : ''} ${(params.has('query') && params.get('query')) ? `matching "${params.get('query')}"` : ''}`.trim(),
          });
        }
      })
      .catch(error => {
        console.error('Search error:', error);
        toast({
          title: "Search failed",
          description: "Could not retrieve search results",
          variant: "destructive",
        });
      });
  };

  // Handle city selection
  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    console.log("Selected city:", city);
    
    // Update the custom location
    setCustomLocation(city);
    
    // First try to get data from providers API
    fetch(`/api/ev-providers/stations?city=${encodeURIComponent(city)}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Provider API failed, falling back to locations API');
        }
        return response.json();
      })
      .then(providerData => {
        // If we got provider data, convert and use it
        if (providerData && providerData.length > 0) {
          const stationsWithDistance = providerData.map((station: any) => ({
            id: parseInt(station.id),
            name: station.name,
            type: 'charging' as const,
            address: station.address,
            city: station.city || '',
            state: station.state || '',
            latitude: station.latitude,
            longitude: station.longitude,
            rating: 4.5, // Default rating
            source: station.providerId,
            phoneNumber: station.phoneNumber || null,
            imageUrl: station.imageUrl || null,
            isOpen: station.isAvailable,
            description: `${station.providerName} charging station`,
            distance: 0,
            chargingStations: [{
              id: parseInt(station.id),
              locationId: parseInt(station.id),
              operatorName: station.providerName,
              connectorTypes: station.connectorTypes || [],
              powerKw: station.powerKw || 0,
              pricePerKwh: station.pricePerKwh || null,
              paymentMethods: ['UPI', 'Credit Card'],
              isAvailable: station.isAvailable,
              numberOfPoints: 2,
              waitTime: 0,
              networkName: station.providerName,
              queueLength: 0,
              supportContact: station.phoneNumber || null
            }]
          }));
          
          // Update search results with provider data
          setSearchResults(stationsWithDistance);
          console.log(`Found ${stationsWithDistance.length} provider stations in ${city}`);
        } else {
          // If no provider data, fall back to locations API
          throw new Error('No provider stations found');
        }
      })
      .catch(error => {
        console.error('Provider API error:', error);
        
        // Fallback to traditional locations API
        fetch(`/api/locations?city=${encodeURIComponent(city)}`)
          .then(response => {
            if (!response.ok) {
              throw new Error('Network response was not ok');
            }
            return response.json();
          })
          .then(data => {
            // Update state with search results
            setSearchResults(data);
            console.log(`Found ${data.length} traditional stations in ${city}`);
          })
          .catch(error => {
            console.error('City filter error:', error);
            toast({
              title: "Filter failed",
              description: "Could not filter locations by city",
              variant: "destructive",
            });
          });
      });
  };

  // Handle filter selection
  const handleFilterSelect = (filter: string) => {
    setSelectedFilter(filter);
    // Implement filter logic
    console.log("Selected filter:", filter);
  };

  // Handle refresh location
  const handleRefreshLocation = () => {
    getCurrentPosition();
    toast({
      title: "Refreshing location",
      description: "Updating your current location...",
    });
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-green-600">EV Charging Station Finder</h1>
        <p className="text-gray-600">Find charging stations across India for your electric vehicle</p>
      </header>

      {/* Search and Filters */}
      <div className="mb-6">
        <div className="flex gap-2 mb-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              type="text"
              placeholder="Search for location or charging station"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch} className="transition-all duration-300 hover:scale-105">Search</Button>
          <VoiceSearch 
            onSearch={(searchTerm) => {
              setSearchQuery(searchTerm);
              // Slight delay to ensure state updates before search
              setTimeout(() => handleSearch(), 100);
            }}
            onNavigate={(destination, params) => {
              // Handle navigation to destination
              if (params.nearest) {
                // Find nearest station and navigate to it
                handleRefreshLocation();
                // Wait for location to update
                setTimeout(() => {
                  if (nearbyStations && nearbyStations.length > 0) {
                    // Sort by distance and navigate to nearest
                    const nearest = [...nearbyStations].sort((a, b) => a.distance - b.distance)[0];
                    if (nearest) {
                      window.open(`/stations/${nearest.id}`, "_blank");
                    }
                  }
                }, 1000);
              } else {
                // If station name is provided, search for it
                setSearchQuery(destination);
                setTimeout(() => handleSearch(), 100);
              }
            }}
            onFilter={(filters) => {
              // Apply the filters
              if (filters.includes('restaurants')) {
                setSelectedFilter('restaurants');
              } else if (filters.includes('hotels')) {
                setSelectedFilter('hotels');
              } else if (filters.includes('restrooms')) {
                setSelectedFilter('restrooms');
              }
            }}
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline" 
            onClick={handleRefreshLocation}
            disabled={isLocationLoading}
            className="flex items-center gap-1"
          >
            {isLocationLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
            Near Me
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-1">
                <Fuel className="h-4 w-4" />
                {selectedCity || "Popular Cities"}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {cities.length > 0 ? (
                cities.map((city: any) => (
                  <DropdownMenuItem key={city} onClick={() => handleCitySelect(city)}>
                    {city}
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>No cities available</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Integrated StationFilters Component */}
          <StationFiltersComponent 
            onFilterChange={(filters) => {
              console.log("Applied filters:", filters);
              
              // Create query string from filters
              const queryParams = new URLSearchParams();
              
              // Add network filters as types
              if (filters.networks.length > 0) {
                queryParams.append('types', filters.networks.join(','));
              }
              
              // Add connector types
              if (filters.connectors.length > 0) {
                queryParams.append('connectorTypes', filters.connectors.join(','));
              }
              
              // Add min power filter
              if (filters.minPower > 0) {
                queryParams.append('minPower', filters.minPower.toString());
              }
              
              // Add max price filter
              if (filters.maxPrice < 30) {
                queryParams.append('maxPrice', filters.maxPrice.toString());
              }
              
              // Add min rating filter
              if (filters.minRating > 0) {
                queryParams.append('minRating', filters.minRating.toString());
              }
              
              // Add facility filters
              if (filters.facilities.length > 0) {
                queryParams.append('amenities', filters.facilities.join(','));
              }
              
              // Add availability filter - isOpen
              if (filters.availability.includes('available')) {
                queryParams.append('isOpen', 'true');
              }
              
              // Add city filter if selected
              if (selectedCity) {
                queryParams.append('city', selectedCity);
              }
              
              // Make API request with filters
              fetch(`/api/locations?${queryParams.toString()}`)
                .then(response => {
                  if (!response.ok) {
                    throw new Error('Network response was not ok');
                  }
                  return response.json();
                })
                .then(data => {
                  setSearchResults(data);
                })
                .catch(error => {
                  console.error('Filter error:', error);
                  toast({
                    title: "Filter failed",
                    description: "Could not apply filters to locations",
                    variant: "destructive",
                  });
                });
            }} 
          />
          
          {/* Integrated Trip Planner Component */}
          <TripPlanner />
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Search Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.map((location) => {
              // Get charging station details if available
              const chargingStation = location.type === 'charging' ? 
                location.chargingStations?.[0] : null;
                
              return (
                <StationCard
                  key={location.id}
                  id={location.id}
                  name={location.name}
                  address={`${location.address}, ${location.city}`}
                  distance={0} // Distance is unknown for search results
                  available={location.isOpen || true}
                  connectors={chargingStation?.connectorTypes || []}
                  powerKw={chargingStation?.powerKw || 0}
                  rating={location.rating || 0}
                  price={chargingStation?.pricePerKwh}
                  imageUrl={location.imageUrl}
                  phoneNumber={location.phoneNumber}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Nearby Stations List */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Nearby Charging Stations</h2>
        </div>
        
        {isStationsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !userPosition ? (
          <div className="bg-yellow-50 p-4 rounded-md">
            <p className="text-amber-800">
              Please enable location services to see nearby charging stations
            </p>
            <Button
              onClick={getCurrentPosition}
              variant="outline"
              className="mt-2"
              size="sm"
            >
              Enable Location
            </Button>
          </div>
        ) : nearbyStations?.length === 0 ? (
          <div className="bg-gray-50 p-6 rounded-md text-center">
            <p className="text-gray-500">No charging stations found nearby</p>
            <p className="text-sm text-gray-400 mt-1">Try searching in a different area</p>
          </div>
        ) : (
          <div>
            {/* Google Places Search component removed */}
          
            {nearbyStations && nearbyStations.length > 0 ? (
              // Show actual nearby stations
              nearbyStations.map((station) => {
                // Get charging station details if available
                const chargingStation = station.type === 'charging' ? 
                  station.chargingStations?.[0] : null;
                  
                return (
                  <StationCard
                    key={station.id}
                    id={station.id}
                    name={station.name}
                    address={`${station.address}, ${station.city || ''}`}
                    distance={station.distance || 0}
                    available={station.isOpen !== undefined ? station.isOpen : true}
                    connectors={chargingStation?.connectorTypes || station.connectorTypes || []}
                    powerKw={chargingStation?.powerKw || station.powerKw || 0}
                    rating={station.rating || 0}
                    price={chargingStation?.pricePerKwh}
                    imageUrl={station.imageUrl}
                    phoneNumber={station.phoneNumber}
                  />
                );
              })
            ) : (
              // Fallback message if no stations found in API response
              <div className="col-span-3 bg-gray-50 p-6 rounded-md text-center">
                <p className="text-gray-500">No charging stations found nearby</p>
                <p className="text-sm text-gray-400 mt-1">Try searching in a different area</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Charging Station Card Component
function StationCard({ 
  id, 
  name, 
  address, 
  distance, 
  available, 
  connectors,
  powerKw,
  rating,
  price,
  imageUrl,
  phoneNumber,
  latitude,
  longitude
}: { 
  id: number; 
  name: string; 
  address: string; 
  distance: number; 
  available: boolean; 
  connectors: string[];
  powerKw: number;
  rating: number;
  price?: number;
  imageUrl?: string;
  phoneNumber?: string;
  latitude?: number;
  longitude?: number;
}) {
  return (
    <Card className="h-full overflow-hidden">
      {/* Image Section */}
      <div className="h-40 w-full relative">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <Zap className="h-12 w-12 text-gray-400" />
          </div>
        )}
        <div className={`absolute top-3 right-3 px-2 py-1 rounded text-xs text-white ${available ? 'bg-green-500' : 'bg-red-500'}`}>
          {available ? 'Available' : 'In Use'}
        </div>
      </div>
      
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{name}</CardTitle>
            <CardDescription>{address}</CardDescription>
          </div>
          {rating > 0 && (
            <div className="flex items-center bg-yellow-50 px-1.5 py-0.5 rounded">
              <span className="text-sm font-medium">{rating}</span>
              <span className="text-yellow-500 ml-1">★</span>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="flex flex-wrap gap-1 mb-2">
          {connectors && connectors.length > 0 ? (
            connectors.map((connector) => (
              <span 
                key={connector} 
                className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
              >
                {connector}
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-xs">No connector info</span>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <div className="text-gray-500">Distance</div>
            <div>{distance.toFixed(1)} km</div>
          </div>
          <div>
            <div className="text-gray-500">Power</div>
            <div>{powerKw > 0 ? `${powerKw} kW` : 'N/A'}</div>
          </div>
          <div>
            <div className="text-gray-500">Price</div>
            <div className="text-green-700 font-medium">
              {price ? `₹${price}/kWh` : 'N/A'}
            </div>
          </div>
        </div>
        
        {/* Phone number display */}
        {phoneNumber && (
          <div className="mt-2 flex items-center gap-1 text-sm">
            <Phone className="h-3 w-3 text-blue-600" />
            <a href={`tel:${phoneNumber}`} className="text-blue-600 hover:underline">
              {phoneNumber}
            </a>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex gap-2">
        <Link href={`/stations/${id}`} className="flex-1">
          <Button className="w-full">View Details</Button>
        </Link>
        
        {/* Directions button */}
        <a 
          href={
            latitude && longitude
              ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
              : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
          }
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0"
        >
          <Button variant="outline" size="icon">
            <Navigation className="h-4 w-4" />
          </Button>
        </a>
      </CardFooter>
    </Card>
  );
}