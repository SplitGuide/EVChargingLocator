import { useEffect, useRef } from "react";
import L from "leaflet";
import { LocationWithDistance, UserPosition } from "@/types";
import { useMap } from "@/hooks/use-map";
import { locationTypeToColor } from "@/assets/icons";

interface MapProps {
  locations: LocationWithDistance[];
  userPosition: UserPosition | null;
  onMarkerClick: (locationId: number) => void;
  selectedLocation: number | null;
}

export default function Map({
  locations,
  userPosition,
  onMarkerClick,
  selectedLocation
}: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const { map, setMap } = useMap();
  
  // Initialize map on component mount
  useEffect(() => {
    if (!mapRef.current || map) return;
    
    // Create map centered on India
    const newMap = L.map(mapRef.current).setView([20.5937, 78.9629], 5);
    
    // Add map tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(newMap);
    
    // Save map instance
    setMap(newMap);
    
    // Clean up on unmount
    return () => {
      newMap.remove();
      setMap(null);
    };
  }, []);
  
  // Add markers for locations
  useEffect(() => {
    if (!map) return;
    
    // Clear existing markers
    map.eachLayer(layer => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });
    
    // Add markers for locations
    locations.forEach(location => {
      const isSelected = location.id === selectedLocation;
      
      // Create marker icon based on location type
      const icon = L.divIcon({
        className: '',
        html: `
          <div class="map-marker">
            <div class="bg-${locationTypeToColor[location.type]} text-white rounded-full p-2 shadow-lg ${isSelected ? 'ring-2 ring-white scale-110' : ''}">
              <span class="material-icons">${getIconForLocationType(location.type)}</span>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
      
      // Create marker
      const marker = L.marker([location.latitude, location.longitude], { icon })
        .addTo(map)
        .on('click', () => onMarkerClick(location.id));
      
      // Add popup with basic info
      marker.bindPopup(`<b>${location.name}</b><br>${location.address}`);
      
      // Open popup if selected
      if (isSelected) {
        marker.openPopup();
        map.setView([location.latitude, location.longitude], 15);
      }
    });
  }, [map, locations, selectedLocation]);
  
  // Add user position marker
  useEffect(() => {
    if (!map || !userPosition) return;
    
    // Clear existing user marker
    map.eachLayer(layer => {
      if (layer instanceof L.CircleMarker) {
        map.removeLayer(layer);
      }
    });
    
    // Create user position marker
    const userMarker = L.circleMarker(
      [userPosition.latitude, userPosition.longitude],
      {
        color: '#0000ff',
        fillColor: '#3388ff',
        fillOpacity: 0.8,
        weight: 2,
        radius: 6
      }
    ).addTo(map);
    
    // Add accuracy circle if available
    if (userPosition.accuracy) {
      L.circle(
        [userPosition.latitude, userPosition.longitude],
        {
          radius: userPosition.accuracy,
          fillColor: '#3388ff',
          fillOpacity: 0.1,
          color: '#3388ff',
          weight: 1
        }
      ).addTo(map);
    }
    
    // Center map on user position
    map.setView([userPosition.latitude, userPosition.longitude], 14);
    
  }, [map, userPosition]);
  
  return <div id="map" ref={mapRef} className="leaflet-container"></div>;
}

// Helper function to get icon for location type
function getIconForLocationType(type: string): string {
  switch (type) {
    case 'charging':
      return 'ev_station';
    case 'restaurant':
      return 'restaurant';
    case 'hotel':
      return 'hotel';
    case 'restroom':
      return 'wc';
    default:
      return 'place';
  }
}
