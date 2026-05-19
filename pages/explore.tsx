import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { MapPin, Star, BatteryCharging, ChevronDown, Filter, MapIcon, ListFilter, Zap, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetFooter,
  SheetClose
} from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import ExploreMap from '@/components/ExploreMap';
import { connectorTypes } from '@shared/schema';
import { getProviderLogo } from '@/lib/providerLogos';
import { providerNames, ProviderID } from '@/lib/evApiServices';

const availableStates = [
  'All India',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Puducherry',
  'Chandigarh'
];

const ExplorePage = () => {
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedState, setSelectedState] = useState('All India');
  const [selectedConnectors, setSelectedConnectors] = useState<string[]>([]);
  const [minPower, setMinPower] = useState(0);
  const [maxPrice, setMaxPrice] = useState(50);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredStations, setFilteredStations] = useState<any[]>([]);
  // Removed map state variables

  // Fetch EV station data across India
  const { data: allStations, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/ev-providers/stations'],
    queryFn: async () => {
      // Try to fetch using city param since our backend requires either city or coordinates
      try {
        const response = await apiRequest('GET', '/api/ev-providers/stations?city=New Delhi');
        return await response.json();
      } catch (error) {
        console.error("Error fetching stations by city:", error);
        // Fallback to location-based search if city search fails
        const fallbackResponse = await apiRequest('GET', '/api/charging-stations');
        return await fallbackResponse.json();
      }
    }
  });

  // Fetch cities data
  const { data: cities } = useQuery({
    queryKey: ['/api/cities'],
  });

  // Apply filters
  useEffect(() => {
    if (!allStations) return;

    let filtered = [...allStations];

    // Filter by state
    if (selectedState !== 'All India') {
      filtered = filtered.filter(station => 
        station.state === selectedState
      );
    }

    // Filter by connector types
    if (selectedConnectors.length > 0) {
      filtered = filtered.filter(station => 
        station.connectorTypes.some((connector: string) => 
          selectedConnectors.includes(connector)
        )
      );
    }

    // Filter by minimum power
    if (minPower > 0) {
      filtered = filtered.filter(station => station.powerKw >= minPower);
    }

    // Filter by maximum price
    if (maxPrice < 50) {
      filtered = filtered.filter(station => 
        !station.pricePerKwh || station.pricePerKwh <= maxPrice
      );
    }

    // Filter by availability
    if (showAvailableOnly) {
      filtered = filtered.filter(station => station.isAvailable);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(station => 
        station.name.toLowerCase().includes(term) || 
        station.address.toLowerCase().includes(term) ||
        station.city.toLowerCase().includes(term)
      );
    }

    setFilteredStations(filtered);
  }, [allStations, selectedState, selectedConnectors, minPower, maxPrice, showAvailableOnly, searchTerm]);

  // Handle connector selection
  const toggleConnector = (connector: string) => {
    if (selectedConnectors.includes(connector)) {
      setSelectedConnectors(selectedConnectors.filter(c => c !== connector));
    } else {
      setSelectedConnectors([...selectedConnectors, connector]);
    }
  };

  // Reset filters
  const resetFilters = () => {
    setSelectedState('All India');
    setSelectedConnectors([]);
    setMinPower(0);
    setMaxPrice(50);
    setShowAvailableOnly(false);
    setSearchTerm('');
  };

  // Calculate the number of applied filters
  const appliedFiltersCount = [
    selectedState !== 'All India',
    selectedConnectors.length > 0,
    minPower > 0,
    maxPrice < 50,
    showAvailableOnly
  ].filter(Boolean).length;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">
          Error loading charging stations. Please try again later.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">EV Charging Stations Across India</h1>
      </div>
      
      <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 mb-6">
        {/* Search and filter bar */}
        <div className="flex-1 flex items-center space-x-2">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Search by name, address or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10"
            />
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          
          <Select value={selectedState} onValueChange={setSelectedState}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {availableStates.map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-10">
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {appliedFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {appliedFiltersCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filter Stations</SheetTitle>
              </SheetHeader>
              
              <div className="py-4 flex flex-col space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-3">Connector Types</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {connectorTypes.map((connector) => (
                      <div key={connector} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`connector-${connector}`} 
                          checked={selectedConnectors.includes(connector)}
                          onCheckedChange={() => toggleConnector(connector)}
                        />
                        <Label htmlFor={`connector-${connector}`}>{connector}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-3">Minimum Power (kW): {minPower}</h3>
                  <Slider 
                    min={0} 
                    max={350} 
                    step={10} 
                    value={[minPower]} 
                    onValueChange={(value) => setMinPower(value[0])}
                  />
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-3">Maximum Price per kWh (₹): {maxPrice}</h3>
                  <Slider 
                    min={0} 
                    max={50} 
                    step={5} 
                    value={[maxPrice]} 
                    onValueChange={(value) => setMaxPrice(value[0])}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="available-only" 
                    checked={showAvailableOnly}
                    onCheckedChange={(checked) => setShowAvailableOnly(checked as boolean)}
                  />
                  <Label htmlFor="available-only">Show available stations only</Label>
                </div>
              </div>
              
              <SheetFooter>
                <Button variant="outline" onClick={resetFilters}>Reset Filters</Button>
                <SheetClose asChild>
                  <Button>Apply Filters</Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
        
        {/* View toggle */}
        <Tabs
          value={selectedTab}
          onValueChange={setSelectedTab}
          className="w-full md:w-auto"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all" className="flex items-center">
              <ListFilter className="h-4 w-4 mr-2" />
              List View
            </TabsTrigger>
            <TabsTrigger value="brands" className="flex items-center">
              <Zap className="h-4 w-4 mr-2" />
              By Brand
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <div className="mb-4 flex justify-between items-center">
        <p className="text-muted-foreground text-sm">
          Showing {filteredStations.length} stations across India
        </p>
      </div>
      
      {selectedTab === 'all' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStations.map((station) => (
            <Link key={station.id} href={`/stations/${station.id}`}>
              <Card 
                className={`cursor-pointer hover:shadow-md transition-shadow ${!station.isAvailable ? 'border-red-300' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center">
                      <h3 className="font-semibold text-lg line-clamp-1">{station.name}</h3>
                      {!station.isAvailable && (
                        <Badge variant="destructive" className="ml-2">Busy</Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 text-amber-500">
                      <Star className="fill-current h-4 w-4" />
                      <span className="text-sm">{station.rating || '4.0'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center text-muted-foreground text-sm mb-2">
                    <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                    <span className="line-clamp-1">{station.address}, {station.city}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mb-2">
                    {station.connectorTypes?.map((connector: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {connector}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-primary">
                      <BatteryCharging className="h-4 w-4 mr-1" />
                      <span>{station.powerKw} kW</span>
                    </div>
                    
                    <div className={`flex items-center ${station.isAvailable ? 'text-green-600' : 'text-red-500'}`}>
                      {station.isAvailable ? (
                        <>
                          <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
                          Available
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 rounded-full bg-red-500 mr-1"></div>
                          Unavailable
                        </>
                      )}
                    </div>
                    
                    <div>
                      {station.pricePerKwh ? `₹${station.pricePerKwh}/kWh` : 'Price N/A'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Object.entries(providerNames).map(([providerId, providerName]) => (
              <Card 
                key={providerId}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  // Filter stations by provider ID
                  const filtered = allStations?.filter(
                    (station: any) => station.providerId === providerId
                  ) || [];
                  setFilteredStations(filtered);
                  setSearchTerm(`provider:${providerId}`);
                }}
              >
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 flex items-center justify-center rounded-full bg-primary/10 mb-3">
                    {getProviderLogo(providerId)}
                  </div>
                  <h3 className="font-medium text-sm">{providerName}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {allStations?.filter((station: any) => station.providerId === providerId).length || 0} stations
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {searchTerm.startsWith('provider:') && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">
                  {providerNames[searchTerm.replace('provider:', '') as ProviderID] || 'Brand'} Stations
                </h2>
                <Button variant="outline" size="sm" onClick={() => {
                  setSearchTerm('');
                  setFilteredStations(allStations || []);
                }}>
                  Clear Selection
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStations.length > 0 ? filteredStations.map((station) => (
                  <Link key={station.id} href={`/stations/${station.id}`}>
                    <Card 
                      className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${
                        !station.isAvailable 
                          ? 'border-red-500 border-l-red-500' 
                          : 'hover:border-l-primary'
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center">
                            <h3 className="font-semibold text-lg line-clamp-1">{station.name}</h3>
                            {!station.isAvailable && (
                              <Badge variant="destructive" className="ml-2">Busy</Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-1 text-amber-500">
                            <Star className="fill-current h-4 w-4" />
                            <span className="text-sm">{station.rating || '4.0'}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center text-muted-foreground text-sm mb-2">
                          <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                          <span className="line-clamp-1">{station.address}, {station.city}</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-1 mb-3">
                          {station.connectorTypes?.map((connector: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {connector}
                            </Badge>
                          ))}
                        </div>
                        
                        <div className="flex items-center justify-between text-sm pt-2 border-t">
                          <div className="flex items-center text-primary">
                            <BatteryCharging className="h-4 w-4 mr-1" />
                            <span>{station.powerKw} kW</span>
                          </div>
                          
                          <div className={`flex items-center ${station.isAvailable ? 'text-green-600' : 'text-red-500'}`}>
                            {station.isAvailable ? (
                              <>
                                <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
                                Available
                              </>
                            ) : (
                              <>
                                <div className="w-2 h-2 rounded-full bg-red-500 mr-1 animate-pulse"></div>
                                Busy
                              </>
                            )}
                          </div>
                          
                          <div>
                            {station.pricePerKwh ? `₹${station.pricePerKwh}/kWh` : 'Price N/A'}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )) : (
                  <div className="col-span-3 p-8 text-center">
                    <div className="text-muted-foreground">
                      No stations found for this provider.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      

    </div>
  );
};

export default ExplorePage;