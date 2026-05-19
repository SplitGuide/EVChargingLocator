import React from 'react';
import { Helmet } from 'react-helmet';
import { SiTata, SiMahindra, SiHyundai } from "react-icons/si";
import { FaCarBattery } from "react-icons/fa";
import { Phone, HelpCircle, MapPin, Clock, Info } from 'lucide-react';

// EV Vehicle Manufacturer Helplines
const manufacturerHelplines = [
  {
    name: "Tata Motors EV",
    icon: SiTata,
    color: "#2563eb", // blue-600
    number: "1800-209-8282",
    description: "24x7 Customer Support",
    address: "Bombay House, 24 Homi Mody Street, Mumbai - 400001",
    hours: "24/7 Emergency Assistance",
    website: "https://ev.tatamotors.com/service-network/"
  },
  {
    name: "Mahindra Electric",
    icon: SiMahindra,
    color: "#dc2626", // red-600
    number: "1800-266-1155",
    description: "Roadside Assistance",
    address: "Mahindra & Mahindra Ltd, Mahindra Towers, Mumbai - 400018",
    hours: "Monday to Saturday: 9 AM to 6 PM, Sunday: Emergency Only",
    website: "https://www.mahindraelectric.com/support/"
  },
  {
    name: "Ather Energy",
    icon: FaCarBattery,
    color: "#16a34a", // green-600
    number: "1800-258-4377",
    description: "Customer Support",
    address: "3rd Floor, Tower D, IBC Knowledge Park, Bengaluru - 560029",
    hours: "8 AM to 8 PM, Emergency support available 24/7",
    website: "https://www.atherenergy.com/service"
  },
  {
    name: "Hyundai EV",
    icon: SiHyundai,
    color: "#0891b2", // cyan-600
    number: "1800-114-645",
    description: "Customer Care",
    address: "Hyundai Motor India Ltd, New Delhi - 110017",
    hours: "24/7 Customer Support",
    website: "https://www.hyundai.com/in/en/connect-to-service/customer-service"
  },
  {
    name: "MG Motor ZS EV",
    icon: FaCarBattery,
    color: "#c026d3", // purple-600
    number: "1800-100-6464",
    description: "Roadside Support",
    address: "MG Motor India Pvt Ltd, Gurugram - 122002",
    hours: "Monday to Sunday: 8 AM to 8 PM, 24/7 Emergency Assistance",
    website: "https://www.mgmotor.co.in/tools/roadside-assistance"
  },
  {
    name: "Hero Electric",
    icon: FaCarBattery,
    color: "#ea580c", // orange-600
    number: "1800-120-9363",
    description: "Technical Support",
    address: "Hero Electric Vehicles Pvt. Ltd, New Delhi - 110020",
    hours: "9 AM to 6 PM, Monday to Saturday",
    website: "https://www.heroelectric.com/reach-us"
  }
];

// EV Charging Station Service Provider Helplines
const serviceProviderHelplines = [
  {
    name: "Tata Power EZ Charge",
    icon: FaCarBattery,
    color: "#0f766e", // teal-700
    number: "1800-209-3455",
    description: "Charging Network Support",
    address: "Bombay House, 24 Homi Mody Street, Mumbai - 400001",
    hours: "24/7 Technical Support",
    website: "https://www.tatapower.com/businesses/our-businesses/Ez-charge.aspx"
  },
  {
    name: "Fortum Charge & Drive",
    icon: FaCarBattery,
    color: "#0369a1", // sky-700
    number: "1800-419-2020",
    description: "Charging Station Support",
    address: "Plot No. 11, Block B, Sector 33, Gurgaon - 122001",
    hours: "8 AM to 10 PM, All days",
    website: "https://www.fortum.in/charge-and-drive-india"
  },
  {
    name: "EESL",
    icon: FaCarBattery,
    color: "#1e40af", // blue-800
    number: "1800-180-3580",
    description: "Electric Vehicle Charging Services",
    address: "5th & 6th Floor, Core-3, SCOPE Complex, Lodhi Road, New Delhi - 110003",
    hours: "9 AM to 6 PM, Monday to Friday",
    website: "https://eeslindia.org/en/charging-infrastructure/"
  },
  {
    name: "Ather Grid",
    icon: FaCarBattery,
    color: "#15803d", // green-700
    number: "7676 600 900",
    description: "Charging Network Assistance",
    address: "3rd Floor, Tower D, IBC Knowledge Park, Bengaluru - 560029",
    hours: "9 AM to 9 PM, All days",
    website: "https://www.atherenergy.com/grid"
  },
  {
    name: "Statiq",
    icon: FaCarBattery,
    color: "#a855f7", // purple-500
    number: "1800-2122-020",
    description: "EV Charging Network",
    address: "9th Floor, Bestech Business Tower, Gurugram - 122002",
    hours: "24/7 App-based Support",
    website: "https://statiq.in/"
  },
  {
    name: "Kazam",
    icon: FaCarBattery,
    color: "#ca8a04", // yellow-600
    number: "888-835-2926",
    description: "EV Charging Solutions",
    address: "91Springboard, JP Nagar, Bengaluru - 560078",
    hours: "10 AM to 7 PM, Monday to Saturday",
    website: "https://www.kazam.in/"
  },
  {
    name: "Reliance BP Mobility - Jio-bp Pulse",
    icon: FaCarBattery,
    color: "#be123c", // rose-700
    number: "1800-419-5555",
    description: "Charging Station Network",
    address: "Maker Chambers IV, Nariman Point, Mumbai - 400021",
    hours: "24/7 Customer Support",
    website: "https://www.jio-bp.com/mobility-stations"
  },
  {
    name: "Magenta ChargeGrid",
    icon: FaCarBattery,
    color: "#be185d", // pink-700
    number: "1800-267-2248",
    description: "EV Charging Network",
    address: "Shah Industrial Estate, Andheri West, Mumbai - 400053",
    hours: "9 AM to 8 PM, All days",
    website: "https://www.magentamobility.com/"
  }
];

// State-wise emergency helplines
const stateHelplines = [
  { state: "Maharashtra", number: "022-22664232", police: "100" },
  { state: "Delhi", number: "011-23010101", police: "100" },
  { state: "Karnataka", number: "112", police: "100" },
  { state: "Tamil Nadu", number: "044-28888060", police: "100" },
  { state: "Gujarat", number: "079-23250818", police: "100" },
  { state: "Kerala", number: "0471-2552056", police: "100" },
  { state: "Andhra Pradesh", number: "0863-2340152", police: "100" },
  { state: "Telangana", number: "040-27852500", police: "100" }
];

const EmergencyHelplines = () => {
  return (
    <>
      <Helmet>
        <title>EV Helplines | EV Charging Station Finder</title>
      </Helmet>
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 flex items-center">
          <Phone className="mr-2 text-red-500" size={28} />
          EV Helplines & Emergency Contacts
        </h1>
        
        <div className="grid grid-cols-1 gap-8">
          {/* Manufacturer Helplines Section */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 bg-blue-600/10 border-b">
              <h2 className="text-xl font-bold flex items-center">
                <FaCarBattery className="mr-2 text-blue-600" size={20} />
                EV Vehicle Manufacturer Helplines
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Contact your vehicle manufacturer for dedicated support and roadside assistance
              </p>
            </div>
            
            <div className="divide-y">
              {manufacturerHelplines.map((company) => (
                <div key={company.name} className="p-4 hover:bg-muted/30">
                  <div className="flex items-center mb-3">
                    <div 
                      className="w-10 h-10 flex items-center justify-center rounded-full mr-3 flex-shrink-0"
                      style={{ backgroundColor: `${company.color}15`, color: company.color }}
                    >
                      <company.icon size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{company.name}</h3>
                      <p className="text-sm text-muted-foreground">{company.description}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-2">
                    <div className="flex items-start">
                      <Phone size={16} className="mr-2 mt-0.5 text-primary flex-shrink-0" />
                      <div>
                        <p className="font-medium">{company.number}</p>
                        <a 
                          href={`tel:${company.number.replace(/-/g, '')}`}
                          className="text-xs text-primary hover:underline"
                        >
                          Call now
                        </a>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <Clock size={16} className="mr-2 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <p className="text-sm">{company.hours}</p>
                    </div>
                    
                    <div className="flex items-start">
                      <MapPin size={16} className="mr-2 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <p className="text-sm">{company.address}</p>
                    </div>
                    
                    <div className="flex items-start">
                      <Info size={16} className="mr-2 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <a 
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Visit website
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Charging Station Service Provider Helplines */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 bg-green-600/10 border-b">
              <h2 className="text-xl font-bold flex items-center">
                <HelpCircle size={20} className="mr-2 text-green-600" />
                EV Charging Station Service Provider Helplines
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Contact charging station operators for assistance with charging-related issues
              </p>
            </div>
            
            <div className="divide-y">
              {serviceProviderHelplines.map((provider) => (
                <div key={provider.name} className="p-4 hover:bg-muted/30">
                  <div className="flex items-center mb-3">
                    <div 
                      className="w-10 h-10 flex items-center justify-center rounded-full mr-3 flex-shrink-0"
                      style={{ backgroundColor: `${provider.color}15`, color: provider.color }}
                    >
                      <provider.icon size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{provider.name}</h3>
                      <p className="text-sm text-muted-foreground">{provider.description}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-2">
                    <div className="flex items-start">
                      <Phone size={16} className="mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="font-medium">{provider.number}</p>
                        <a 
                          href={`tel:${provider.number.replace(/-/g, '')}`}
                          className="text-xs text-green-600 hover:underline"
                        >
                          Call now
                        </a>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <Clock size={16} className="mr-2 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <p className="text-sm">{provider.hours}</p>
                    </div>
                    
                    <div className="flex items-start">
                      <MapPin size={16} className="mr-2 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <p className="text-sm">{provider.address}</p>
                    </div>
                    
                    <div className="flex items-start">
                      <Info size={16} className="mr-2 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <a 
                        href={provider.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-green-600 hover:underline"
                      >
                        Visit website
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Emergency Contacts Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
              <div className="p-4 bg-red-500/10 border-b">
                <h2 className="text-xl font-bold flex items-center">
                  <Phone size={20} className="mr-2 text-red-500" />
                  Emergency Numbers
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  National emergency helplines for immediate assistance
                </p>
              </div>
              
              <div className="p-4">
                <ul className="space-y-4">
                  <li className="flex items-center">
                    <div className="bg-red-100 p-2 rounded-full mr-3">
                      <Phone size={18} className="text-red-500" />
                    </div>
                    <div>
                      <h3 className="font-medium">National Emergency Number</h3>
                      <a href="tel:112" className="text-xl font-bold text-red-500">
                        112
                      </a>
                    </div>
                  </li>
                  <li className="flex items-center">
                    <div className="bg-blue-100 p-2 rounded-full mr-3">
                      <Phone size={18} className="text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-medium">Police</h3>
                      <a href="tel:100" className="text-xl font-bold text-blue-500">
                        100
                      </a>
                    </div>
                  </li>
                  <li className="flex items-center">
                    <div className="bg-green-100 p-2 rounded-full mr-3">
                      <Phone size={18} className="text-green-500" />
                    </div>
                    <div>
                      <h3 className="font-medium">Ambulance</h3>
                      <a href="tel:108" className="text-xl font-bold text-green-500">
                        108
                      </a>
                    </div>
                  </li>
                  <li className="flex items-center">
                    <div className="bg-orange-100 p-2 rounded-full mr-3">
                      <Phone size={18} className="text-orange-500" />
                    </div>
                    <div>
                      <h3 className="font-medium">Fire</h3>
                      <a href="tel:101" className="text-xl font-bold text-orange-500">
                        101
                      </a>
                    </div>
                  </li>
                  <li className="flex items-center">
                    <div className="bg-purple-100 p-2 rounded-full mr-3">
                      <Phone size={18} className="text-purple-500" />
                    </div>
                    <div>
                      <h3 className="font-medium">Women Helpline</h3>
                      <a href="tel:1091" className="text-xl font-bold text-purple-500">
                        1091
                      </a>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
            
            {/* State-wise helpline numbers */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-4 bg-blue-500/10 border-b">
                <h2 className="text-xl font-bold flex items-center">
                  <MapPin size={20} className="mr-2 text-blue-500" />
                  State-wise Emergency Contacts
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Important contacts for major Indian states
                </p>
              </div>
              
              <div className="p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {stateHelplines.map((state) => (
                    <div key={state.state} className="border rounded-md p-3 hover:bg-muted/30">
                      <h3 className="font-medium">{state.state}</h3>
                      <div className="flex items-center mt-2">
                        <Phone size={14} className="mr-1 text-blue-500" />
                        <a href={`tel:${state.number}`} className="text-sm text-blue-500 hover:underline">
                          {state.number}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h2 className="font-bold text-lg flex items-center">
            <Info size={18} className="mr-2 text-yellow-600" />
            Tips for Roadside Emergencies with EVs
          </h2>
          <ul className="list-disc list-inside mt-3 space-y-2 text-sm">
            <li>If your EV stops working, try to safely move to the side of the road.</li>
            <li>Call your manufacturer's dedicated EV helpline for the most appropriate assistance.</li>
            <li>Do not attempt to jump-start or repair high-voltage components of your EV.</li>
            <li>If the vehicle needs to be towed, ensure a flatbed truck is used to prevent damage.</li>
            <li>Have an emergency contact list saved in your phone with your EV's helpline number.</li>
            <li>Keep your charging cables and emergency kit accessible at all times.</li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default EmergencyHelplines;