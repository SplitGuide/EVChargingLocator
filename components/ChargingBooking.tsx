import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ConnectorType } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, addMinutes } from "date-fns";
import { ChargingStation } from "@shared/schema";
import { Loader2 } from "lucide-react";

interface ChargingBookingProps {
  stationId: number;
  locationId: number;
  userId?: number;
}

export default function ChargingBooking({
  stationId,
  locationId,
  userId,
}: ChargingBookingProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("09:00");
  const [duration, setDuration] = useState(30);
  const [selectedConnector, setSelectedConnector] = useState<ConnectorType | "">("");
  const [selectedVehicle, setSelectedVehicle] = useState<number | undefined>();
  const { toast } = useToast();

  // Get station details
  const { data: station, isLoading: isStationLoading } = useQuery<ChargingStation>({
    queryKey: ["/api/charging-stations", stationId],
    enabled: isOpen,
  });

  // Get user vehicles
  const { data: vehicles = [], isLoading: isVehiclesLoading } = useQuery({
    queryKey: [`/api/users/${userId}/vehicles`],
    enabled: !!userId && isOpen,
  });

  // Calculate end time based on duration
  const getEndTime = () => {
    if (!selectedDate || !selectedTime) return null;
    
    const [hours, minutes] = selectedTime.split(":").map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);
    
    return addMinutes(startTime, duration);
  };

  // Format the booking time range for display
  const getBookingTimeText = () => {
    if (!selectedDate || !selectedTime) return "";
    
    const [hours, minutes] = selectedTime.split(":").map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = addMinutes(startTime, duration);
    
    return `${format(startTime, "EEEE, MMM d, yyyy")}, ${format(startTime, "h:mm a")} - ${format(endTime, "h:mm a")}`;
  };

  // Calculate price based on station rate and duration
  const calculatePrice = () => {
    if (!station) return 0;
    
    // Price per kWh * charging speed (kW) * hours
    const pricePerKwh = station.pricePerKwh || 15; // Default to ₹15 if not specified
    const chargingSpeed = station.powerKw;
    const hours = duration / 60;
    
    // Estimate energy consumption
    const energyKwh = chargingSpeed * hours;
    
    return pricePerKwh * energyKwh;
  };

  // Create booking mutation
  const bookingMutation = useMutation({
    mutationFn: async (bookingData: {
      userId: number;
      stationId: number;
      vehicleId: number;
      startTime: Date;
      endTime: Date;
      connectorType: ConnectorType;
    }) => {
      const response = await apiRequest("POST", `/api/charging-stations/${stationId}/book`, bookingData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/charging-stations", stationId] });
      toast({
        title: "Booking confirmed!",
        description: "Your charging slot has been reserved.",
        variant: "success",
      });
      setIsOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Booking failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleBookingSubmit = () => {
    if (!userId) {
      toast({
        title: "Authentication required",
        description: "Please log in to book a charging slot",
        variant: "destructive",
      });
      return;
    }

    if (!selectedVehicle) {
      toast({
        title: "Vehicle required",
        description: "Please select or register a vehicle",
        variant: "destructive",
      });
      return;
    }

    if (!selectedConnector) {
      toast({
        title: "Connector type required",
        description: "Please select a connector type",
        variant: "destructive",
      });
      return;
    }

    if (!selectedDate || !selectedTime) {
      toast({
        title: "Time selection required",
        description: "Please select a date and time",
        variant: "destructive",
      });
      return;
    }

    const [hours, minutes] = selectedTime.split(":").map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = addMinutes(startTime, duration);

    bookingMutation.mutate({
      userId,
      stationId,
      vehicleId: selectedVehicle,
      startTime,
      endTime,
      connectorType: selectedConnector as ConnectorType,
    });
  };

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedDate(new Date());
      setSelectedTime("09:00");
      setDuration(30);
      setSelectedConnector("");
      
      // Auto-select vehicle if user has only one
      if (vehicles?.length === 1) {
        setSelectedVehicle(vehicles[0].id);
      } else {
        setSelectedVehicle(undefined);
      }
    }
  }, [isOpen, vehicles]);

  // Generate time slot options
  const timeSlots = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const formattedHour = hour.toString().padStart(2, "0");
      const formattedMinute = minute.toString().padStart(2, "0");
      timeSlots.push(`${formattedHour}:${formattedMinute}`);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">Book Charging Slot</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Book a Charging Slot</DialogTitle>
          <DialogDescription>
            Reserve your charging time slot at this station.
          </DialogDescription>
        </DialogHeader>

        {isStationLoading || isVehiclesLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            {/* Vehicle Selection */}
            <div className="grid gap-2">
              <label htmlFor="vehicle" className="text-sm font-medium">
                Select Your Vehicle
              </label>
              {vehicles.length > 0 ? (
                <Select
                  value={selectedVehicle?.toString()}
                  onValueChange={(value) => setSelectedVehicle(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Your Vehicles</SelectLabel>
                      {vehicles.map((vehicle) => (
                        <SelectItem
                          key={vehicle.id}
                          value={vehicle.id.toString()}
                        >
                          {vehicle.nickname || `${vehicle.make} ${vehicle.model}`}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              ) : (
                <div className="rounded-md bg-yellow-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <div className="text-yellow-400">⚠️</div>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        No vehicles registered
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>You need to register a vehicle before booking.</p>
                      </div>
                      <div className="mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsOpen(false);
                            window.location.href = "/vehicle-registration";
                          }}
                        >
                          Register Vehicle
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Connector Selection */}
            {station && (
              <div className="grid gap-2">
                <label htmlFor="connector" className="text-sm font-medium">
                  Connector Type
                </label>
                <Select
                  value={selectedConnector}
                  onValueChange={(value) => setSelectedConnector(value as ConnectorType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a connector type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Available Connectors</SelectLabel>
                      {station.connectorTypes?.map((connector) => (
                        <SelectItem key={connector} value={connector}>
                          {connector}
                        </SelectItem>
                      )) || (
                        <SelectItem value="Type-2">Type-2</SelectItem>
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Date Selection */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="justify-start text-left font-normal"
                  >
                    {selectedDate ? (
                      format(selectedDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    disabled={(date) => {
                      // Disable past dates
                      return date < new Date();
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Selection */}
            <div className="grid gap-2">
              <label htmlFor="time" className="text-sm font-medium">
                Time
              </label>
              <Select
                value={selectedTime}
                onValueChange={setSelectedTime}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Available Times</SelectLabel>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {format(
                          new Date(
                            new Date().setHours(
                              parseInt(time.split(":")[0]),
                              parseInt(time.split(":")[1])
                            )
                          ),
                          "h:mm a"
                        )}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Duration Selection */}
            <div className="grid gap-2">
              <label htmlFor="duration" className="text-sm font-medium">
                Duration
              </label>
              <Select
                value={duration.toString()}
                onValueChange={(value) => setDuration(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Charging Duration</SelectLabel>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="180">3 hours</SelectItem>
                    <SelectItem value="240">4 hours</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Booking Summary */}
            {selectedDate && selectedTime && station && (
              <div className="mt-4 bg-blue-50 rounded-md p-4">
                <h3 className="font-medium text-blue-900 mb-2">
                  Booking Summary
                </h3>
                <div className="space-y-2 text-sm text-blue-800">
                  <div>
                    <span className="font-medium">Time:</span>{" "}
                    {getBookingTimeText()}
                  </div>
                  <div>
                    <span className="font-medium">Station:</span>{" "}
                    {station.operatorName} (Power: {station.powerKw} kW)
                  </div>
                  {selectedConnector && (
                    <div>
                      <span className="font-medium">Connector:</span>{" "}
                      {selectedConnector}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Estimated Price:</span>{" "}
                    ₹{calculatePrice().toFixed(2)}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={bookingMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleBookingSubmit}
            disabled={
              bookingMutation.isPending ||
              !selectedVehicle ||
              !selectedConnector ||
              !selectedDate ||
              !selectedTime
            }
          >
            {bookingMutation.isPending ? "Booking..." : "Confirm Booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}