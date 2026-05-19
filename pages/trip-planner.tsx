import React, { useState } from 'react';
import { TripPlanner } from '@/components/TripPlanner';
import { getDirections } from '@/lib/directionsService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MapPin, Route, Zap, Navigation, ArrowRight, ExternalLink, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Trip data interface
interface TripRoute {
  id: string;
  name: string;
  startPoint: string;
  endPoint: string;
  startCoords: { lat: number; lng: number };
  endCoords: { lat: number; lng: number };
  distance: string;
  duration: string;
  description: string;
  color: string;
}

const TripPlannerPage = () => {
  const [selectedTrip, setSelectedTrip] = useState<TripRoute | null>(null);
  const [isDirectionsOpen, setIsDirectionsOpen] = useState(false);
  const [directions, setDirections] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Popular Indian road trips data with coordinates
  const popularTrips: TripRoute[] = [
    {
      id: 'delhi-jaipur',
      name: 'Delhi to Jaipur',
      startPoint: 'Delhi',
      endPoint: 'Jaipur',
      startCoords: { lat: 28.6139, lng: 77.2090 },
      endCoords: { lat: 26.9124, lng: 75.7873 },
      distance: '280 km',
      duration: '~5 hrs with charging',
      description: 'The Golden Triangle route with multiple charging options.',
      color: 'from-blue-400 to-blue-600'
    },
    {
      id: 'mumbai-pune',
      name: 'Mumbai to Pune',
      startPoint: 'Mumbai',
      endPoint: 'Pune',
      startCoords: { lat: 19.0760, lng: 72.8777 },
      endCoords: { lat: 18.5204, lng: 73.8567 },
      distance: '150 km',
      duration: '~3 hrs with charging',
      description: 'A popular weekend getaway with good charging infrastructure.',
      color: 'from-green-400 to-green-600'
    },
    {
      id: 'bangalore-chennai',
      name: 'Bangalore to Chennai',
      startPoint: 'Bangalore',
      endPoint: 'Chennai',
      startCoords: { lat: 12.9716, lng: 77.5946 },
      endCoords: { lat: 13.0827, lng: 80.2707 },
      distance: '350 km',
      duration: '~7 hrs with charging',
      description: 'A tech corridor drive with numerous charging options.',
      color: 'from-purple-400 to-purple-600'
    },
    {
      id: 'ahmedabad-udaipur',
      name: 'Ahmedabad to Udaipur',
      startPoint: 'Ahmedabad',
      endPoint: 'Udaipur',
      startCoords: { lat: 23.0225, lng: 72.5714 },
      endCoords: { lat: 24.5854, lng: 73.7125 },
      distance: '262 km',
      duration: '~5.5 hrs with charging',
      description: 'A beautiful route through Gujarat into Rajasthan with growing EV infrastructure.',
      color: 'from-amber-400 to-amber-600'
    },
    {
      id: 'kochi-munnar',
      name: 'Kochi to Munnar',
      startPoint: 'Kochi',
      endPoint: 'Munnar',
      startCoords: { lat: 9.9312, lng: 76.2673 },
      endCoords: { lat: 10.0889, lng: 77.0595 },
      distance: '130 km',
      duration: '~4 hrs with charging',
      description: 'Scenic hill station route with tea plantations and charging options along the way.',
      color: 'from-red-400 to-red-600'
    },
    {
      id: 'chennai-pondicherry',
      name: 'Chennai to Pondicherry',
      startPoint: 'Chennai',
      endPoint: 'Pondicherry',
      startCoords: { lat: 13.0827, lng: 80.2707 },
      endCoords: { lat: 11.9139, lng: 79.8145 },
      distance: '170 km',
      duration: '~3.5 hrs with charging',
      description: 'A scenic coastal drive along the East Coast Road (ECR) with charging stations.',
      color: 'from-teal-400 to-teal-600'
    },
    {
      id: 'chandigarh-shimla',
      name: 'Chandigarh to Shimla',
      startPoint: 'Chandigarh',
      endPoint: 'Shimla',
      startCoords: { lat: 30.7333, lng: 76.7794 },
      endCoords: { lat: 31.1048, lng: 77.1734 },
      distance: '115 km',
      duration: '~3.5 hrs with charging',
      description: 'A mountain drive to the summer capital with developing EV infrastructure.',
      color: 'from-indigo-400 to-indigo-600'
    },
    {
      id: 'kolkata-digha',
      name: 'Kolkata to Digha',
      startPoint: 'Kolkata',
      endPoint: 'Digha',
      startCoords: { lat: 22.5726, lng: 88.3639 },
      endCoords: { lat: 21.6238, lng: 87.5519 },
      distance: '185 km',
      duration: '~4 hrs with charging',
      description: 'A popular beach destination route with new charging infrastructure being developed.',
      color: 'from-pink-400 to-pink-600'
    },
    {
      id: 'hyderabad-warangal',
      name: 'Hyderabad to Warangal',
      startPoint: 'Hyderabad',
      endPoint: 'Warangal',
      startCoords: { lat: 17.3850, lng: 78.4867 },
      endCoords: { lat: 18.0000, lng: 79.5800 },
      distance: '145 km',
      duration: '~3 hrs with charging',
      description: 'A cultural heritage route with growing EV infrastructure along the highway.',
      color: 'from-emerald-400 to-emerald-600'
    }
  ];

  // Function to get directions for a trip
  const showDirections = async (trip: TripRoute) => {
    setSelectedTrip(trip);
    setIsLoading(true);
    setIsDirectionsOpen(true);

    try {
      const result = await getDirections(
        trip.startCoords,
        trip.endCoords
      );

      if (result && result.routes && result.routes.length > 0) {
        setDirections(result);
      } else {
        toast({
          title: "Directions not available",
          description: "Could not retrieve directions for this route. Please try again later.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error getting directions:", error);
      toast({
        title: "Error",
        description: "Could not retrieve directions. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to open this trip in Google Maps
  const openInGoogleMaps = (trip: TripRoute) => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${trip.startCoords.lat},${trip.startCoords.lng}&destination=${trip.endCoords.lat},${trip.endCoords.lng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  // Function to pre-fill trip planner with this route
  const planThisTrip = (trip: TripRoute) => {
    // This would normally open the trip planner with pre-filled data
    // For now, just show a notification
    toast({
      title: "Trip Planner",
      description: `Planning ${trip.name} route with EV charging options`,
    });
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Trip Planner</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Plan Your EV Journey</CardTitle>
            <CardDescription>Calculate routes with optimal charging stops</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>The trip planner helps you:</p>
            <ul className="space-y-2 list-disc pl-5">
              <li>Find the most efficient route for your journey</li>
              <li>Locate convenient charging stations along your path</li>
              <li>Estimate travel time including charging stops</li>
              <li>Save and manage your frequent trips</li>
            </ul>
            
            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <TripPlanner />
              <Button variant="outline" className="flex items-center gap-1">
                <Zap className="h-4 w-4" />
                Saved Trips
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-5 w-5 text-green-600" />
              Trip Planning Tips
            </CardTitle>
            <CardDescription>For a smooth EV journey experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">Start with a full charge</h3>
              <p className="text-sm text-gray-600">Begin your trip with a 100% battery to maximize range.</p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium">Plan charging stops strategically</h3>
              <p className="text-sm text-gray-600">Aim to arrive at charging stations with 15-20% battery remaining.</p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium">Consider charging amenities</h3>
              <p className="text-sm text-gray-600">Choose stops with restaurants, restrooms, or other services.</p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium">Account for charging time</h3>
              <p className="text-sm text-gray-600">Fast charging typically takes 30-45 minutes to reach 80%.</p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium">Monitor your range</h3>
              <p className="text-sm text-gray-600">Weather, speed, and terrain can affect actual driving range.</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Popular Road Trips in India</CardTitle>
            <CardDescription>Discover EV-friendly routes across the country</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {popularTrips.map((trip) => (
                <Card key={trip.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <div 
                    className={`h-48 bg-gradient-to-r ${trip.color} flex items-center justify-center cursor-pointer`}
                    onClick={() => showDirections(trip)}
                  >
                    <MapPin className="h-10 w-10 text-white" />
                  </div>
                  <CardContent className="pt-4">
                    <h3 className="font-bold mb-1">{trip.name}</h3>
                    <p className="text-sm text-gray-500 mb-2">{trip.distance} | {trip.duration}</p>
                    <p className="text-sm">{trip.description}</p>
                  </CardContent>
                  <CardFooter className="flex justify-between pt-1 pb-3">
                    <Button size="sm" variant="outline" onClick={() => showDirections(trip)}>
                      <Route className="h-4 w-4 mr-1" />
                      View Route
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openInGoogleMaps(trip)}>
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Open Maps
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Directions Dialog */}
      <Dialog open={isDirectionsOpen} onOpenChange={setIsDirectionsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTrip?.name} Directions
            </DialogTitle>
            <DialogDescription>
              Route details and turn-by-turn directions
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-sm text-gray-500">Loading directions...</p>
            </div>
          ) : directions ? (
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">From: {selectedTrip?.startPoint}</p>
                    <p className="text-sm text-gray-600">
                      {directions.routes[0]?.legs[0]?.start_address}
                    </p>
                  </div>
                </div>

                <div className="my-2 ml-2.5 border-l-2 border-dashed border-gray-300 h-10"></div>
                
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium">To: {selectedTrip?.endPoint}</p>
                    <p className="text-sm text-gray-600">
                      {directions.routes[0]?.legs[0]?.end_address}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">Trip Summary</h3>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center">
                      <Route className="h-4 w-4 mr-1 text-gray-500" />
                      <span>{directions.routes[0]?.legs[0]?.distance?.text}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1 text-gray-500" />
                      <span>{directions.routes[0]?.legs[0]?.duration?.text}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3 mt-4">
                  <h3 className="font-medium">Turn-by-turn directions</h3>
                  <ol className="space-y-3">
                    {directions.routes[0]?.legs[0]?.steps.map((step: any, index: number) => (
                      <li key={index} className="flex gap-3 pb-3 border-b border-gray-100">
                        <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p dangerouslySetInnerHTML={{ __html: step.html_instructions }}></p>
                          <p className="text-xs text-gray-500 mt-1">
                            {step.distance?.text} · {step.duration?.text}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setIsDirectionsOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => planThisTrip(selectedTrip!)}>
                  <Navigation className="h-4 w-4 mr-2" />
                  Plan This Trip
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No directions available</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TripPlannerPage;