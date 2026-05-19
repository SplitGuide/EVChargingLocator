import { useState, useEffect, useRef } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (place: google.maps.places.PlaceResult) => void;
  placeholder?: string;
  className?: string;
}

export default function GooglePlacesAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Search for a location",
  className,
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize Google Maps Places Autocomplete
  useEffect(() => {
    const initPlacesAutocomplete = async () => {
      try {
        const loader = new Loader({
          apiKey: process.env.GOOGLE_PLACES_API_KEY || "",
          version: "weekly",
          libraries: ["places"]
        });

        await loader.load();
        
        if (inputRef.current && window.google) {
          // Create the autocomplete instance
          const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
            types: ["geocode", "establishment"],
            componentRestrictions: { country: "in" }, // Restrict to India
            fields: ["address_components", "geometry", "formatted_address", "name", "place_id"],
          });

          // Store the autocomplete instance
          autocompleteRef.current = autocomplete;

          // Add place_changed event listener
          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            
            if (place && place.name) {
              // Update the input value
              onChange(place.formatted_address || place.name);
              // Call the onSelect callback
              onSelect(place);
            }
          });

          setIsInitialized(true);
        }
      } catch (error) {
        console.error("Error initializing Google Places Autocomplete:", error);
      }
    };

    if (!isInitialized && inputRef.current) {
      initPlacesAutocomplete();
    }

    return () => {
      // Clean up event listeners when component unmounts
      if (autocompleteRef.current && window.google) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isInitialized, onChange, onSelect]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={cn("relative", className)}>
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="w-full"
      />
    </div>
  );
}