import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { LocationWithDistance, ChargingLocationDetails } from "@/types";
import { locationTypeToColor } from "@/assets/icons";
import { getProviderLogo } from "@/lib/providerLogos";

interface LocationCardProps {
  location: LocationWithDistance;
  isSelected: boolean;
  onClick: () => void;
}

export default function LocationCard({
  location,
  isSelected,
  onClick
}: LocationCardProps) {
  // Fetch charging station details if this is a charging location
  const { data: locationDetails } = useQuery<ChargingLocationDetails>({
    queryKey: ['/api/locations', location.id],
    enabled: location.type === 'charging',
  });
  
  const chargingStation = locationDetails?.chargingStation;
  
  return (
    <div 
      className={cn(
        "bg-white border rounded-xl overflow-hidden shadow-sm transition-colors",
        isSelected ? "border-primary" : "border-gray-200"
      )}
      onClick={onClick}
    >
      <div className="flex">
        <div className="w-1/3 h-32 relative overflow-hidden">
          {location.imageUrl ? (
            <img 
              src={location.imageUrl} 
              alt={location.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full bg-${locationTypeToColor[location.type]}-100 flex items-center justify-center`}>
              <span className={`material-icons text-${locationTypeToColor[location.type]}-500 text-4xl`}>
                {getIconForLocationType(location.type)}
              </span>
            </div>
          )}
          <div className={`absolute top-2 left-2 bg-${locationTypeToColor[location.type]} text-xs text-white px-2 py-1 rounded-full`}>
            {getLocationTypeLabel(location.type)}
            {location.type === 'charging' && chargingStation?.isAvailable && " • Available"}
          </div>
        </div>
        <div className="w-2/3 p-3">
          <div className="flex justify-between items-start">
            <h3 className="font-medium text-gray-900">{location.name}</h3>
            {location.distance !== undefined && (
              <span className="text-sm text-gray-500">{formatDistance(location.distance)}</span>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-1">{location.address}, {location.city}</p>
          
          {/* Location-specific details */}
          {location.type === 'charging' && chargingStation && (
            <>
              {/* Provider logo and name */}
              {location.source && (
                <div className="flex items-center mt-1 mb-2">
                  <div className="mr-2">
                    {getProviderLogo(location.source)}
                  </div>
                  <span className="text-xs font-medium text-gray-700">
                    {location.source.replace('_', ' ').split(' ').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </span>
                </div>
              )}
              
              <div className="mt-1 flex items-center space-x-2 text-xs text-gray-600">
                {chargingStation.connectorTypes.map((type, index) => (
                  <div key={index} className="bg-blue-100 px-2 py-1 rounded">{type}</div>
                ))}
                <div className="bg-blue-100 px-2 py-1 rounded">{chargingStation.powerKw} kW</div>
                {chargingStation.pricePerKwh && (
                  <div className="bg-blue-100 px-2 py-1 rounded">₹{chargingStation.pricePerKwh}/kWh</div>
                )}
              </div>
            </>
          )}
          
          {location.type === 'restaurant' && (
            <div className="mt-2 flex items-center space-x-2 text-xs text-gray-600">
              {location.isOpen && <div className="bg-green-100 px-2 py-1 rounded">Open Now</div>}
              {location.rating && <div className="bg-yellow-100 px-2 py-1 rounded">{location.rating} ★</div>}
              {location.priceLevel && <div className="bg-blue-100 px-2 py-1 rounded">{'₹'.repeat(location.priceLevel)}</div>}
            </div>
          )}
          
          {location.type === 'hotel' && (
            <div className="mt-2 flex items-center space-x-2 text-xs text-gray-600">
              {location.rating && <div className="bg-yellow-100 px-2 py-1 rounded">{location.rating} ★</div>}
              {location.priceLevel && <div className="bg-blue-100 px-2 py-1 rounded">{'₹'.repeat(location.priceLevel)}</div>}
              {location.isOpen && <div className="bg-green-100 px-2 py-1 rounded">Rooms Available</div>}
            </div>
          )}
          
          {/* Amenities indicators */}
          <div className="mt-2 flex items-center space-x-3 text-sm">
            {location.hasParking && (
              <div className="flex items-center text-gray-600">
                <span className="material-icons text-green-600 text-base mr-1">local_parking</span>
                <span>Yes</span>
              </div>
            )}
            {location.hasRestroom && (
              <div className="flex items-center text-gray-600">
                <span className="material-icons text-purple-600 text-base mr-1">wc</span>
                <span>Yes</span>
              </div>
            )}
            {location.hasFoodOption && (
              <div className="flex items-center text-gray-600">
                <span className="material-icons text-secondary-500 text-base mr-1">restaurant</span>
                <span>Yes</span>
              </div>
            )}
            {location.type === 'charging' && (
              <div className="flex items-center text-gray-600">
                <span className="material-icons text-primary-700 text-base mr-1">ev_station</span>
                <span>{chargingStation?.numberOfPoints || 1}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="border-t border-gray-100 px-3 py-2 flex space-x-2 text-sm">
        <button className="flex-1 flex justify-center items-center space-x-1 text-primary-700">
          <span className="material-icons text-sm">directions</span>
          <span>Navigate</span>
        </button>
        <div className="border-r border-gray-200"></div>
        {location.phoneNumber ? (
          <a 
            href={`tel:${location.phoneNumber}`}
            className="flex-1 flex justify-center items-center space-x-1 text-primary-700"
          >
            <span className="material-icons text-sm">call</span>
            <span>Call</span>
          </a>
        ) : (
          <button className="flex-1 flex justify-center items-center space-x-1 text-gray-400" disabled>
            <span className="material-icons text-sm">call</span>
            <span>Call</span>
          </button>
        )}
        <div className="border-r border-gray-200"></div>
        <button className="flex-1 flex justify-center items-center space-x-1 text-primary-700">
          <span className="material-icons text-sm">bookmark_border</span>
          <span>Save</span>
        </button>
      </div>
    </div>
  );
}

// Helper functions
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

function getLocationTypeLabel(type: string): string {
  switch (type) {
    case 'charging':
      return 'Charging';
    case 'restaurant':
      return 'Restaurant';
    case 'hotel':
      return 'Hotel';
    case 'restroom':
      return 'Restroom';
    default:
      return 'Location';
  }
}

function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${(distance * 1000).toFixed(0)} m`;
  }
  return `${distance.toFixed(1)} km`;
}
