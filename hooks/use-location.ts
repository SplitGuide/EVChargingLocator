import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface Position {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

interface UseLocationReturn {
  userPosition: Position | null;
  getCurrentPosition: () => void;
  setCustomLocation: (city: string) => void;
  isLoading: boolean;
  error: string | null;
}

export function useLocation(): UseLocationReturn {
  const [userPosition, setUserPosition] = useState<Position | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSuccess = useCallback((position: GeolocationPosition) => {
    const { latitude, longitude, accuracy } = position.coords;
    setUserPosition({
      latitude,
      longitude,
      accuracy,
      timestamp: position.timestamp,
    });
    setIsLoading(false);
    setError(null);
  }, []);

  const handleError = useCallback((error: GeolocationPositionError) => {
    setIsLoading(false);
    setError(error.message);
    
    let errorMessage = "Unable to retrieve your location";
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = "Location access denied. Please enable location services in your browser settings.";
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = "Location information is unavailable.";
        break;
      case error.TIMEOUT:
        errorMessage = "Location request timed out.";
        break;
      default:
        errorMessage = `Location error: ${error.message}`;
    }
    
    toast({
      title: "Location Error",
      description: errorMessage,
      variant: "destructive",
    });
  }, [toast]);

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      toast({
        title: "Location Not Supported",
        description: "Geolocation is not supported by your browser",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // 1 minute
      }
    );
  }, [handleSuccess, handleError, toast]);

  // City coordinates for testing
  const cityCoordinates: Record<string, Position> = {
    'New Delhi': { latitude: 28.6139, longitude: 77.2090 },
    'Mumbai': { latitude: 19.0760, longitude: 72.8777 },
    'Bengaluru': { latitude: 12.9716, longitude: 77.5946 },
    'Goa': { latitude: 15.2993, longitude: 74.1240 },
    'Chennai': { latitude: 13.0827, longitude: 80.2707 },
    'Hyderabad': { latitude: 17.3850, longitude: 78.4867 },
    'Kolkata': { latitude: 22.5726, longitude: 88.3639 },
    'Pune': { latitude: 18.5204, longitude: 73.8567 }
  };

  // Set a custom location for testing
  const setCustomLocation = useCallback((city: string) => {
    const position = cityCoordinates[city];
    
    if (position) {
      setUserPosition(position);
      setIsLoading(false);
      setError(null);
      
      toast({
        title: "Location Updated",
        description: `Your location has been set to ${city}`,
      });
    } else {
      toast({
        title: "Invalid City",
        description: "Could not find coordinates for that city",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Get initial position when hook is first used
  useEffect(() => {
    getCurrentPosition();
  }, [getCurrentPosition]);

  return { userPosition, getCurrentPosition, setCustomLocation, isLoading, error };
}