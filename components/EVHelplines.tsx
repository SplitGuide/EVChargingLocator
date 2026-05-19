import React from 'react';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { HelpCircle, Phone } from 'lucide-react';
import { SiTata, SiMahindra, SiHyundai } from "react-icons/si";
import { FaCarBattery } from "react-icons/fa";

// EV manufacturer helpline data
const evHelplines = [
  {
    name: "Tata Motors EV",
    icon: SiTata,
    color: "#2563eb", // blue-600
    number: "1800-209-8282",
    description: "24x7 Customer Support"
  },
  {
    name: "Mahindra Electric",
    icon: SiMahindra,
    color: "#dc2626", // red-600
    number: "1800-266-1155",
    description: "Roadside Assistance"
  },
  {
    name: "Ather Energy",
    icon: FaCarBattery,
    color: "#16a34a", // green-600
    number: "1800-258-4377",
    description: "Customer Support"
  },
  {
    name: "Hyundai EV",
    icon: SiHyundai,
    color: "#0891b2", // cyan-600
    number: "1800-114-645",
    description: "Customer Care"
  },
  {
    name: "MG Motor ZS EV",
    icon: FaCarBattery,
    color: "#c026d3", // purple-600
    number: "1800-100-6464",
    description: "Roadside Support"
  },
  {
    name: "Hero Electric",
    icon: FaCarBattery,
    color: "#ea580c", // orange-600
    number: "1800-120-9363",
    description: "Technical Support"
  }
];

const EVHelplines = ({ className }: { className?: string }) => {
  return (
    <div className={className}>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <Phone size={16} className="text-primary" />
            <span className="hidden sm:inline-block">EV Helplines</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0">
          <div className="p-4 bg-primary/5 border-b">
            <div className="font-medium flex items-center">
              <HelpCircle size={16} className="mr-2 text-primary" />
              EV Manufacturer Helplines
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              24/7 Roadside Assistance & Support
            </p>
          </div>
          <div className="p-2">
            {evHelplines.map((company) => (
              <div 
                key={company.name}
                className="flex items-center p-2 hover:bg-muted rounded-md transition-colors"
              >
                <div 
                  className="w-8 h-8 flex items-center justify-center rounded-full mr-3"
                  style={{ color: company.color }}
                >
                  <company.icon size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium">{company.name}</h3>
                  <p className="text-xs text-muted-foreground">{company.description}</p>
                </div>
                <a 
                  href={`tel:${company.number.replace(/-/g, '')}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {company.number}
                </a>
              </div>
            ))}
          </div>
          <div className="p-2 border-t text-center">
            <p className="text-xs text-muted-foreground">
              Call for immediate roadside assistance or technical support
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default EVHelplines;