import { useState, useEffect } from "react";

// Create a singleton map instance to be shared across components
let mapInstance: L.Map | null = null;

export function useMap() {
  const [map, setMapState] = useState<L.Map | null>(mapInstance);
  
  // Set map instance and update the singleton
  const setMap = (newMap: L.Map | null) => {
    mapInstance = newMap;
    setMapState(newMap);
  };
  
  // Handle zoom events from outside the map component
  useEffect(() => {
    const handleZoom = (e: CustomEvent) => {
      if (!map) return;
      
      const { direction } = e.detail;
      
      if (direction === 'in') {
        map.zoomIn();
      } else if (direction === 'out') {
        map.zoomOut();
      }
    };
    
    window.addEventListener('map:zoom' as any, handleZoom as EventListener);
    
    return () => {
      window.removeEventListener('map:zoom' as any, handleZoom as EventListener);
    };
  }, [map]);
  
  return { map, setMap };
}
