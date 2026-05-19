import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export default function OfflineNotification() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    // Update online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  if (isOnline) return null;
  
  return (
    <div className="fixed top-4 left-4 right-4 bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded shadow-md z-50">
      <div className="flex">
        <div className="flex-shrink-0">
          <span className="material-icons text-yellow-500">wifi_off</span>
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            You are currently offline. Some features may be limited.
          </p>
        </div>
      </div>
    </div>
  );
}
