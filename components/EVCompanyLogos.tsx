import React from 'react';
import { motion } from 'framer-motion';
import { SiTata, SiMahindra } from 'react-icons/si';
import { HiLightningBolt } from 'react-icons/hi';
import { FaChargingStation } from 'react-icons/fa';
import { GiCarWheel } from 'react-icons/gi';

// Array of EV charging companies in India
const evCompanies = [
  {
    name: "Tata Power",
    icon: SiTata,
    color: "#2563eb" // blue-600
  },
  {
    name: "Ather Energy",
    icon: GiCarWheel,
    color: "#16a34a" // green-600
  },
  {
    name: "ChargeGrid",
    icon: FaChargingStation,
    color: "#9333ea" // purple-600
  },
  {
    name: "BPCL",
    icon: FaChargingStation,
    color: "#c2410c" // orange-700
  },
  {
    name: "Statiq",
    icon: HiLightningBolt,
    color: "#0891b2" // cyan-600
  },
  {
    name: "Mahindra Electric",
    icon: SiMahindra,
    color: "#db2777" // pink-600
  }
];

interface EVCompanyLogosProps {
  className?: string;
}

const EVCompanyLogos: React.FC<EVCompanyLogosProps> = ({ className }) => {
  return (
    <div className={`relative ${className}`}>
      <div className="w-full h-64 flex items-center justify-center">
        {/* Circular motion for logos */}
        <div className="relative w-52 h-52">
          {evCompanies.map((company, index) => {
            // Calculate position around the circle
            const angle = (index * 2 * Math.PI) / evCompanies.length;
            const radius = 120; // Distance from center in pixels
            
            return (
              <motion.div
                key={company.name}
                className="absolute rounded-full p-2 shadow-lg bg-white flex items-center justify-center"
                style={{
                  width: "60px",
                  height: "60px",
                  top: "50%",
                  left: "50%",
                  marginLeft: "-30px",
                  marginTop: "-30px",
                }}
                initial={{
                  x: Math.cos(angle) * radius,
                  y: Math.sin(angle) * radius,
                  opacity: 0,
                  scale: 0.5,
                }}
                animate={{
                  x: Math.cos(angle) * radius,
                  y: Math.sin(angle) * radius,
                  opacity: 1,
                  scale: 1,
                  rotate: [0, 10, 0, -10, 0], // Slight wiggle animation
                }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.2,
                  rotate: {
                    repeat: Infinity,
                    repeatType: "reverse",
                    duration: 2,
                    ease: "easeInOut",
                    delay: index * 0.3 + 1,
                  }
                }}
              >
                <company.icon size={32} color={company.color} />
              </motion.div>
            );
          })}
          
          {/* Center circle with animation */}
          <motion.div 
            className="absolute top-1/2 left-1/2 w-24 h-24 bg-gradient-to-r from-primary to-primary-dark rounded-full flex items-center justify-center text-white"
            style={{
              marginLeft: "-48px",
              marginTop: "-48px",
            }}
            initial={{ scale: 0 }}
            animate={{ 
              scale: 1,
              boxShadow: ["0px 0px 0px rgba(0,0,0,0.1)", "0px 0px 30px rgba(0,0,0,0.2)", "0px 0px 0px rgba(0,0,0,0.1)"]
            }}
            transition={{ 
              duration: 1,
              delay: 0.8,
              boxShadow: {
                repeat: Infinity,
                duration: 2,
              }
            }}
          >
            <FaChargingStation size={36} />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default EVCompanyLogos;