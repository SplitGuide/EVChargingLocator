import { LocationType } from "@shared/schema";
import { FilterOptions } from "@/types";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  activeFilters: LocationType[];
  onChange: (filters: FilterOptions) => void;
}

interface FilterItem {
  type: LocationType;
  label: string;
  icon: string;
}

const filterItems: FilterItem[] = [
  { type: "charging", label: "Charging", icon: "ev_station" },
  { type: "restaurant", label: "Food", icon: "restaurant" },
  { type: "hotel", label: "Hotels", icon: "hotel" },
  { type: "restroom", label: "Restrooms", icon: "wc" }
];

export default function FilterBar({ activeFilters, onChange }: FilterBarProps) {
  // Toggle filter
  const toggleFilter = (type: LocationType) => {
    const isActive = activeFilters.includes(type);
    
    // Never remove all filters - always keep at least one
    if (isActive && activeFilters.length === 1) return;
    
    const newFilters = isActive 
      ? activeFilters.filter(f => f !== type)
      : [...activeFilters, type];
    
    onChange({ types: newFilters });
  };
  
  return (
    <div className="absolute top-28 left-0 right-0 z-10 px-2 overflow-x-auto">
      <div className="flex space-x-2 py-2 px-2 w-max">
        {filterItems.map(item => (
          <button 
            key={item.type}
            className={cn(
              "flex items-center py-1 px-3 rounded-full text-sm shadow transition-colors no-highlight",
              activeFilters.includes(item.type)
                ? "bg-primary text-white"
                : "bg-white text-gray-700"
            )}
            onClick={() => toggleFilter(item.type)}
          >
            <span className="material-icons text-sm mr-1">{item.icon}</span>
            {item.label}
          </button>
        ))}
        
        <button className="flex items-center py-1 px-3 bg-white text-gray-700 rounded-full text-sm shadow no-highlight">
          <span className="material-icons text-sm mr-1">tune</span>
          More
        </button>
      </div>
    </div>
  );
}
