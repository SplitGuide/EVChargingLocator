import { SiTata } from "react-icons/si";
import { FcElectricity } from "react-icons/fc";
import { FaGasPump, FaOilCan, FaBolt, FaChargingStation } from "react-icons/fa";
import { IoCarSportSharp } from "react-icons/io5";
import { TbAirConditioning } from "react-icons/tb";

export function getProviderLogo(providerId: string) {
  // Make the provider ID lowercase for better matching
  const id = providerId.toLowerCase();
  
  // Return appropriate icons based on provider
  if (id.includes('tata') || id.includes('tata-power')) {
    return <SiTata className="h-4 w-4 text-blue-600" />;
  } else if (id.includes('bp') || id.includes('jio') || id.includes('jio-bp')) {
    return <FaGasPump className="h-4 w-4 text-green-600" />;
  } else if (id.includes('ionity') || id.includes('charge-zone') || id.includes('chargezone')) {
    return <FaBolt className="h-4 w-4 text-purple-500" />;
  } else if (id.includes('bpcl') || id.includes('efill')) {
    return <FaGasPump className="h-4 w-4 text-green-500" />;
  } else if (id.includes('mg') || id.includes('mgmotor')) {
    return <IoCarSportSharp className="h-4 w-4 text-red-500" />;
  } else if (id.includes('cosmos') || id.includes('evcosmos')) {
    return <TbAirConditioning className="h-4 w-4 text-blue-400" />;
  } else if (id.includes('hyundai')) {
    return <IoCarSportSharp className="h-4 w-4 text-blue-600" />;
  } else if (id.includes('hpcl') || id.includes('hindustan')) {
    return <FaChargingStation className="h-4 w-4 text-orange-500" />;
  }
  
  // Default for unknown providers
  return <FcElectricity className="h-4 w-4" />;
}