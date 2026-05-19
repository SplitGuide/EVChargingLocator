import React from "react";
import { LocationType } from "@shared/schema";

// SVG icon components
export function Bolt({ className = "", size = 24 }: { className?: string, size?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
    </svg>
  );
}

// Color mapping for location types
export const locationTypeToColor: Record<LocationType, string> = {
  "charging": "primary",
  "restaurant": "secondary",
  "hotel": "blue",
  "restroom": "purple"
};
