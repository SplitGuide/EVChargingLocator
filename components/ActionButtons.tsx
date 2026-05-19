import { cn } from "@/lib/utils";

interface ActionButtonsProps {
  onLocationClick: () => void;
  isLocating: boolean;
}

export default function ActionButtons({ 
  onLocationClick,
  isLocating
}: ActionButtonsProps) {
  const handleZoomIn = () => {
    // This is handled through the map hook in the implementation
    const event = new CustomEvent('map:zoom', { detail: { direction: 'in' } });
    window.dispatchEvent(event);
  };
  
  const handleZoomOut = () => {
    // This is handled through the map hook in the implementation
    const event = new CustomEvent('map:zoom', { detail: { direction: 'out' } });
    window.dispatchEvent(event);
  };
  
  return (
    <div className="absolute bottom-20 right-4 z-30 flex flex-col space-y-3">
      <button 
        className="bg-white p-3 rounded-full shadow-lg text-gray-700 hover:bg-gray-50 transition-colors no-highlight"
        onClick={handleZoomIn}
        aria-label="Zoom In"
      >
        <span className="material-icons">add</span>
      </button>
      <button 
        className="bg-white p-3 rounded-full shadow-lg text-gray-700 hover:bg-gray-50 transition-colors no-highlight"
        onClick={handleZoomOut}
        aria-label="Zoom Out"
      >
        <span className="material-icons">remove</span>
      </button>
      <button 
        className={cn(
          "p-3 rounded-full shadow-lg text-white transition-colors no-highlight",
          isLocating ? "bg-primary-600 animate-pulse" : "bg-primary-700 hover:bg-primary-800"
        )}
        onClick={onLocationClick}
        disabled={isLocating}
        aria-label="Get My Location"
      >
        <span className="material-icons">my_location</span>
      </button>
    </div>
  );
}
