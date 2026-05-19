import { useState, useEffect } from "react";
import { SheetState } from "@/types";

interface UseSheetReturn {
  sheetState: SheetState;
  setSheetState: (state: SheetState) => void;
  toggleSheetState: () => void;
}

export function useSheet(initialState: SheetState = 'collapsed'): UseSheetReturn {
  const [sheetState, setSheetState] = useState<SheetState>(initialState);
  
  // Toggle between sheet states
  const toggleSheetState = () => {
    setSheetState(prev => {
      if (prev === 'collapsed') return 'half';
      if (prev === 'half') return 'full';
      return 'collapsed';
    });
  };
  
  // Listen for back button to collapse sheet
  useEffect(() => {
    const handleBackButton = (e: PopStateEvent) => {
      if (sheetState === 'full') {
        setSheetState('half');
        e.preventDefault();
        window.history.pushState(null, '', window.location.pathname);
      } else if (sheetState === 'half') {
        setSheetState('collapsed');
        e.preventDefault();
        window.history.pushState(null, '', window.location.pathname);
      }
    };
    
    // Add history state on mount
    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handleBackButton);
    
    return () => {
      window.removeEventListener('popstate', handleBackButton);
    };
  }, [sheetState]);
  
  return {
    sheetState,
    setSheetState,
    toggleSheetState
  };
}
