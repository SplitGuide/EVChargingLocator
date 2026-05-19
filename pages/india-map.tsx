import React, { useEffect, useState } from 'react';
import { Loader2, ZoomIn, ZoomOut, MapPin, Filter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { GoogleMap, Marker, InfoWindow, useLoadScript } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { getProviderLogo } from '@/lib/providerLogos';

interface Station {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  connectorTypes: string[];
  imageUrl?: string;
  providerId: string;
  providerName: string;
  isAvailable: boolean;
  powerKw: number;
}

const mapContainerStyle = {
  width: '100%',
  height: 'calc(100vh - 80px)',
};

const indiaCenter = {
  lat: 20.5937,
  lng: 78.9629,
};

// Define only the libraries we need to avoid TypeScript issues
// Need to cast to any to avoid TypeScript issues with the Google Maps libraries
const libraries: any = ["places"];

export default function IndiaMapPage() {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [mapZoom, setMapZoom] = useState(5);
  const [providers, setProviders] = useState<{id: string, name: string, count: number}[]>([]);
  const [powerRange, setPowerRange] = useState([0, 150]);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [importStatus, setImportStatus] = useState<{ loading: boolean, message: string }>({ loading: false, message: '' });
  const [updateStatus, setUpdateStatus] = useState<{ loading: boolean, message: string }>({ loading: false, message: '' });
  const [_, navigate] = useLocation();
  
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: "",
    libraries: ["places"] // Defined inline to avoid type issues
  });

  const { data: stations, isLoading: isStationsLoading } = useQuery({
    queryKey: ["/api/ev-providers/all-stations"],
    queryFn: async () => {
      // Fetch all stations from multiple endpoints and regions
      const regions = [
        { name: "North India", city: "New Delhi", lat: 28.6139, lng: 77.2090 },
        { name: "South India", city: "Bengaluru", lat: 12.9716, lng: 77.5946 },
        { name: "West India", city: "Mumbai", lat: 19.0760, lng: 72.8777 },
        { name: "East India", city: "Kolkata", lat: 22.5726, lng: 88.3639 },
        { name: "Central India", city: "Nagpur", lat: 21.1458, lng: 79.0882 },
        // Add more regions to ensure coverage across India
        { name: "Gujarat", city: "Ahmedabad", lat: 23.0225, lng: 72.5714 },
        { name: "Tamil Nadu", city: "Chennai", lat: 13.0827, lng: 80.2707 },
        { name: "Rajasthan", city: "Jaipur", lat: 26.9124, lng: 75.7873 },
        { name: "Punjab", city: "Chandigarh", lat: 30.7333, lng: 76.7794 },
        { name: "Kerala", city: "Kochi", lat: 9.9312, lng: 76.2673 }
      ];
      
      console.log("Fetching charging stations from across India...");
      
      const stationsPromises = regions.map(region => 
        fetch(`/api/ev-providers/stations?latitude=${region.lat}&longitude=${region.lng}&radius=500`)
          .then(res => res.json())
          .catch(err => {
            console.error(`Error fetching stations in ${region.name}:`, err);
            return [];
          })
      );
      
      // Wait for all requests to complete
      const results = await Promise.all(stationsPromises);
      
      // Flatten the array and remove duplicates based on ID
      const stationMap = new Map<string, Station>();
      results.flat().forEach(station => {
        if (!stationMap.has(station.id)) {
          stationMap.set(station.id, station);
        }
      });
      
      // Also fetch explicitly from newer providers we've added
      try {
        // Define all our providers to fetch
        const providers = [
          'chargezone',
          'evcosmos',
          'mgmotor',
          'jiobp',
          'hpcl', 
          'bolt'  // Add Bolt to our list of providers
        ];
        
        // Fetch from each provider
        for (const provider of providers) {
          try {
            const response = await fetch(`/api/ev-providers/stations?provider=${provider}`)
              .then(res => res.json())
              .catch(() => []);
            
            // Add any new stations not already in our map
            response.forEach((station: Station) => {
              if (!stationMap.has(station.id)) {
                stationMap.set(station.id, station);
              }
            });
            
            console.log(`Added ${response.length} stations from ${provider}`);
          } catch (err) {
            console.warn(`Error fetching ${provider} stations:`, err);
          }
        }
      } catch (error) {
        console.error("Error fetching additional provider stations:", error);
      }
      
      const allStations = Array.from(stationMap.values());
      console.log(`Found a total of ${allStations.length} charging stations across India`);
      
      // Extract provider information
      const providerMap = new Map<string, {id: string, name: string, count: number}>();
      allStations.forEach(station => {
        const providerId = station.providerId || 'unknown';
        const providerName = station.providerName || 'Unknown Provider';
        
        if (providerMap.has(providerId)) {
          const current = providerMap.get(providerId)!;
          providerMap.set(providerId, { ...current, count: current.count + 1 });
        } else {
          providerMap.set(providerId, { id: providerId, name: providerName, count: 1 });
        }
      });
      
      setProviders(Array.from(providerMap.values()));
      
      return allStations;
    }
  });
  
  // Handle provider filter changes
  const handleProviderFilterChange = (providerId: string, checked: boolean) => {
    if (checked) {
      setSelectedProviders([...selectedProviders, providerId]);
    } else {
      setSelectedProviders(selectedProviders.filter(id => id !== providerId));
    }
  };
  
  // Filtered stations based on selected filters
  const filteredStations = React.useMemo(() => {
    if (!stations) return [];
    
    return stations.filter((station: Station) => {
      // Filter by provider if any are selected
      const providerMatch = selectedProviders.length === 0 || selectedProviders.includes(station.providerId);
      
      // Filter by power range
      const powerMatch = station.powerKw >= powerRange[0] && station.powerKw <= powerRange[1];
      
      return providerMatch && powerMatch;
    });
  }, [stations, selectedProviders, powerRange]);
  
  // Handle zoom in/out
  const handleZoomIn = () => setMapZoom(prev => Math.min(prev + 1, 18));
  const handleZoomOut = () => setMapZoom(prev => Math.max(prev - 1, 3));

  // Function to import Bolt.earth stations
  const importBoltStations = async () => {
    try {
      setImportStatus({ loading: true, message: 'Importing Bolt.earth charging stations...' });
      
      const response = await fetch('/api/import-bolt-stations', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      setImportStatus({ 
        loading: false, 
        message: `Successfully imported ${data.count} Bolt.earth charging stations` 
      });
      
      // Reload the stations data after import
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error) {
      console.error('Error importing Bolt.earth stations:', error);
      setImportStatus({ 
        loading: false, 
        message: 'Error importing Bolt.earth stations' 
      });
    }
  };
  
  // Function to update all stations from multiple providers
  const updateAllStations = async () => {
    try {
      setUpdateStatus({ loading: true, message: 'Updating all charging stations...' });
      
      // Define all our providers to update
      const providers = [
        'bolt',
        'jiobp',
        'chargezone',
        'evcosmos',
        'mgmotor',
        'hpcl',
        'tata-motors'
      ];
      
      let totalUpdated = 0;
      
      // Update from each provider
      for (const provider of providers) {
        try {
          const endpoint = `/api/import-${provider.replace(/[-]/g, '-')}-stations`;
          const response = await fetch(endpoint, {
            method: 'POST'
          });
          
          if (response.ok) {
            const data = await response.json();
            totalUpdated += data.count || 0;
            console.log(`Updated ${data.count || 0} stations from ${provider}`);
          }
        } catch (err) {
          console.warn(`Error updating ${provider} stations:`, err);
        }
      }
      
      setUpdateStatus({ 
        loading: false, 
        message: `Successfully updated ${totalUpdated} charging stations` 
      });
      
      // Reload the stations data after update
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error) {
      console.error('Error updating charging stations:', error);
      setUpdateStatus({ 
        loading: false, 
        message: 'Error updating charging stations' 
      });
    }
  };
  
  // Determine marker color based on availability and provider
  const getMarkerIcon = (station: Station) => {
    if (!station.isAvailable) {
      return {
        url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
        scaledSize: new window.google.maps.Size(40, 40),
      };
    }
    
    // Different colors for different providers
    const providerColors: Record<string, string> = {
      "tata-power": "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
      "jio-bp": "https://maps.google.com/mapfiles/ms/icons/purple-dot.png",
      "hyundai": "https://maps.google.com/mapfiles/ms/icons/orange-dot.png",
      "bpcl": "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
      "bolt": "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png",
      "efill": "https://maps.google.com/mapfiles/ms/icons/pink-dot.png"
    };
    
    return {
      url: providerColors[station.providerId] || "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
      scaledSize: new window.google.maps.Size(40, 40),
    };
  };

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-500 font-medium text-lg mb-2">Error loading Google Maps</p>
          <p>Please check your internet connection or API key.</p>
        </div>
      </div>
    );
  }

  if (!isLoaded || isStationsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Loading India's EV charging network...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen">
      <div className="flex items-center justify-between bg-card p-4 border-b">
        <h1 className="text-2xl font-bold">EV Charging Stations Across India</h1>
        <div className="flex items-center gap-4">
          <p className="text-muted-foreground">
            Showing {filteredStations.length} of {stations?.length || 0} stations
          </p>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filter Stations</SheetTitle>
                <SheetDescription>
                  Customize which charging stations are displayed on the map.
                </SheetDescription>
              </SheetHeader>
              
              <div className="py-4">
                <h3 className="font-medium mb-2">Charging Network</h3>
                <div className="space-y-2">
                  {providers.map(provider => (
                    <div key={provider.id} className="flex items-center gap-2">
                      <Checkbox 
                        id={`provider-${provider.id}`}
                        checked={selectedProviders.includes(provider.id)}
                        onCheckedChange={(checked) => 
                          handleProviderFilterChange(provider.id, checked === true)
                        }
                      />
                      <Label htmlFor={`provider-${provider.id}`} className="flex items-center gap-2">
                        <span className="flex items-center">
                          <span className="w-6 h-6 mr-2 flex items-center justify-center">
                            {getProviderLogo(provider.id)}
                          </span>
                          {provider.name}
                        </span>
                        <Badge variant="outline">{provider.count}</Badge>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="py-4">
                <h3 className="font-medium mb-2">Charging Power</h3>
                <div className="px-2">
                  <Slider 
                    defaultValue={[0, 150]} 
                    max={150} 
                    step={5}
                    value={powerRange}
                    onValueChange={setPowerRange}
                  />
                  <div className="flex justify-between mt-1 text-sm text-muted-foreground">
                    <span>{powerRange[0]} kW</span>
                    <span>{powerRange[1]} kW</span>
                  </div>
                </div>
              </div>
              
              <Button 
                className="mt-4" 
                onClick={() => {
                  setSelectedProviders([]);
                  setPowerRange([0, 150]);
                }}
              >
                Reset Filters
              </Button>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      
      {/* Map container */}
      <div className="h-full">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={indiaCenter}
          zoom={mapZoom}
          options={{
            fullscreenControl: false,
            mapTypeControl: true,
            streetViewControl: false,
            zoomControl: false,
          }}
        >
          {filteredStations.map((station: Station) => (
            <Marker
              key={station.id}
              position={{ lat: station.latitude, lng: station.longitude }}
              icon={getMarkerIcon(station)}
              onClick={() => setSelectedStation(station)}
              animation={window.google.maps.Animation.DROP}
            />
          ))}
          
          {selectedStation && (
            <InfoWindow
              position={{ lat: selectedStation.latitude, lng: selectedStation.longitude }}
              onCloseClick={() => setSelectedStation(null)}
            >
              <div className="max-w-xs">
                <h3 className="font-semibold mb-1">{selectedStation.name}</h3>
                <p className="text-xs text-gray-500 mb-2">{selectedStation.address}</p>
                
                <div className="flex items-center mb-2">
                  <span className="h-5 w-5 mr-2">
                    {getProviderLogo(selectedStation.providerId)}
                  </span>
                  <span className="text-sm">{selectedStation.providerName}</span>
                </div>
                
                <div className="flex flex-wrap gap-1 mb-2">
                  {selectedStation.connectorTypes.map((type) => (
                    <Badge key={type} variant="outline" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="flex items-center">
                    <span className={`h-2 w-2 rounded-full ${selectedStation.isAvailable ? 'bg-green-500' : 'bg-red-500'} mr-1`}></span>
                    {selectedStation.isAvailable ? 'Available' : 'Busy'}
                  </span>
                  <span>{selectedStation.powerKw} kW</span>
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full mt-3 text-xs" 
                  size="sm"
                  onClick={() => navigate(`/stations/${selectedStation.id}`)}
                >
                  View Details
                </Button>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>
      
      {/* Map controls */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2">
        <Button variant="outline" size="icon" className="bg-background h-10 w-10 shadow-lg" onClick={handleZoomIn}>
          <ZoomIn className="h-5 w-5" />
        </Button>
        <Button variant="outline" size="icon" className="bg-background h-10 w-10 shadow-lg" onClick={handleZoomOut}>
          <ZoomOut className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Count card */}
      <Card className="absolute top-20 left-4 w-48 opacity-90">
        <CardContent className="p-3">
          <div className="text-sm font-medium">Stations Available</div>
          <div className="text-3xl font-bold mt-1">{filteredStations.length}</div>
          <div className="text-xs text-muted-foreground mt-1">across India</div>
          
          <Button 
            variant="link" 
            size="sm" 
            className="text-xs p-0 h-auto mt-2" 
            onClick={() => setShowAdminPanel(!showAdminPanel)}
          >
            {showAdminPanel ? 'Hide Admin Panel' : 'Show Admin Panel'}
          </Button>
        </CardContent>
      </Card>
      
      {/* Admin Panel */}
      {showAdminPanel && (
        <Card className="absolute top-52 left-4 w-64 opacity-90">
          <CardContent className="p-3">
            <h3 className="text-sm font-medium mb-2">Admin Controls</h3>
            
            <div className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start" 
                onClick={importBoltStations}
                disabled={importStatus.loading || updateStatus.loading}
              >
                {importStatus.loading ? (
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                )}
                Import Bolt.earth Stations
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start" 
                onClick={updateAllStations}
                disabled={updateStatus.loading || importStatus.loading}
              >
                {updateStatus.loading ? (
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 4v6h-6"></path>
                    <path d="M1 20v-6h6"></path>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"></path>
                    <path d="M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                  </svg>
                )}
                Update All Stations
              </Button>
              
              {importStatus.message && (
                <div className="text-xs p-2 bg-muted rounded">
                  {importStatus.message}
                </div>
              )}
              
              {updateStatus.message && (
                <div className="text-xs p-2 bg-muted rounded">
                  {updateStatus.message}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}