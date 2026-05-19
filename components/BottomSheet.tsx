import { useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { SheetState, LocationWithDistance } from "@/types";
import LocationCard from "./LocationCard";
import { Skeleton } from "@/components/ui/skeleton";

interface BottomSheetProps {
  state: SheetState;
  toggleState: () => void;
  locations: LocationWithDistance[];
  isLoading: boolean;
  selectedId: number | null;
  onLocationSelect: (id: number) => void;
  onRefresh: () => void;
}

export default function BottomSheet({
  state,
  toggleState,
  locations,
  isLoading,
  selectedId,
  onLocationSelect,
  onRefresh
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const sheetStartY = useRef<number | null>(null);
  
  // If a location is selected, fetch its details
  const { data: selectedLocationData } = useQuery({
    queryKey: ['/api/locations', selectedId],
    enabled: selectedId !== null,
  });
  
  // Set up touch event listeners for dragging
  useEffect(() => {
    const sheetElement = sheetRef.current;
    if (!sheetElement) return;
    
    const handleTouchStart = (e: TouchEvent) => {
      const handle = e.target as HTMLElement;
      if (handle.closest('[data-handle="true"]')) {
        dragStartY.current = e.touches[0].clientY;
        sheetStartY.current = sheetElement.getBoundingClientRect().top;
        sheetElement.style.transition = 'none';
      }
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (dragStartY.current !== null && sheetStartY.current !== null) {
        const deltaY = e.touches[0].clientY - dragStartY.current;
        const newTop = sheetStartY.current + deltaY;
        
        // Prevent dragging above the top of the viewport
        if (newTop < 0) return;
        
        sheetElement.style.transform = `translateY(${deltaY}px)`;
      }
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      if (dragStartY.current !== null) {
        const deltaY = e.changedTouches[0].clientY - dragStartY.current;
        sheetElement.style.transition = 'transform 0.3s ease-out';
        
        // Determine new state based on drag distance
        if (deltaY > 100) {
          // Dragged down significantly
          if (state === 'full') {
            sheetElement.style.transform = 'translateY(50%)';
            sheetElement.dataset.state = 'half';
          } else if (state === 'half') {
            sheetElement.style.transform = 'translateY(calc(100% - 60px))';
            sheetElement.dataset.state = 'collapsed';
          }
        } else if (deltaY < -100) {
          // Dragged up significantly
          if (state === 'collapsed') {
            sheetElement.style.transform = 'translateY(50%)';
            sheetElement.dataset.state = 'half';
          } else if (state === 'half') {
            sheetElement.style.transform = 'translateY(0)';
            sheetElement.dataset.state = 'full';
          }
        } else {
          // Small drag - revert to current state
          if (state === 'collapsed') {
            sheetElement.style.transform = 'translateY(calc(100% - 60px))';
          } else if (state === 'half') {
            sheetElement.style.transform = 'translateY(50%)';
          } else {
            sheetElement.style.transform = 'translateY(0)';
          }
        }
        
        // Reset drag tracking
        dragStartY.current = null;
        sheetStartY.current = null;
      }
    };
    
    sheetElement.addEventListener('touchstart', handleTouchStart);
    sheetElement.addEventListener('touchmove', handleTouchMove);
    sheetElement.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      sheetElement.removeEventListener('touchstart', handleTouchStart);
      sheetElement.removeEventListener('touchmove', handleTouchMove);
      sheetElement.removeEventListener('touchend', handleTouchEnd);
    };
  }, [state]);
  
  return (
    <div 
      ref={sheetRef}
      className={cn(
        "bottom-sheet absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl z-20 max-h-[90vh] overflow-hidden",
        state === 'collapsed' && "collapsed",
        state === 'half' && "half",
        state === 'full' && "full"
      )}
      data-state={state}
    >
      <div className="py-2 px-4 border-b border-gray-200" data-handle="true">
        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-2"></div>
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">
            {locations.length} Nearby Locations
          </h2>
          <div className="space-x-2">
            <button 
              className="p-1 rounded hover:bg-gray-100"
              onClick={onRefresh}
              aria-label="Refresh Locations"
            >
              <span className="material-icons text-gray-600">refresh</span>
            </button>
            <button 
              className="p-1 rounded hover:bg-gray-100"
              onClick={toggleState}
              aria-label="Toggle Sheet Size"
            >
              <span className="material-icons text-gray-600">
                {state === 'collapsed' ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-y-auto max-h-[calc(90vh-72px)]">
        <div className="p-4 space-y-4">
          {isLoading ? (
            // Loading skeletons
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm p-4">
                <div className="flex">
                  <div className="w-1/3">
                    <Skeleton className="w-full h-32" />
                  </div>
                  <div className="w-2/3 pl-3 space-y-2">
                    <Skeleton className="h-6 w-2/3" />
                    <Skeleton className="h-4 w-4/5" />
                    <div className="flex space-x-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : locations.length > 0 ? (
            // Location cards
            locations.map(location => (
              <LocationCard 
                key={location.id} 
                location={location} 
                isSelected={location.id === selectedId}
                onClick={() => onLocationSelect(location.id)}
              />
            ))
          ) : (
            // No locations found
            <div className="text-center py-8">
              <span className="material-icons text-4xl text-gray-400 mb-2">location_off</span>
              <p className="text-gray-500">No locations found nearby</p>
              <button 
                className="mt-4 px-4 py-2 bg-primary text-white rounded-full shadow"
                onClick={onRefresh}
              >
                Find my location
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
