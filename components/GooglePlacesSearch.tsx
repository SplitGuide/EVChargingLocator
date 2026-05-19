import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Search, MapPin, Zap, Star, AlertTriangle, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface GooglePlacesSearchProps {
  latitude: number;
  longitude: number;
  radius?: number;
  onStationsFound?: (stations: any[]) => void;
}

const GooglePlacesSearch: React.FC<GooglePlacesSearchProps> = ({
  latitude,
  longitude,
  radius = 5000,
  onStationsFound
}) => {
  const [isSearching, setIsSearching] = useState(false);
  
  // Function to initiate search with Google Places API
  const searchGooglePlaces = async () => {
    setIsSearching(true);
    
    try {
      const response = await apiRequest(
        'GET', 
        `/api/google/charging-stations?latitude=${latitude}&longitude=${longitude}&radius=${radius}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to search for charging stations');
      }
      
      const data = await response.json();
      
      toast({
        title: 'Search Complete',
        description: `Found ${data.length} charging stations from Google Places.`,
      });
      
      if (onStationsFound) {
        onStationsFound(data);
      }
      
      return data;
    } catch (error: any) {
      toast({
        title: 'Search Failed',
        description: error.message || 'Failed to search for charging stations',
        variant: 'destructive',
      });
      return [];
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <Search className="mr-2 h-5 w-5" />
          Enhanced Search with Google Places
        </CardTitle>
        <CardDescription>
          Find real-world EV charging stations around your location using Google Places data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center">
            <MapPin className="mr-2 h-4 w-4" />
            <span>Search centered at: {latitude.toFixed(6)}, {longitude.toFixed(6)}</span>
          </div>
          <div className="flex items-center">
            <Zap className="mr-2 h-4 w-4" />
            <span>Radius: {(radius / 1000).toFixed(1)} km</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={searchGooglePlaces} 
          disabled={isSearching}
          className="w-full"
        >
          {isSearching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Find Charging Stations
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default GooglePlacesSearch;