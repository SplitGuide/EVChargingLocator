import { useState, useCallback, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Loader2, Clock, Zap, IndianRupee, Star, Phone, 
  Navigation, Calendar, Image, Upload, X, MessageCircle,
  MapPin, Map as MapIcon, Target, Locate, RefreshCw,
  Coffee, Car, Bath, Wifi, ShoppingBag, Armchair, ShieldCheck,
  HelpCircle, CreditCard, RotateCw, Tag, Info, FileImage,
  Plus, Check, AlertTriangle, Link
} from "lucide-react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "@/hooks/use-location";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getProviderLogo } from "@/lib/providerLogos";
import GoogleMapComponent from "@/components/GoogleMapComponent";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ChargingBooking from "@/components/ChargingBooking";
import { ConnectorType } from "@shared/schema";

interface StationDetailsProps {
  userId?: number;
}

// Review form schema
const reviewFormSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().min(10, "Comment must be at least 10 characters").max(500, "Comment cannot exceed 500 characters"),
  photoUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
});

type ReviewFormValues = z.infer<typeof reviewFormSchema>;



// Main map component
interface MapContentProps {
  stationLocation: {
    latitude: number;
    longitude: number;
    name: string;
  };
  stationName: string;
}

function MapContent({ stationLocation, stationName }: MapContentProps) {
  const { toast } = useToast();
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [nearbyStations, setNearbyStations] = useState<any[]>([]);
  const [isLoadingStations, setIsLoadingStations] = useState(false);
  const [searchRadius, setSearchRadius] = useState<number>(30);
  const [filterOptions, setFilterOptions] = useState<{
    showRestaurants: boolean;
    showHotels: boolean;
    showRestrooms: boolean;
  }>({
    showRestaurants: false,
    showHotels: false,
    showRestrooms: false,
  });
  const [amenities, setAmenities] = useState<any[]>([]);
  
  // Initial fetch of nearby stations
  useEffect(() => {
    fetchNearbyStations(stationLocation.latitude, stationLocation.longitude);
  }, [stationLocation.latitude, stationLocation.longitude]);
  
  // Handle amenity type filter changes
  useEffect(() => {
    if (userLocation) {
      fetchAmenities(userLocation[0], userLocation[1]);
    } else if (stationLocation) {
      fetchAmenities(stationLocation.latitude, stationLocation.longitude);
    }
  }, [filterOptions, searchRadius]);
  
  // Fetch nearby charging stations
  const fetchNearbyStations = useCallback(async (lat: number, lng: number) => {
    setIsLoadingStations(true);
    try {
      const response = await fetch(`/api/locations/nearby?latitude=${lat}&longitude=${lng}&radius=${searchRadius}&type=charging`);
      const data = await response.json();
      
      // Filter out current station
      const filteredStations = data.filter((station: any) => 
        !(Math.abs(station.latitude - stationLocation.latitude) < 0.0001 && 
          Math.abs(station.longitude - stationLocation.longitude) < 0.0001)
      );
      
      setNearbyStations(filteredStations);
      
      // Also fetch amenities if filters are active
      if (filterOptions.showRestaurants || filterOptions.showHotels || filterOptions.showRestrooms) {
        fetchAmenities(lat, lng);
      }
    } catch (error) {
      console.error("Error fetching nearby stations:", error);
      toast({
        title: "Error",
        description: "Failed to load nearby stations",
        variant: "destructive",
      });
    } finally {
      setIsLoadingStations(false);
    }
  }, [stationLocation, toast, searchRadius, filterOptions]);
  
  // Fetch nearby amenities
  const fetchAmenities = useCallback(async (lat: number, lng: number) => {
    const amenitiesArray: any[] = [];
    
    try {
      if (filterOptions.showRestaurants) {
        const response = await fetch(`/api/locations/nearby?latitude=${lat}&longitude=${lng}&radius=${searchRadius}&type=restaurant`);
        const data = await response.json();
        amenitiesArray.push(...data.map((item: any) => ({ ...item, amenityType: 'restaurant' })));
      }
      
      if (filterOptions.showHotels) {
        const response = await fetch(`/api/locations/nearby?latitude=${lat}&longitude=${lng}&radius=${searchRadius}&type=hotel`);
        const data = await response.json();
        amenitiesArray.push(...data.map((item: any) => ({ ...item, amenityType: 'hotel' })));
      }
      
      if (filterOptions.showRestrooms) {
        const response = await fetch(`/api/locations/nearby?latitude=${lat}&longitude=${lng}&radius=${searchRadius}&type=restroom`);
        const data = await response.json();
        amenitiesArray.push(...data.map((item: any) => ({ ...item, amenityType: 'restroom' })));
      }
      
      setAmenities(amenitiesArray);
    } catch (error) {
      console.error("Error fetching amenities:", error);
    }
  }, [searchRadius, filterOptions]);
  
  // When user location is found
  const handleLocationFound = useCallback((lat: number, lng: number) => {
    setUserLocation([lat, lng]);
    // Fetch nearby stations when user location is found
    fetchNearbyStations(lat, lng);
  }, [fetchNearbyStations]);
  
  // Get driving directions to station
  const getDirections = useCallback((lat: number, lng: number) => {
    if (userLocation) {
      const [userLat, userLng] = userLocation;
      window.open(
        `https://www.google.com/maps/dir/${userLat},${userLng}/${lat},${lng}`,
        "_blank"
      );
    } else {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
        "_blank"
      );
    }
  }, [userLocation]);
  
  // Toggle filter options
  const toggleFilter = useCallback((filter: keyof typeof filterOptions) => {
    setFilterOptions(prev => ({
      ...prev,
      [filter]: !prev[filter]
    }));
  }, []);
  
  // Get label for amenity type
  const getAmenityLabel = useCallback((type: string) => {
    switch(type) {
      case 'restaurant':
        return 'Restaurant';
      case 'hotel':
        return 'Hotel/Lodging';
      case 'restroom':
        return 'Restroom';
      default:
        return 'Amenity';
    }
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          className="bg-green-50 hover:bg-green-100 border-green-200 transition-all duration-300 hover:scale-105 hover:shadow-md"
          onClick={() => getDirections(stationLocation.latitude, stationLocation.longitude)}
        >
          <MapPin className="h-4 w-4 mr-2 text-green-600 animate-pulse" />
          Directions to Station
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!userLocation}
          onClick={() => fetchNearbyStations(
            userLocation ? userLocation[0] : stationLocation.latitude,
            userLocation ? userLocation[1] : stationLocation.longitude
          )}
          className="bg-blue-50 hover:bg-blue-100 border-blue-200 transition-all duration-300 hover:scale-105 hover:shadow-md"
        >
          <Target className="h-4 w-4 mr-2 text-blue-600 transition-transform duration-500 hover:rotate-180" />
          Find Nearby
        </Button>

      </div>
      
      {/* Filter options */}
      <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 rounded-md border">
        <div className="flex-1">
          <p className="text-sm font-medium mb-2">Search radius: {searchRadius} km</p>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              className="h-7 w-7 p-0 transition-all duration-300 hover:bg-red-100 hover:text-red-700 hover:scale-110 active:scale-90"
              onClick={() => setSearchRadius(prev => Math.max(5, prev - 5))}
            >-</Button>
            <div className="flex-1 h-2 bg-gray-200 rounded-full relative overflow-hidden">
              <div 
                className="h-2 bg-primary rounded-full transition-all duration-500 ease-in-out" 
                style={{ width: `${(searchRadius - 5) / 45 * 100}%` }}
              ></div>
              <div className="absolute top-0 left-0 w-full h-full opacity-30 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse"></div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              className="h-7 w-7 p-0 transition-all duration-300 hover:bg-green-100 hover:text-green-700 hover:scale-110 active:scale-90"
              onClick={() => setSearchRadius(prev => Math.min(50, prev + 5))}
            >+</Button>
          </div>
        </div>
        
        <Separator orientation="vertical" />
        
        <div className="flex flex-col">
          <p className="text-sm font-medium mb-2">Show nearby:</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className={`transition-all duration-300 hover:scale-105 hover:shadow-md ${
                filterOptions.showRestaurants 
                ? "bg-amber-100 text-amber-800 border-amber-200 scale-105" 
                : ""
              }`}
              onClick={() => toggleFilter('showRestaurants')}
            >
              <span className="mr-1 animate-bounce inline-block">🍽️</span> Restaurants
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`transition-all duration-300 hover:scale-105 hover:shadow-md ${
                filterOptions.showHotels 
                ? "bg-indigo-100 text-indigo-800 border-indigo-200 scale-105" 
                : ""
              }`}
              onClick={() => toggleFilter('showHotels')}
            >
              <span className="mr-1 animate-pulse inline-block">🏨</span> Hotels
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`transition-all duration-300 hover:scale-105 hover:shadow-md ${
                filterOptions.showRestrooms 
                ? "bg-cyan-100 text-cyan-800 border-cyan-200 scale-105" 
                : ""
              }`}
              onClick={() => toggleFilter('showRestrooms')}
            >
              <span className="mr-1 animate-bounce inline-block">🚻</span> Restrooms
            </Button>
          </div>
        </div>
      </div>
      
      <div className="h-96 relative border rounded-md overflow-hidden">
        <GoogleMapComponent 
          stationLocation={stationLocation}
          stationName={stationName}
          nearbyStations={nearbyStations}
          amenities={amenities}
          userLocation={userLocation}
          searchRadius={searchRadius}
          onLocationFound={handleLocationFound}
          getDirections={getDirections}
          getAmenityLabel={getAmenityLabel}
        />
        
        {/* Legend */}
        <div className="absolute bottom-2 right-2 bg-white p-3 rounded-md shadow-md text-xs z-[1000]">
          <h4 className="font-semibold mb-2">Map Legend</h4>
          <div className="grid gap-1">
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-green-600 mr-2"></div>
              <span>Current station</span>
            </div>
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-blue-500 mr-2"></div>
              <span>Your location</span>
            </div>
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-gray-500 opacity-70 mr-2"></div>
              <span>Other charging stations</span>
            </div>
            {filterOptions.showRestaurants && (
              <div className="flex items-center">
                <div className="h-3 w-3 rounded-full bg-amber-500 mr-2"></div>
                <span>Restaurants</span>
              </div>
            )}
            {filterOptions.showHotels && (
              <div className="flex items-center">
                <div className="h-3 w-3 rounded-full bg-indigo-500 mr-2"></div>
                <span>Hotels</span>
              </div>
            )}
            {filterOptions.showRestrooms && (
              <div className="flex items-center">
                <div className="h-3 w-3 rounded-full bg-cyan-500 mr-2"></div>
                <span>Restrooms</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Stats about nearby locations */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-md border p-3 bg-green-50 hover:shadow-md transition-all duration-300 hover:scale-[1.02] cursor-default">
          <h4 className="text-sm font-medium mb-1 flex items-center">
            <Zap className="h-4 w-4 mr-1 text-green-600 animate-pulse" />
            <span>Charging Stations</span>
          </h4>
          <p className="text-lg font-semibold transition-all duration-500">{nearbyStations.length}</p>
          <p className="text-xs text-gray-600">Within {searchRadius} km radius</p>
        </div>
        
        {(filterOptions.showRestaurants || filterOptions.showHotels || filterOptions.showRestrooms) && (
          <div className="rounded-md border p-3 bg-blue-50 hover:shadow-md transition-all duration-300 hover:scale-[1.02] cursor-default">
            <h4 className="text-sm font-medium mb-1 flex items-center">
              <MapPin className="h-4 w-4 mr-1 text-blue-600 animate-bounce" />
              <span>Nearby Amenities</span>
            </h4>
            <p className="text-lg font-semibold transition-all duration-500">{amenities.length}</p>
            <p className="text-xs text-gray-600">
              {[
                filterOptions.showRestaurants ? 'Restaurants' : null,
                filterOptions.showHotels ? 'Hotels' : null,
                filterOptions.showRestrooms ? 'Restrooms' : null
              ].filter(Boolean).join(', ')}
            </p>
          </div>
        )}
        
        <div className="rounded-md border p-3 bg-gray-50 hover:shadow-md transition-all duration-300 hover:scale-[1.02] cursor-default">
          <h4 className="text-sm font-medium mb-1 flex items-center">
            <Target className="h-4 w-4 mr-1 text-gray-600 animate-ping" style={{ animationDuration: '3s' }} />
            <span>Search Area</span>
          </h4>
          <p className="text-lg font-semibold transition-all duration-500">{searchRadius} km</p>
          <p className="text-xs text-gray-600">
            {userLocation ? 'From your current location' : 'From charging station'}
          </p>
        </div>
      </div>
    </div>
  );
}

// LocationPhoto type to match backend schema
interface LocationPhoto {
  id: number;
  locationId: number;
  url: string;
  source?: string | null;
  caption?: string | null;
  created?: string | null;
}

// Photo type for managing multiple uploads
interface PhotoFile {
  id: string;
  file: File;
  url: string;
  progress: number;
  status: 'queue' | 'uploading' | 'success' | 'error';
  caption?: string;
  tags?: string[];
  category?: 'exterior' | 'connector' | 'amenity' | 'access' | 'other';
  errorMessage?: string;
}

// Convert a file to a base64 string
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// Resize image for better performance
const resizeImage = async (file: File, maxWidth: number = 1200, maxHeight: number = 1200, quality: number = 0.7): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = document.createElement('img');
      if (event.target?.result) {
        img.src = event.target.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round(height * maxWidth / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round(width * maxHeight / height);
              height = maxHeight;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas to Blob conversion failed'));
            }
          }, file.type, quality);
        };
        img.onerror = () => reject(new Error('Image loading error'));
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => reject(new Error('FileReader error'));
  });
};

export default function StationDetails({ userId }: StationDetailsProps) {
  const [, params] = useRoute("/stations/:id");
  const stationId = params?.id ? parseInt(params.id) : undefined;
  const { toast } = useToast();
  const { getCurrentPosition } = useLocation();
  const [activeTab, setActiveTab] = useState("info");
  const [showAddPhotoModal, setShowAddPhotoModal] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewPhotoUrl, setReviewPhotoUrl] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  
  // Enhanced photo upload state
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadOption, setUploadOption] = useState<'file' | 'url'>('file');
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [imageQuality, setImageQuality] = useState(70);
  const [photoCategory, setPhotoCategory] = useState<string>('exterior');
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoTags, setPhotoTags] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Add review mutation
  const handleReviewSubmit = async () => {
    if (!stationId) return;
    
    // Simple validation
    if (reviewComment.length < 10) {
      toast({
        title: "Validation Error",
        description: "Comment must be at least 10 characters long",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmittingReview(true);
    
    try {
      const payload = {
        locationId: stationId,
        userId: userId || 1, // Use authenticated user ID or default to 1 for demo
        rating: reviewRating,
        comment: reviewComment,
        photos: reviewPhotoUrl ? [reviewPhotoUrl] : []
      };
      
      await apiRequest("POST", `/api/locations/${stationId}/reviews`, payload);
      
      // Invalidate query cache to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/locations/${stationId}`] });
      
      // Close modal and reset form
      setShowReviewModal(false);
      setReviewRating(5);
      setReviewComment("");
      setReviewPhotoUrl("");
      
      toast({
        title: "Review submitted",
        description: "Thank you for your feedback!",
      });
    } catch (error: any) {
      toast({
        title: "Error submitting review",
        description: error.message || "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };
  
  // Fetch station details with safety checks
  const { data: stationData, isLoading: isStationLoading } = useQuery({
    queryKey: [`/api/locations/${stationId}`],
    enabled: !!stationId,
    // We need to make sure we don't try to access undefined/null data
    staleTime: 1000 * 60 * 5, // Cache data for 5 minutes
    retry: 2, // Retry up to 2 times if the request fails
  });
  
  // Fetch detailed location photos
  const { data: locationPhotos, isLoading: isPhotosLoading } = useQuery<LocationPhoto[]>({
    queryKey: [`/api/locations/${stationId}/photos`],
    enabled: !!stationId,
    staleTime: 1000 * 60 * 5, // Cache data for 5 minutes
  });
  
  // Add photo mutation
  const addPhotoMutation = useMutation({
    mutationFn: async () => {
      if (!stationId || !photoUrl) return;
      
      const response = await apiRequest("POST", `/api/locations/${stationId}/photos`, {
        photoUrl: photoUrl,
        caption: photoCaption,
        source: 'user-uploaded'
      });
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate query cache to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/locations/${stationId}`] });
      
      // Close modal and reset form
      setShowAddPhotoModal(false);
      setPhotoUrl("");
      setIsUploading(false);
      
      toast({
        title: "Photo added",
        description: "Your photo has been added to this station",
      });
    },
    onError: (error: any) => {
      setIsUploading(false);
      toast({
        title: "Error adding photo",
        description: error.message || "Failed to add photo. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Handle file selection
  const handleFileSelection = async (files: File[]) => {
    // Limit number of files
    const maxFiles = 10;
    if (photos.length + files.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `You can upload a maximum of ${maxFiles} photos at once.`,
        variant: "destructive",
      });
      return;
    }
    
    // Validate file size and type
    const maxSize = 5 * 1024 * 1024; // 5MB
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    
    const validFiles = [];
    const invalidFiles = [];
    
    for (const file of files) {
      if (file.size > maxSize) {
        invalidFiles.push(`${file.name} (too large, max 5MB)`);
        continue;
      }
      
      if (!validTypes.includes(file.type)) {
        invalidFiles.push(`${file.name} (invalid type, must be JPG, PNG or WebP)`);
        continue;
      }
      
      validFiles.push(file);
    }
    
    if (invalidFiles.length > 0) {
      toast({
        title: `${invalidFiles.length} invalid file(s)`,
        description: invalidFiles.join(', '),
        variant: "destructive",
      });
    }
    
    // Process valid files
    for (const file of validFiles) {
      try {
        // Create a temporary URL for preview
        const url = URL.createObjectURL(file);
        
        // Add to photos array
        const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
        setPhotos(prev => [...prev, {
          id,
          file,
          url,
          progress: 0,
          status: 'queue',
        }]);
        
        // Mark the first photo as selected
        if (!selectedPhotoId && photos.length === 0 && validFiles.length > 0) {
          setSelectedPhotoId(id);
        }
      } catch (error) {
        console.error("Error processing file:", error);
      }
    }
  };
  
  // Handle photo upload
  const handleUploadPhotos = async () => {
    if (photos.length === 0) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    setUploadErrors([]);
    
    // Count photos that need upload
    const photosToUpload = photos.filter(p => p.status !== 'success').length;
    let uploadedCount = 0;
    let errorCount = 0;
    
    for (const photo of photos) {
      // Skip photos already uploaded
      if (photo.status === 'success') continue;
      
      // Update status to uploading
      setPhotos(prev => prev.map(p => 
        p.id === photo.id ? { ...p, status: 'uploading', progress: 0 } : p
      ));
      
      try {
        // Resize and optimize image
        let processedFile = photo.file;
        try {
          if (photo.file.size > 0) { // Don't resize URL-based images
            const resizedBlob = await resizeImage(
              photo.file, 
              1200, 
              1200, 
              imageQuality / 100
            );
            processedFile = new File([resizedBlob], photo.file.name, { type: photo.file.type });
          }
        } catch (error) {
          console.error("Error resizing image:", error);
          // Continue with original file if resizing fails
        }
        
        // Convert to base64 to send to backend
        let base64Data = '';
        if (photo.url.startsWith('blob:') || photo.url.startsWith('data:')) {
          base64Data = await fileToBase64(processedFile);
        } else {
          // It's a URL, just send it as is
          base64Data = photo.url;
        }
        
        // Apply metadata if available
        const photoData = {
          photoUrl: base64Data,
          caption: photo.caption,
          category: photo.category,
          tags: photo.tags,
          source: 'user-uploaded' // Mark as user-contributed photo
        };
        
        // Mock upload progress updates (since we're using the same API that doesn't support progress)
        const updateProgress = () => {
          const progress = Math.floor(Math.random() * 40) + 30; // Random between 30% and 70%
          setPhotos(prev => prev.map(p => 
            p.id === photo.id ? { ...p, progress } : p
          ));
        };
        
        // Start progress updates
        const progressInterval = setInterval(updateProgress, 300);
        setTimeout(updateProgress, 100); // Initial update
        
        // Send to backend
        const response = await apiRequest("POST", `/api/locations/${stationId}/photos`, photoData);
        
        // Stop progress updates
        clearInterval(progressInterval);
        
        // Update status to success
        setPhotos(prev => prev.map(p => 
          p.id === photo.id ? { ...p, status: 'success', progress: 100 } : p
        ));
        
        uploadedCount++;
      } catch (error: any) {
        // Handle error
        setPhotos(prev => prev.map(p => 
          p.id === photo.id ? { 
            ...p, 
            status: 'error', 
            progress: 0,
            errorMessage: error.message || "Failed to upload" 
          } : p
        ));
        
        setUploadErrors(prev => [...prev, `Failed to upload ${photo.file.name}: ${error.message || "Unknown error"}`]);
        
        errorCount++;
      }
      
      // Update overall progress
      setUploadProgress(Math.floor((uploadedCount + errorCount) / photosToUpload * 100));
    }
    
    // Final updates
    if (errorCount === 0) {
      toast({
        title: "Upload complete",
        description: `Successfully uploaded ${uploadedCount} photo${uploadedCount !== 1 ? 's' : ''}.`,
      });
      
      // Invalidate query cache to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/locations/${stationId}`] });
      
      // Close modal after a short delay to show success state
      setTimeout(() => {
        setShowAddPhotoModal(false);
        setPhotos([]);
        setPhotoUrl("");
        setSelectedPhotoId(null);
        setPhotoCategory("exterior");
        setPhotoCaption("");
        setIsUploading(false);
      }, 1500);
    } else {
      if (uploadedCount > 0) {
        toast({
          title: "Partial upload",
          description: `Uploaded ${uploadedCount} photo${uploadedCount !== 1 ? 's' : ''} successfully. ${errorCount} failed.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Upload failed",
          description: "All photos failed to upload. Please try again.",
          variant: "destructive",
        });
      }
      setIsUploading(false);
    }
  };
  
  // Original handleAddPhoto (kept for backward compatibility)
  const handleAddPhoto = () => {
    if (!photoUrl) {
      toast({
        title: "Missing information",
        description: "Please enter a valid photo URL",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    addPhotoMutation.mutate();
  };

  // Get directions to station
  const handleGetDirections = () => {
    if (!stationData?.location) {
      toast({
        title: "Error",
        description: "Station location not available",
        variant: "destructive",
      });
      return;
    }

    const { latitude, longitude } = stationData.location;
    getCurrentPosition();
    
    // Open Google Maps with directions
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    window.open(url, "_blank");
  };

  // Make a phone call
  const handleCall = () => {
    if (!stationData?.location.phoneNumber) {
      toast({
        title: "Error",
        description: "Phone number not available",
        variant: "destructive",
      });
      return;
    }

    window.location.href = `tel:${stationData.location.phoneNumber}`;
  };

  // Render connector type badges with safety check
  const renderConnectorBadges = (connectorTypes: ConnectorType[] | undefined) => {
    // If connectorTypes is undefined, empty or not an array, return empty array
    if (!connectorTypes || !Array.isArray(connectorTypes) || connectorTypes.length === 0) {
      return [];
    }
    
    return connectorTypes.map(type => {
      let color = "";
      switch (type) {
        case "CCS-2":
          color = "bg-blue-100 text-blue-800";
          break;
        case "CHAdeMO":
          color = "bg-purple-100 text-purple-800";
          break;
        case "Type-2":
          color = "bg-green-100 text-green-800";
          break;
        case "Bharat AC":
          color = "bg-amber-100 text-amber-800";
          break;
        case "Bharat DC":
          color = "bg-rose-100 text-rose-800";
          break;
        default:
          color = "bg-gray-100 text-gray-800";
      }
      
      return (
        <Badge key={type} className={`mr-2 ${color}`}>
          {type}
        </Badge>
      );
    });
  };

  if (isStationLoading || !stationData) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Loading station details...</p>
        </div>
      </div>
    );
  }

  // Safely extract properties with default values to prevent "Cannot read properties of undefined" errors
  const location = stationData?.location || {};
  const chargingStation = stationData?.chargingStation || {};
  const reviews = stationData?.reviews || [];
  
  // Create a consolidated photo array from both sources
  const photoData = locationPhotos || [];
  
  // Create a safe stationPhotos array with additional validation
  let stationPhotos: string[] = [];
  
  // First use the detailed photo data if available
  if (photoData && Array.isArray(photoData) && photoData.length > 0) {
    stationPhotos = photoData.map(photo => photo.url);
  } 
  // Fallback to legacy photos array if needed
  else if (stationData?.photos && Array.isArray(stationData.photos)) {
    // Filter out any invalid photo URLs
    stationPhotos = stationData.photos
      .filter((photo: any) => photo && typeof photo === 'string' && photo.trim() !== '')
      .map((photo: any) => photo.trim());
  }
  
  return (
    <div className="container px-4 py-8 max-w-6xl">
      {/* Enhanced Add Photo Modal */}
      <Dialog open={showAddPhotoModal} onOpenChange={setShowAddPhotoModal}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Photos to {location.name}</DialogTitle>
            <DialogDescription>
              Share photos of this charging station to help other EV owners. Good photos include charging ports, surroundings, amenities, and access points.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Upload option tabs */}
            <div className="flex mb-4 border rounded-md overflow-hidden">
              <button 
                className={`flex-1 py-2 px-4 text-sm font-medium ${uploadOption === 'file' ? 'bg-primary text-white' : 'bg-gray-50 hover:bg-gray-100'}`}
                onClick={() => setUploadOption('file')}
              >
                <FileImage className="h-4 w-4 inline-block mr-2" />
                Upload Images
              </button>
              <button 
                className={`flex-1 py-2 px-4 text-sm font-medium ${uploadOption === 'url' ? 'bg-primary text-white' : 'bg-gray-50 hover:bg-gray-100'}`}
                onClick={() => setUploadOption('url')}
              >
                <Link className="h-4 w-4 inline-block mr-2" />
                Image URL
              </button>
            </div>
            
            {/* File Upload Option */}
            {uploadOption === 'file' && (
              <div>
                {/* Drag and drop area */}
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                    isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary hover:bg-gray-50'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(false);
                    
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      const newFiles = Array.from(e.dataTransfer.files).filter(
                        file => file.type.startsWith('image/')
                      );
                      
                      if (newFiles.length === 0) {
                        toast({
                          title: "Invalid files",
                          description: "Please drop image files only (JPG, PNG, etc.)",
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      // Process the dropped files
                      handleFileSelection(newFiles);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm font-medium mb-1">Drag & drop your images here</p>
                  <p className="text-xs text-gray-500 mb-3">or click to browse files</p>
                  <Button size="sm" variant="outline" type="button" className="mx-auto">
                    Select Images
                  </Button>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*" 
                    multiple 
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const newFiles = Array.from(e.target.files);
                        handleFileSelection(newFiles);
                        e.target.value = ''; // Reset the input
                      }
                    }}
                  />
                </div>
                
                {/* Image quality slider */}
                <div className="mt-4 bg-gray-50 p-3 rounded-md border">
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="quality-slider" className="text-sm font-medium">Image Quality</Label>
                    <span className="text-xs font-medium">{imageQuality}%</span>
                  </div>
                  <Slider
                    id="quality-slider"
                    min={30}
                    max={100}
                    step={5}
                    value={[imageQuality]}
                    onValueChange={(value) => setImageQuality(value[0])}
                    className="py-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Lower quality reduces file size for faster uploads. Recommended: 70%
                  </p>
                </div>
              </div>
            )}
            
            {/* URL Option */}
            {uploadOption === 'url' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="photo-url" className="text-base font-medium">Photo URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="photo-url"
                      placeholder="https://example.com/my-ev-photo.jpg"
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (!photoUrl) {
                          toast({
                            title: "Missing URL",
                            description: "Please enter a valid image URL",
                            variant: "destructive",
                          });
                          return;
                        }
                        
                        // Create a "virtual" file from the URL
                        const id = Date.now().toString();
                        setPhotos(prev => [...prev, {
                          id,
                          file: new File([], "url-image.jpg", { type: 'image/jpeg' }),
                          url: photoUrl,
                          progress: 0,
                          status: 'queue',
                        }]);
                        setPhotoUrl("");
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {photoUrl && (
                  <div className="mt-2 border rounded-md overflow-hidden shadow-sm">
                    <div className="bg-gray-50 px-3 py-2 border-b">
                      <h4 className="text-sm font-medium">Preview</h4>
                    </div>
                    <div className="relative">
                      <img 
                        src={photoUrl} 
                        alt="Preview" 
                        className="w-full h-56 object-contain bg-gray-50 p-2"
                        onError={() => {
                          toast({
                            title: "Invalid image URL",
                            description: "Please enter a valid image URL",
                            variant: "destructive",
                          });
                          setPhotoUrl("");
                        }}
                      />
                      <button 
                        className="absolute top-2 right-2 p-1 bg-gray-800/70 rounded-full text-white hover:bg-gray-900/90 transition-colors"
                        onClick={() => setPhotoUrl("")}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Photo metadata fields (shown when photo is selected) */}
            {selectedPhotoId && (
              <div className="bg-gray-50 p-4 rounded-md border mt-4">
                <h4 className="text-sm font-medium mb-3">Photo Details</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="photo-category" className="text-sm">Category</Label>
                    <Select
                      value={photoCategory}
                      onValueChange={setPhotoCategory}
                    >
                      <SelectTrigger id="photo-category" className="mt-1">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="exterior">Exterior</SelectItem>
                        <SelectItem value="connector">Charging Connectors</SelectItem>
                        <SelectItem value="amenity">Amenities</SelectItem>
                        <SelectItem value="access">Access Points</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="photo-caption" className="text-sm">Caption (optional)</Label>
                    <Input
                      id="photo-caption"
                      placeholder="Describe what's in this photo..."
                      value={photoCaption}
                      onChange={(e) => setPhotoCaption(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="preserve-exif"
                      checked={false}
                      disabled
                    />
                    <Label htmlFor="preserve-exif" className="text-sm">Preserve EXIF data (disabled for privacy)</Label>
                  </div>
                </div>
              </div>
            )}
            
            {/* Photo guidelines */}
            <div className="bg-gray-50 p-3 rounded-md border">
              <h4 className="text-sm font-medium mb-2">Photo Guidelines:</h4>
              <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
                <li>Include clear images of charging ports and connectors</li>
                <li>Show the station surroundings and access points</li>
                <li>Photos of nearby amenities are helpful</li>
                <li>Avoid photos with personal information or license plates</li>
                <li>Maximum upload size: 5MB per image</li>
                <li>Supported formats: JPG, PNG, WebP</li>
              </ul>
            </div>
            
            {/* Photo preview grid */}
            {photos.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Photos to Upload ({photos.length})</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {photos.map((photo) => (
                    <div 
                      key={photo.id} 
                      className={`relative border rounded-md overflow-hidden ${
                        selectedPhotoId === photo.id ? 'ring-2 ring-primary' : ''
                      } ${
                        photo.status === 'error' ? 'border-red-300 bg-red-50' :
                        photo.status === 'success' ? 'border-green-300 bg-green-50' : 'border-gray-200'
                      }`}
                      onClick={() => setSelectedPhotoId(photo.id)}
                    >
                      <div className="relative pb-[75%]">
                        <img 
                          src={photo.url} 
                          alt="Preview" 
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={() => {
                            setPhotos(prev => prev.map(p => 
                              p.id === photo.id 
                                ? {...p, status: 'error', errorMessage: 'Failed to load image'} 
                                : p
                            ));
                          }}
                        />
                        
                        {/* Status indicators */}
                        {photo.status === 'uploading' && (
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-white" />
                          </div>
                        )}
                        
                        {photo.status === 'success' && (
                          <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        )}
                        
                        {photo.status === 'error' && (
                          <div className="absolute top-2 right-2 bg-red-500 rounded-full p-1">
                            <AlertTriangle className="h-4 w-4 text-white" />
                          </div>
                        )}
                        
                        {/* Progress bar */}
                        {photo.status === 'uploading' && (
                          <div className="absolute bottom-0 left-0 right-0">
                            <Progress value={photo.progress} className="h-1 rounded-none" />
                          </div>
                        )}
                        
                        {/* Remove button */}
                        <button 
                          className="absolute top-2 right-2 p-1 bg-gray-800/70 rounded-full text-white hover:bg-gray-900/90 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPhotos(prev => prev.filter(p => p.id !== photo.id));
                            if (selectedPhotoId === photo.id) {
                              setSelectedPhotoId(null);
                            }
                          }}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {/* Caption/category indicator */}
                      {(photo.caption || photo.category) && (
                        <div className="p-2 text-xs bg-white border-t">
                          {photo.category && (
                            <Badge variant="secondary" className="mb-1">{photo.category}</Badge>
                          )}
                          {photo.caption && (
                            <p className="truncate">{photo.caption}</p>
                          )}
                        </div>
                      )}
                      
                      {/* Error message */}
                      {photo.status === 'error' && photo.errorMessage && (
                        <div className="p-2 text-xs text-red-600 bg-white border-t">
                          {photo.errorMessage}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Overall upload progress */}
                {isUploading && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Overall progress</span>
                      <span className="text-sm">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}
                
                {/* Upload errors */}
                {uploadErrors.length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <h4 className="text-sm font-medium text-red-800 mb-1">Upload Errors:</h4>
                    <ul className="text-xs text-red-700 space-y-1 ml-4 list-disc">
                      {uploadErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAddPhotoModal(false);
                setPhotos([]);
                setPhotoUrl("");
                setSelectedPhotoId(null);
                setPhotoCategory("exterior");
                setPhotoCaption("");
                setUploadErrors([]);
              }}
              disabled={isUploading}
              className="sm:flex-1"
            >
              Cancel
            </Button>
            
            <Button 
              onClick={handleUploadPhotos}
              disabled={photos.length === 0 || isUploading}
              className="sm:flex-1"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                  Uploading ({photos.filter(p => p.status === 'success').length}/{photos.length})...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" /> 
                  Upload {photos.length} {photos.length === 1 ? 'Photo' : 'Photos'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Station Details */}
        <div className="md:col-span-2">
          <div className="mb-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center mb-1">
                  {location.source && (
                    <div className="mr-3 h-8 w-8 flex items-center justify-center">
                      {getProviderLogo(location.source)}
                    </div>
                  )}
                  <h1 className="text-3xl font-bold">{location.name}</h1>
                  {chargingStation.isAvailable !== undefined && (
                    <Badge className={`ml-3 ${chargingStation.isAvailable ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {chargingStation.isAvailable ? "Available" : "In Use"}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center flex-wrap text-gray-500 gap-1">
                  <span>{location.address},</span>
                  <span>{location.city},</span>
                  <span>{location.state}</span>
                  {chargingStation.networkName && (
                    <Badge variant="outline" className="ml-2 border-primary/30 text-primary">
                      {chargingStation.networkName}
                    </Badge>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center mt-3 gap-4">
                  {location.rating && (
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-500 mr-1" />
                      <span className="font-medium">{location.rating.toFixed(1)}</span>
                      <span className="text-sm text-gray-500 ml-1">({reviews.length} reviews)</span>
                    </div>
                  )}
                  
                  {location.isOpen !== undefined && (
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full ${location.isOpen ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                      <span className="text-sm">{location.isOpen ? "Open Now" : "Closed"}</span>
                    </div>
                  )}
                  
                  {location.openingHours && (
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-gray-500 mr-1" />
                      <span className="text-sm">{location.openingHours}</span>
                    </div>
                  )}
                  
                  {chargingStation.lastReported && (
                    <div className="text-xs text-gray-500">
                      Last updated: {new Date(chargingStation.lastReported).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="hidden md:flex gap-2">
                <Button size="sm" variant="outline" onClick={handleGetDirections}>
                  <Navigation className="h-4 w-4 mr-2" />
                  Directions
                </Button>
                {location.phoneNumber && (
                  <Button size="sm" variant="outline" onClick={handleCall}>
                    <Phone className="h-4 w-4 mr-2" />
                    Call
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Photo Gallery */}
          {stationPhotos && Array.isArray(stationPhotos) && stationPhotos.length > 0 && (
            <div className="mb-6">
              <Carousel className="w-full">
                <CarouselContent>
                  {photoData && photoData.length > 0 ? (
                    // Use enhanced photo data if available
                    photoData.map((photo, index) => (
                      <CarouselItem key={index}>
                        <div className="p-1">
                          <div className="overflow-hidden rounded-lg">
                            <div className="relative group">
                              <img
                                src={photo.url}
                                alt={photo.caption || `${location.name || 'Station'} - photo ${index + 1}`}
                                className="w-full h-64 object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.onerror = null; // Prevent infinite loop
                                  // Use a static data URI for the fallback to avoid external dependencies
                                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iI2YxZjVmOSIvPjx0ZXh0IHg9IjQwMCIgeT0iMzAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMzIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIiBmaWxsPSIjNjQ3NDhiIj5JbWFnZSB1bmF2YWlsYWJsZTwvdGV4dD48dGV4dCB4PSI0MDAiIHk9IjM0MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSIgZmlsbD0iIzY0NzQ4YiI+Q2hhcmdpbmcgc3RhdGlvbiBwaG90bzwvdGV4dD48L3N2Zz4=';
                                  target.classList.remove('object-cover');
                                  target.classList.add('object-contain', 'p-4');
                                }}
                              />
                              
                              {/* Photo overlay with info */}
                              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white p-2 transition-opacity duration-300 opacity-100 md:opacity-0 group-hover:opacity-100">
                                {photo.caption && (
                                  <p className="text-sm font-medium line-clamp-2">{photo.caption}</p>
                                )}
                                {photo.source && (
                                  <p className="text-xs opacity-80">
                                    Source: {photo.source === 'google-places' ? 'Google Places' : 
                                            photo.source === 'user-uploaded' ? 'User Uploaded' : 
                                            photo.source}
                                  </p>
                                )}
                                {photo.created && (
                                  <p className="text-xs opacity-70">
                                    Added: {new Date(photo.created).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CarouselItem>
                    ))
                  ) : (
                    // Fallback to simple photo URLs
                    stationPhotos.map((photo, index) => (
                      <CarouselItem key={index}>
                        <div className="p-1">
                          <div className="overflow-hidden rounded-lg">
                            <img
                              src={photo}
                              alt={`${location.name || 'Station'} - photo ${index + 1}`}
                              className="w-full h-64 object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null; // Prevent infinite loop
                                // Use a static data URI for the fallback to avoid external dependencies
                                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iI2YxZjVmOSIvPjx0ZXh0IHg9IjQwMCIgeT0iMzAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMzIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIiBmaWxsPSIjNjQ3NDhiIj5JbWFnZSB1bmF2YWlsYWJsZTwvdGV4dD48dGV4dCB4PSI0MDAiIHk9IjM0MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSIgZmlsbD0iIzY0NzQ4YiI+Q2hhcmdpbmcgc3RhdGlvbiBwaG90bzwvdGV4dD48L3N2Zz4=';
                                target.classList.remove('object-cover');
                                target.classList.add('object-contain', 'p-4');
                              }}
                            />
                          </div>
                        </div>
                      </CarouselItem>
                    ))
                  )}
                </CarouselContent>
                <CarouselPrevious className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2" />
                <CarouselNext className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2" />
              </Carousel>
              <div className="flex justify-between items-center mt-2">
                <p className="text-sm text-gray-500">{stationPhotos.length} photos</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAddPhotoModal(true)}
                  className="text-xs"
                >
                  <Image className="h-3.5 w-3.5 mr-1" />
                  Add photos
                </Button>
              </div>
            </div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="map">Map</TabsTrigger>
              <TabsTrigger value="photos">Photos</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>
            
            {/* Info Tab */}
            <TabsContent value="info" className="p-4 border rounded-md mt-2">
              {chargingStation && (
                <>
                  <h3 className="text-lg font-semibold mb-2">Station Info</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center">
                      <Zap className="h-5 w-5 text-amber-500 mr-2" />
                      <div>
                        <p className="text-sm font-medium">Power</p>
                        <p className="text-sm">{chargingStation.powerKw} kW</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <IndianRupee className="h-5 w-5 text-green-500 mr-2" />
                      <div>
                        <p className="text-sm font-medium">Price</p>
                        <p className="text-sm">₹{chargingStation.pricePerKwh}/kWh</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-blue-500 mr-2" />
                      <div>
                        <p className="text-sm font-medium">Wait Time</p>
                        <div className="flex items-center">
                          <p className="text-sm">
                            {chargingStation.waitTime
                              ? `${chargingStation.waitTime} minutes`
                              : "No wait"}
                          </p>
                          {chargingStation.waitTime ? (
                            <div className={`ml-2 w-2 h-2 rounded-full ${
                              chargingStation.waitTime > 30 ? 'bg-red-500' : 
                              chargingStation.waitTime > 10 ? 'bg-amber-500' : 'bg-green-500'
                            }`}></div>
                          ) : (
                            <div className="ml-2 w-2 h-2 rounded-full bg-green-500"></div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="h-5 w-5 text-purple-500 mr-2">🔌</div>
                      <div>
                        <p className="text-sm font-medium">Connectors</p>
                        <div className="flex flex-wrap mt-1">
                          {renderConnectorBadges(chargingStation.connectorTypes)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {location.description && (
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold mb-2">Description</h3>
                      <p className="text-sm text-gray-600">{location.description}</p>
                    </div>
                  )}

                  {/* Amenities */}
                  {location.amenities && Array.isArray(location.amenities) && location.amenities.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold mb-2">Amenities</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {location.amenities.map((amenity: string, index: number) => {
                          // Map amenity text to icon
                          let icon;
                          const amenityLower = amenity.toLowerCase();
                          if (amenityLower.includes('wifi')) {
                            icon = <Wifi size={16} className="text-primary" />;
                          } else if (amenityLower.includes('shop')) {
                            icon = <ShoppingBag size={16} className="text-primary" />;
                          } else if (amenityLower.includes('wait') || amenityLower.includes('seat')) {
                            icon = <Armchair size={16} className="text-primary" />;
                          } else if (amenityLower.includes('secur')) {
                            icon = <ShieldCheck size={16} className="text-primary" />;
                          } else if (amenityLower.includes('assis') || amenityLower.includes('help')) {
                            icon = <HelpCircle size={16} className="text-primary" />;
                          } else if (amenityLower.includes('payment') || amenityLower.includes('card')) {
                            icon = <CreditCard size={16} className="text-primary" />;
                          } else if (amenityLower.includes('24') || amenityLower.includes('hour')) {
                            icon = <Clock size={16} className="text-primary" />;
                          } else {
                            icon = <div className="h-4 w-4 text-green-500 flex items-center justify-center">✓</div>;
                          }
                          
                          return (
                            <div key={index} className="flex items-center">
                              <div className="mr-2">{icon}</div>
                              <span className="text-sm">{amenity}</span>
                            </div>
                          );
                        })}
                        
                        {location.hasParking && (
                          <div className="flex items-center">
                            <Car size={16} className="text-primary mr-2" />
                            <span className="text-sm">Parking Available</span>
                          </div>
                        )}
                        
                        {location.hasRestroom && (
                          <div className="flex items-center">
                            <Bath size={16} className="text-primary mr-2" />
                            <span className="text-sm">Restroom</span>
                          </div>
                        )}
                        
                        {location.hasFoodOption && (
                          <div className="flex items-center">
                            <Coffee size={16} className="text-primary mr-2" />
                            <span className="text-sm">Food Options</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
            
            {/* Details Tab */}
            <TabsContent value="details" className="p-4 border rounded-md mt-2">
              {chargingStation && (
                <>
                  <h3 className="text-lg font-semibold mb-2">Charging Points</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Power</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {chargingStation.connectorTypes && Array.isArray(chargingStation.connectorTypes) ? 
                        chargingStation.connectorTypes.map((connector: ConnectorType, index: number) => (
                          <TableRow key={index}>
                            <TableCell>{connector}</TableCell>
                            <TableCell>{chargingStation.powerKw} kW</TableCell>
                            <TableCell>
                              <Badge className={chargingStation.isAvailable ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                                {chargingStation.isAvailable ? "Available" : "In Use"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-4 text-gray-500">
                              No connector information available
                            </TableCell>
                          </TableRow>
                        )}
                    </TableBody>
                  </Table>

                  <h3 className="text-lg font-semibold mt-6 mb-2">Payment Methods</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {chargingStation.paymentMethods && Array.isArray(chargingStation.paymentMethods) && chargingStation.paymentMethods.length > 0 ? (
                      chargingStation.paymentMethods.map((method: string, index: number) => {
                        // Map payment method to icon
                        let icon;
                        const methodLower = method.toLowerCase();
                        if (methodLower.includes('card') || methodLower.includes('credit') || methodLower.includes('visa') || methodLower.includes('mastercard')) {
                          icon = <CreditCard size={16} className="text-primary" />;
                        } else if (methodLower.includes('cash')) {
                          icon = <IndianRupee size={16} className="text-primary" />;
                        } else if (methodLower.includes('wallet') || methodLower.includes('upi') || methodLower.includes('paytm') || methodLower.includes('gpay')) {
                          icon = <Phone size={16} className="text-primary" />;
                        } else {
                          icon = <div className="h-4 w-4 text-green-500 flex items-center justify-center">✓</div>;
                        }
                      
                        return (
                          <div key={index} className="flex items-center">
                            <div className="mr-2">{icon}</div>
                            <span className="text-sm">{method}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-sm text-gray-500">
                        Payment information not available
                      </div>
                    )}
                  </div>

                  {chargingStation.operatorName && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold mb-2">Operator</h3>
                      <div className="text-sm">
                        <div className="flex items-center mb-2">
                          <div className="mr-2 h-6 w-6 flex items-center justify-center">
                            {getProviderLogo(location.source || chargingStation.operatorName.toLowerCase().replace(/\s+/g, '_'))}
                          </div>
                          <p className="font-medium">{chargingStation.networkName || chargingStation.operatorName}</p>
                        </div>
                        
                        {chargingStation.supportContact && (
                          <div className="mt-2">
                            <div className="flex items-center text-primary">
                              <Phone className="h-4 w-4 mr-2" />
                              <p className="font-semibold">Helpline</p>
                            </div>
                            <div className="flex justify-between items-center mt-1 bg-primary-foreground p-3 rounded-md">
                              <p className="font-medium">{chargingStation.supportContact}</p>
                              <Button 
                                size="sm" 
                                variant="secondary"
                                onClick={() => window.location.href = `tel:${chargingStation.supportContact}`}
                              >
                                <Phone className="h-4 w-4 mr-2" />
                                Call Now
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* Map Tab */}
            <TabsContent value="map" className="p-4 border rounded-md mt-2">
              <div className="flex justify-between mb-4">
                <h3 className="text-lg font-semibold">Station Map</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleGetDirections}
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Get Directions
                </Button>
              </div>

              <MapContent 
                stationLocation={stationData.location} 
                stationName={stationData.location.name}
              />
            </TabsContent>
            
            {/* Reviews Tab */}
            {/* Photos Tab */}
            <TabsContent value="photos" className="p-4 border rounded-md mt-2">
              <div className="flex justify-between mb-4">
                <h3 className="text-lg font-semibold">Station Photos</h3>
                <Button size="sm" onClick={() => setShowAddPhotoModal(true)}>
                  <Image className="h-4 w-4 mr-2" />
                  Add Photo
                </Button>
              </div>
              
              {stationPhotos && Array.isArray(stationPhotos) && stationPhotos.length > 0 ? (
                <>
                  {/* Main featured photo carousel */}
                  <div className="mb-6">
                    <Carousel className="w-full">
                      <CarouselContent>
                        {stationPhotos.map((photo: string, index: number) => (
                          <CarouselItem key={index}>
                            <div className="p-1">
                              <div className="overflow-hidden rounded-lg">
                                <img
                                  src={photo}
                                  alt={`${location.name || 'Station'} - photo ${index + 1}`}
                                  className="w-full h-72 sm:h-96 object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.onerror = null; // Prevent infinite loop
                                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2YxZjVmOSIvPjx0ZXh0IHg9IjMwMCIgeT0iMjAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIiBmaWxsPSIjNjQ3NDhiIj5JbWFnZSB1bmF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';
                                    target.classList.remove('object-cover');
                                    target.classList.add('object-contain');
                                  }}
                                />
                              </div>
                              <div className="text-center text-sm text-gray-500 mt-2">
                                {location.name} - Photo {index + 1}
                              </div>
                            </div>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      <CarouselPrevious />
                      <CarouselNext />
                    </Carousel>
                  </div>
                  
                  {/* Photo thumbnails grid */}
                  <h4 className="text-md font-medium mb-3">All Photos ({stationPhotos.length})</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {stationPhotos.map((photo: string, index: number) => (
                      <div key={index} className="relative group rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                        <img 
                          src={photo} 
                          alt={`${location.name} - photo ${index + 1}`}
                          className="w-full h-32 object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null; // Prevent infinite loop
                            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YxZjVmOSIvPjx0ZXh0IHg9IjE1MCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIiBmaWxsPSIjNjQ3NDhiIj5JbWFnZSB1bmF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';
                          }}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300"></div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Image className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No photos available for this station</p>
                  <p className="text-sm mt-1">Be the first to add photos of this station</p>
                  <Button variant="outline" className="mt-4" onClick={() => setShowAddPhotoModal(true)}>
                    <Image className="h-4 w-4 mr-2" />
                    Add Photos
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="reviews" className="p-4 border rounded-md mt-2">
              <div className="flex justify-between mb-4">
                <h3 className="text-lg font-semibold">Reviews</h3>
                <Button size="sm" onClick={() => setShowReviewModal(true)}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Write a Review
                </Button>
              </div>
              
              {/* Review Modal */}
              <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Write a Review</DialogTitle>
                    <DialogDescription>
                      Share your experience with this charging station
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="space-y-3">
                      <Label>Rating</Label>
                      <div className="flex items-center space-x-2">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <Button
                            key={value}
                            type="button"
                            size="sm"
                            variant={reviewRating >= value ? "default" : "outline"}
                            className={reviewRating >= value ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                            onClick={() => setReviewRating(value)}
                          >
                            <Star
                              className={`h-4 w-4 ${reviewRating >= value ? "fill-white text-white" : "text-muted-foreground"}`}
                            />
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="review-comment">Comment</Label>
                      <Textarea
                        id="review-comment"
                        placeholder="Share your experience with this charging station"
                        className="min-h-24"
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Please be specific and helpful to other EV owners
                      </p>
                      {reviewComment && reviewComment.length < 10 && (
                        <p className="text-sm text-red-500">
                          Comment must be at least 10 characters
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="review-photo-url">Photo URL (optional)</Label>
                      <Input
                        id="review-photo-url"
                        placeholder="https://example.com/my-photo.jpg"
                        value={reviewPhotoUrl}
                        onChange={(e) => setReviewPhotoUrl(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Add a photo of the charging station
                      </p>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowReviewModal(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleReviewSubmit} 
                      disabled={reviewComment.length < 10 || isSubmittingReview}
                    >
                      {isSubmittingReview ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Star className="mr-2 h-4 w-4" />
                          Submit Review
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              {reviews && Array.isArray(reviews) && reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews && Array.isArray(reviews) && reviews.map(review => (
                    <div key={review?.id || Math.random()} className="border-b pb-4">
                      <div className="flex items-center mb-1">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-500 mr-1" />
                          <span className="font-medium">{review?.rating ? review.rating.toFixed(1) : "0.0"}</span>
                        </div>
                        <span className="mx-2">•</span>
                        <span className="text-sm text-gray-500">
                          {review?.created ? new Date(review.created).toLocaleDateString() : "Unknown date"}
                        </span>
                      </div>
                      <p className="text-gray-700 mb-2">{review?.comment || "No comment"}</p>
                      
                      {review?.photos && Array.isArray(review.photos) && review.photos.length > 0 && (
                        <div className="flex space-x-2 mt-2">
                          {review.photos.map((photo: string, index: number) => (
                            <img
                              key={index}
                              src={photo}
                              alt="Review"
                              className="h-16 w-16 rounded object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null; // Prevent infinite loop
                                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgZmlsbD0iI2YxZjVmOSIvPjx0ZXh0IHg9IjgwIiB5PSI4MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSIgZmlsbD0iIzY0NzQ4YiI+Tm8gcGhvdG88L3RleHQ+PC9zdmc+';
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No reviews yet</p>
                  <p className="text-sm mt-1">Be the first to review this station</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Booking Card */}
        <div className="md:col-span-1">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>Booking & Directions</CardTitle>
              <CardDescription>
                Reserve your charging slot or get directions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {chargingStation && (
                <div className="space-y-4">
                  {/* Availability */}
                  <div className="pb-4 border-b">
                    <h3 className="text-sm font-semibold mb-1">Availability</h3>
                    <div className="flex items-center">
                      <div className={`h-3 w-3 rounded-full mr-2 ${chargingStation.isAvailable ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm">
                        {chargingStation.isAvailable
                          ? `Available (${chargingStation.numberOfPoints} points)`
                          : "Currently in use"}
                      </span>
                    </div>
                    
                    {chargingStation.queueLength !== undefined && chargingStation.queueLength > 0 && (
                      <div className="text-sm text-amber-600 mt-1">
                        {chargingStation.queueLength} {chargingStation.queueLength === 1 ? 'vehicle' : 'vehicles'} in queue
                      </div>
                    )}
                  </div>
                  
                  {/* Price details */}
                  <div className="pb-4 border-b">
                    <h3 className="text-sm font-semibold mb-1">Pricing</h3>
                    <div className="text-sm">
                      <div className="flex justify-between">
                        <span>Base Price:</span>
                        <span>₹{chargingStation.pricePerKwh}/kWh</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span>Power Output:</span>
                        <span>{chargingStation.powerKw} kW</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        Estimated 30 min charging cost: ₹{(
                          (chargingStation.pricePerKwh || 0) * 
                          (chargingStation.powerKw || 0) * 
                          0.5
                        ).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Emergency Helpline */}
              {chargingStation && chargingStation.supportContact && (
                <div className="pb-4 border-b">
                  <h3 className="text-sm font-semibold mb-1">Emergency Helpline</h3>
                  <div className="bg-red-50 border border-red-100 rounded-md p-3 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">{chargingStation.supportContact}</p>
                      <p className="text-xs text-gray-500">24/7 Support</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => window.location.href = `tel:${chargingStation.supportContact}`}
                      className="flex items-center"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Call
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={handleGetDirections}
                  className="flex items-center justify-center"
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Directions
                </Button>
                
                {location.phoneNumber && location.phoneNumber !== chargingStation?.supportContact && (
                  <Button
                    variant="outline"
                    onClick={handleCall}
                    className="flex items-center justify-center"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Call
                  </Button>
                )}
              </div>
            </CardContent>
            <CardFooter>
              {chargingStation && chargingStation.id && location?.id ? (
                <ChargingBooking
                  stationId={chargingStation.id}
                  locationId={location.id}
                  userId={userId}
                />
              ) : (
                <div className="text-center p-4 text-gray-500">
                  <p>Booking not available</p>
                  <p className="text-xs mt-1">Station information is incomplete</p>
                </div>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}