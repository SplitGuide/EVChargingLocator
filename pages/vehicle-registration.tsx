import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ConnectorType, VehicleType } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Checkbox,
  CheckboxGroup,
  CheckboxItem,
} from "@/components/ui/checkbox";

// Popular EV models in India
const popularEvs = [
  { make: "Tata", model: "Nexon EV", type: "suv", batteryCapacityKwh: 30.2, rangeKm: 312, connectorTypes: ["CCS-2", "Type-2"] },
  { make: "Tata", model: "Tigor EV", type: "sedan", batteryCapacityKwh: 26, rangeKm: 306, connectorTypes: ["CCS-2", "Type-2"] },
  { make: "MG", model: "ZS EV", type: "suv", batteryCapacityKwh: 50.3, rangeKm: 461, connectorTypes: ["CCS-2", "Type-2"] },
  { make: "Hyundai", model: "Kona Electric", type: "suv", batteryCapacityKwh: 39.2, rangeKm: 452, connectorTypes: ["CCS-2", "Type-2"] },
  { make: "Mahindra", model: "XUV400", type: "suv", batteryCapacityKwh: 39.4, rangeKm: 456, connectorTypes: ["CCS-2", "Type-2"] },
  { make: "BYD", model: "e6", type: "suv", batteryCapacityKwh: 71.7, rangeKm: 415, connectorTypes: ["CCS-2", "Type-2"] },
  { make: "Ather", model: "450X", type: "motorcycle", batteryCapacityKwh: 3.7, rangeKm: 150, connectorTypes: ["Bharat AC"] },
  { make: "Ola Electric", model: "S1 Pro", type: "motorcycle", batteryCapacityKwh: 3.97, rangeKm: 181, connectorTypes: ["Bharat AC"] },
  { make: "TVS", model: "iQube", type: "motorcycle", batteryCapacityKwh: 4.4, rangeKm: 140, connectorTypes: ["Bharat AC"] },
  { make: "Bajaj", model: "Chetak", type: "motorcycle", batteryCapacityKwh: 3, rangeKm: 95, connectorTypes: ["Bharat AC"] },
];

const vehicleSchema = z.object({
  make: z.string().min(1, "Manufacturer is required"),
  model: z.string().min(1, "Model is required"),
  year: z.number().min(2010, "Year must be 2010 or later").max(new Date().getFullYear() + 1),
  type: z.enum(["sedan", "suv", "hatchback", "motorcycle"]),
  batteryCapacityKwh: z.number().min(1, "Battery capacity must be at least 1 kWh"),
  rangeKm: z.number().min(1, "Range must be at least 1 km"),
  registrationNumber: z.string().optional(),
  connectorTypes: z.array(z.enum(["CCS-2", "CHAdeMO", "Type-2", "Bharat AC", "Bharat DC"])).min(1, "Select at least one connector type"),
  nickname: z.string().optional(),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

export default function VehicleRegistration() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedPopularEv, setSelectedPopularEv] = useState<string | null>(null);

  // Get user info
  const { data: user } = useQuery({
    queryKey: ["/api/user"],
  });

  const form = useForm<VehicleFormValues>({
    defaultValues: {
      make: "",
      model: "",
      year: new Date().getFullYear(),
      type: "sedan",
      batteryCapacityKwh: 0,
      rangeKm: 0,
      registrationNumber: "",
      connectorTypes: [],
      nickname: "",
    },
  });

  // Create vehicle mutation
  const createVehicleMutation = useMutation({
    mutationFn: async (data: VehicleFormValues & { userId: number }) => {
      const response = await apiRequest("POST", "/api/vehicles", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/vehicles`] });
      toast({
        title: "Vehicle registered successfully",
        description: "Your EV has been added to your profile",
        variant: "success",
      });
      navigate("/profile");
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: VehicleFormValues) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please login to register your vehicle",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    createVehicleMutation.mutate({
      ...data,
      userId: user.id,
    });
  };

  const handlePopularEvSelect = (value: string) => {
    setSelectedPopularEv(value);
    const [make, model] = value.split("|");
    const selectedEv = popularEvs.find(ev => ev.make === make && ev.model === model);
    
    if (selectedEv) {
      form.setValue("make", selectedEv.make);
      form.setValue("model", selectedEv.model);
      form.setValue("type", selectedEv.type as VehicleType);
      form.setValue("batteryCapacityKwh", selectedEv.batteryCapacityKwh);
      form.setValue("rangeKm", selectedEv.rangeKm);
      form.setValue("connectorTypes", selectedEv.connectorTypes as ConnectorType[]);
    }
  };

  return (
    <div className="container max-w-4xl py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Register Your Electric Vehicle</CardTitle>
          <CardDescription>
            Add details about your EV to find compatible charging stations and track your usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Select a popular EV model</h3>
            <Select onValueChange={handlePopularEvSelect} value={selectedPopularEv || ""}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a popular EV model or enter details manually" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Cars</SelectLabel>
                  {popularEvs
                    .filter(ev => ev.type !== "motorcycle")
                    .map(ev => (
                      <SelectItem key={`${ev.make}|${ev.model}`} value={`${ev.make}|${ev.model}`}>
                        {ev.make} {ev.model}
                      </SelectItem>
                    ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Two-Wheelers</SelectLabel>
                  {popularEvs
                    .filter(ev => ev.type === "motorcycle")
                    .map(ev => (
                      <SelectItem key={`${ev.make}|${ev.model}`} value={`${ev.make}|${ev.model}`}>
                        {ev.make} {ev.model}
                      </SelectItem>
                    ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="make"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manufacturer</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Tata, Hyundai" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Nexon EV, Kona" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Model year"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Type</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vehicle type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sedan">Sedan</SelectItem>
                          <SelectItem value="suv">SUV</SelectItem>
                          <SelectItem value="hatchback">Hatchback</SelectItem>
                          <SelectItem value="motorcycle">Two-Wheeler</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="batteryCapacityKwh"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Battery Capacity (kWh)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g. 30.2"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rangeKm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Range (km)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g. 350"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="registrationNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. MH01AB1234" {...field} />
                      </FormControl>
                      <FormDescription>
                        Your vehicle's registration number will be kept private
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nickname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nickname (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. My Blue Lightning" {...field} />
                      </FormControl>
                      <FormDescription>
                        A friendly name for your vehicle
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="connectorTypes"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel>Compatible Connector Types</FormLabel>
                      <FormDescription>
                        Select all connector types compatible with your vehicle
                      </FormDescription>
                    </div>
                    <CheckboxGroup
                      value={form.watch("connectorTypes")}
                      onChange={(values) => form.setValue("connectorTypes", values as ConnectorType[])}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <CheckboxItem value="CCS-2">
                          <div className="flex flex-col">
                            <span>CCS-2</span>
                            <span className="text-xs text-gray-500">Combined Charging System</span>
                          </div>
                        </CheckboxItem>
                        <CheckboxItem value="CHAdeMO">
                          <div className="flex flex-col">
                            <span>CHAdeMO</span>
                            <span className="text-xs text-gray-500">Charge de Move</span>
                          </div>
                        </CheckboxItem>
                        <CheckboxItem value="Type-2">
                          <div className="flex flex-col">
                            <span>Type-2</span>
                            <span className="text-xs text-gray-500">Mennekes</span>
                          </div>
                        </CheckboxItem>
                        <CheckboxItem value="Bharat AC">
                          <div className="flex flex-col">
                            <span>Bharat AC</span>
                            <span className="text-xs text-gray-500">Indian Standard AC</span>
                          </div>
                        </CheckboxItem>
                        <CheckboxItem value="Bharat DC">
                          <div className="flex flex-col">
                            <span>Bharat DC</span>
                            <span className="text-xs text-gray-500">Indian Standard DC</span>
                          </div>
                        </CheckboxItem>
                      </div>
                    </CheckboxGroup>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={createVehicleMutation.isPending}
              >
                {createVehicleMutation.isPending
                  ? "Registering Vehicle..."
                  : "Register Vehicle"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => navigate("/")}>
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}