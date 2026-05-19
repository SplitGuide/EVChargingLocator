import React, { useState, useEffect } from 'react';
import { Zap, Battery, BatteryCharging, BatteryMedium, BatteryFull } from 'lucide-react';
import { Link } from 'wouter';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const Logo: React.FC<LogoProps> = ({ size = 'md' }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState(0);
  const [batteryIcon, setBatteryIcon] = useState<React.ReactNode>(<Battery />);

  // Simulate battery charging animation
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (isHovered || isClicked) {
      interval = setInterval(() => {
        setBatteryLevel(prev => {
          const newLevel = prev + 5;
          if (newLevel >= 100) {
            return 100;
          }
          return newLevel;
        });
      }, 150);
    } else {
      // Reset battery level when not hovering
      setBatteryLevel(0);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isHovered, isClicked]);

  // Update battery icon based on level
  useEffect(() => {
    if (batteryLevel === 0) {
      setBatteryIcon(<Battery className="text-white" />);
    } else if (batteryLevel < 40) {
      setBatteryIcon(<BatteryCharging className="text-white animate-pulse" />);
    } else if (batteryLevel < 80) {
      setBatteryIcon(<BatteryMedium className="text-white" />);
    } else {
      setBatteryIcon(<BatteryFull className="text-white" />);
    }
  }, [batteryLevel]);

  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl'
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24
  };

  return (
    <Link href="/">
      <div 
        className="flex items-center space-x-2 cursor-pointer group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsClicked(false);
        }}
        onClick={() => setIsClicked(prev => !prev)}
      >
        <div 
          className={`relative flex items-center justify-center bg-green-500 p-1 rounded-md transition-all duration-300 
            ${isHovered || isClicked ? 'bg-green-600 shadow-lg scale-110' : ''}
            ${isClicked ? 'animate-bounce' : ''}`
          }
        >
          {isHovered || isClicked ? (
            <>
              {batteryIcon}
              {/* Show little sparks when charging */}
              {batteryLevel > 0 && batteryLevel < 100 && (
                <>
                  <span className="absolute -top-1 -right-1 text-yellow-300 text-xs animate-ping">⚡</span>
                  <span className="absolute -bottom-1 -left-1 text-yellow-300 text-xs animate-ping delay-100">⚡</span>
                </>
              )}
            </>
          ) : (
            <Zap size={iconSizes[size]} className="text-white" />
          )}
        </div>
        
        <div className="relative">
          <div 
            className={`font-bold ${sizeClasses[size]} bg-gradient-to-r from-green-500 to-green-700 bg-clip-text text-transparent transition-all duration-300
              ${isHovered || isClicked ? 'scale-105' : ''}`
            }
          >
            EV Charge
          </div>

          {/* Show percentage when hovering */}
          {isHovered && batteryLevel > 0 && (
            <div 
              className="absolute -bottom-4 left-0 text-xs font-semibold text-green-500 transition-opacity duration-200"
              style={{ opacity: batteryLevel / 100 }}
            >
              {batteryLevel}% charged
            </div>
          )}

          {/* Show fully charged message */}
          {batteryLevel === 100 && (
            <div className="absolute -bottom-4 left-0 text-xs font-semibold text-green-600 animate-pulse">
              Fully charged! ✓
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default Logo;