import { useEffect, useRef } from "react";
import L from "leaflet";
import { Link, useLocation } from "wouter";
import "leaflet/dist/leaflet.css";

export interface ExploreMapProps {
  stations: any[];
  center: { lat: number; lng: number };
  zoom: number;
  onChangeCenter: (center: { lat: number; lng: number }) => void;
  onChangeZoom: (zoom: number) => void;
}

export default function ExploreMap({
  stations,
  center,
  zoom,
  onChangeCenter,
  onChangeZoom
}: ExploreMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [, navigate] = useLocation();
  
  // Initialize map on component mount
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    
    // Create map centered on provided center
    const map = L.map(mapRef.current).setView([center.lat, center.lng], zoom);
    
    // Add map tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Listen for map move and zoom events
    map.on('moveend', () => {
      const center = map.getCenter();
      onChangeCenter({ lat: center.lat, lng: center.lng });
    });
    
    map.on('zoomend', () => {
      onChangeZoom(map.getZoom());
    });
    
    // Save map instance
    mapInstanceRef.current = map;
    
    // Clean up on unmount
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);
  
  // Update center and zoom when props change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    
    // Only update if center changed substantially
    const currentCenter = map.getCenter();
    if (Math.abs(currentCenter.lat - center.lat) > 0.0001 || 
        Math.abs(currentCenter.lng - center.lng) > 0.0001 ||
        map.getZoom() !== zoom) {
      map.setView([center.lat, center.lng], zoom);
    }
  }, [center, zoom]);
  
  // Add markers for stations
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    
    // Clear existing markers
    map.eachLayer(layer => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });
    
    // Add markers for stations
    stations.forEach(station => {
      if (!station.latitude || !station.longitude) return;
      
      // Determine marker styles based on availability
      const iconColor = station.isAvailable ? 'green' : 'red';
      const pulseEffect = station.isAvailable ? '' : 'animate-pulse';
      const borderStyle = station.isAvailable ? '' : 'border-2 border-red-500';
      
      // Create marker icon
      const icon = L.divIcon({
        className: '',
        html: `
          <div class="relative group">
            <div class="bg-${iconColor}-500 text-white rounded-full p-2 shadow-lg transition-transform hover:scale-110 flex items-center justify-center ${pulseEffect} ${borderStyle}" style="width: 34px; height: 34px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M7 17h10v3a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-3Z"></path>
                <path d="M12 4v6"></path>
                <path d="m15 7-3-3-3 3"></path>
                <path d="M12 10v7"></path>
              </svg>
            </div>
            ${!station.isAvailable ? `<div class="absolute -top-3 -right-3 bg-red-500 text-white text-xs rounded-full px-1 py-0.5 shadow-md font-bold" style="min-width: 40px; text-align: center;">BUSY</div>` : ''}
            ${station.rating ? `<div class="absolute -top-2 -left-2 bg-amber-400 text-white text-xs rounded-full px-1 shadow font-bold" style="min-width: 20px; text-align: center;">${station.rating}</div>` : ''}
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });
      
      // Create marker
      const marker = L.marker([station.latitude, station.longitude], { icon })
        .addTo(map)
        .on('click', () => {
          // When marker is clicked, open popup
          marker.openPopup();
        });
      
      // Create popup content
      const popupContent = document.createElement('div');
      popupContent.className = 'station-popup';
      popupContent.innerHTML = `
        <div class="text-sm">
          <h3 class="font-bold text-base mb-1">${station.name}</h3>
          <p class="text-gray-600 mb-1">${station.address}</p>
          <div class="flex items-center gap-1 mb-1">
            ${station.connectorTypes?.map((type: string) => 
              `<span class="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">${type}</span>`
            ).join('') || ''}
          </div>
          <div class="flex justify-between items-center mt-2">
            <span class="${station.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} font-medium px-2 py-0.5 rounded-full flex items-center">
              <div class="w-2 h-2 rounded-full ${station.isAvailable ? 'bg-green-500' : 'bg-red-500 animate-pulse'} mr-1"></div>
              ${station.isAvailable ? 'Available' : 'BUSY'}
            </span>
            <span class="text-primary font-medium">${station.powerKw ? `${station.powerKw} kW` : ''}</span>
          </div>
          <button data-station-id="${station.id}" class="block w-full bg-primary text-white text-center py-1 px-2 rounded mt-2 text-sm hover:bg-primary/90 transition-colors cursor-pointer view-details-btn">
            View Details
          </button>
        </div>
      `;
      
      marker.bindPopup(popupContent);
      
      // Add event listener to the popup
      marker.on('popupopen', () => {
        // Find view details button and add click handler
        const detailsBtn = popupContent.querySelector('.view-details-btn');
        if (detailsBtn) {
          detailsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const stationId = detailsBtn.getAttribute('data-station-id');
            if (stationId) {
              navigate(`/stations/${stationId}`);
            }
          });
        }
      });
    });
  }, [stations, navigate]);
  
  return <div ref={mapRef} className="h-full w-full"></div>;
}