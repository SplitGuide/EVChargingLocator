import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Loader2, PlusCircle, FileSearch, DownloadCloud, MapPin } from "lucide-react";

interface ImportResult {
  provider: string;
  count: number;
  success: boolean;
}

interface CrossCheckResult {
  source: string;
  sourceDescription: string;
  total: number;
  found: number;
  notFound: number;
}

export default function ImportStationsButton() {
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [isImportingKarnataka, setIsImportingKarnataka] = useState(false);
  const [isAddingGolfshire, setIsAddingGolfshire] = useState(false);
  const [isCrossCheckingMOP, setIsCrossCheckingMOP] = useState(false);
  const [isCrossCheckingCEA, setIsCrossCheckingCEA] = useState(false);
  const [isImportingGoogleChargeZone, setIsImportingGoogleChargeZone] = useState(false);
  const [isImportingChargeZoneBulk, setIsImportingChargeZoneBulk] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [totalImported, setTotalImported] = useState(0);
  const [karnatakaCZCount, setKarnatakaCZCount] = useState(0);
  const [googleChargeZoneCount, setGoogleChargeZoneCount] = useState(0);
  const [jwGolfshireAdded, setJwGolfshireAdded] = useState(false);
  const [crossCheckResult, setCrossCheckResult] = useState<CrossCheckResult | null>(null);
  const [chargeZoneBulkCount, setChargeZoneBulkCount] = useState(0);

  const handleImportStations = async () => {
    setIsImporting(true);
    setResults([]);
    setTotalImported(0);

    try {
      toast({
        title: "Starting station import",
        description: "Importing EV charging stations from all providers. This may take a few minutes.",
      });

      const response = await apiRequest("POST", "/api/import-all-stations");
      const data = await response.json();

      setResults(data.results);
      setTotalImported(data.totalImported);

      toast({
        title: "Import completed",
        description: `Successfully imported ${data.totalImported} charging stations from all providers.`,
      });
    } catch (error) {
      console.error("Error importing stations:", error);
      toast({
        title: "Import failed",
        description: "Failed to import charging stations. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportKarnatakaCZStations = async () => {
    setIsImportingKarnataka(true);
    setKarnatakaCZCount(0);

    try {
      toast({
        title: "Starting Karnataka ChargeZone import",
        description: "Importing ChargeZone stations from Karnataka. This may take a moment.",
      });

      const response = await apiRequest("POST", "/api/import-karnataka-cz-stations");
      const data = await response.json();

      setKarnatakaCZCount(data.count || 0);

      toast({
        title: "Karnataka ChargeZone Import completed",
        description: `Successfully imported ${data.count} ChargeZone stations from Karnataka.`,
      });
    } catch (error) {
      console.error("Error importing Karnataka ChargeZone stations:", error);
      toast({
        title: "Import failed",
        description: "Failed to import Karnataka ChargeZone stations. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsImportingKarnataka(false);
    }
  };
  
  const handleAddJWGolfshire = async () => {
    setIsAddingGolfshire(true);
    setJwGolfshireAdded(false);
    
    try {
      toast({
        title: "Adding JW Golfshire Station",
        description: "Adding ChargeZone station at JW Golfshire in Devanahalli, Bengaluru.",
      });
      
      const response = await apiRequest("POST", "/api/add-single-station");
      const data = await response.json();
      
      if (data.success) {
        setJwGolfshireAdded(true);
        toast({
          title: "Station Added Successfully",
          description: "JW Golfshire ChargeZone station has been added to the database.",
        });
      } else {
        toast({
          title: data.success ? "Success" : "Note",
          description: data.message,
          variant: data.success ? "default" : "secondary",
        });
      }
    } catch (error) {
      console.error("Error adding JW Golfshire station:", error);
      toast({
        title: "Error",
        description: "Failed to add JW Golfshire station. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsAddingGolfshire(false);
    }
  };
  
  const handleAddChandapura = async () => {
    setIsAddingGolfshire(true); // Reuse the same state for simplicity
    
    try {
      toast({
        title: "Adding Chandapura Biotech Park Station",
        description: "Adding ChargeZone station at Biotech Park in Chandapura, Bengaluru.",
      });
      
      const response = await apiRequest("POST", "/api/add-single-station?station=chandapura");
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Station Added Successfully",
          description: "Chandapura Biotech Park ChargeZone station has been added to the database.",
        });
      } else {
        toast({
          title: data.success ? "Success" : "Note",
          description: data.message,
          variant: data.success ? "default" : "secondary",
        });
      }
    } catch (error) {
      console.error("Error adding Chandapura station:", error);
      toast({
        title: "Error",
        description: "Failed to add Chandapura station. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsAddingGolfshire(false);
    }
  };
  
  const handleCrossCheckMOP = async () => {
    setCrossCheckResult(null);
    setIsCrossCheckingMOP(true);
    
    try {
      toast({
        title: "Starting Cross-Check with Ministry of Power Data",
        description: "Downloading and cross-checking charging stations with MoP database.",
      });
      
      const response = await apiRequest("POST", "/api/cross-check-gov-pdf?source=MOP");
      const data = await response.json();
      
      if (data.success) {
        setCrossCheckResult({
          source: data.source,
          sourceDescription: data.sourceDescription,
          total: data.results.total,
          found: data.results.found,
          notFound: data.results.notFound
        });
        
        toast({
          title: "Cross-Check Completed",
          description: data.message,
        });
      } else {
        toast({
          title: "Cross-Check Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error cross-checking with MoP data:", error);
      toast({
        title: "Error",
        description: "Failed to cross-check with Ministry of Power data. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsCrossCheckingMOP(false);
    }
  };
  
  const handleCrossCheckCEA = async () => {
    setCrossCheckResult(null);
    setIsCrossCheckingCEA(true);
    
    try {
      toast({
        title: "Starting Cross-Check with CEA Data",
        description: "Downloading and cross-checking charging stations with Central Electricity Authority database.",
      });
      
      const response = await apiRequest("POST", "/api/cross-check-gov-pdf?source=CEA");
      const data = await response.json();
      
      if (data.success) {
        setCrossCheckResult({
          source: data.source,
          sourceDescription: data.sourceDescription,
          total: data.results.total,
          found: data.results.found,
          notFound: data.results.notFound
        });
        
        toast({
          title: "Cross-Check Completed",
          description: data.message,
        });
      } else {
        toast({
          title: "Cross-Check Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error cross-checking with CEA data:", error);
      toast({
        title: "Error",
        description: "Failed to cross-check with Central Electricity Authority data. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsCrossCheckingCEA(false);
    }
  };
  
  const handleImportGoogleChargeZone = async () => {
    setGoogleChargeZoneCount(0);
    setIsImportingGoogleChargeZone(true);
    
    try {
      toast({
        title: "Starting ChargeZone Google Import",
        description: "Searching and importing ChargeZone stations from Google Places API. This may take a few minutes.",
      });
      
      const response = await apiRequest("POST", "/api/import-google-chargezone-stations");
      const data = await response.json();
      
      if (data.success) {
        setGoogleChargeZoneCount(data.count || 0);
        
        toast({
          title: "Google ChargeZone Import Completed",
          description: `Successfully imported ${data.count} ChargeZone stations from Google Places API.`,
        });
      } else {
        toast({
          title: "Import Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error importing ChargeZone stations from Google:", error);
      toast({
        title: "Error",
        description: "Failed to import ChargeZone stations from Google Places. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsImportingGoogleChargeZone(false);
    }
  };
  
  const handleImportChargeZoneBulk = async () => {
    setChargeZoneBulkCount(0);
    setIsImportingChargeZoneBulk(true);
    
    try {
      toast({
        title: "Starting ChargeZone Bulk Import",
        description: "Importing predefined list of ChargeZone stations from Karnataka. This may take a moment.",
      });
      
      const response = await apiRequest("POST", "/api/import-karnataka-cz-bulk");
      const data = await response.json();
      
      if (data.success) {
        setChargeZoneBulkCount(data.count || 0);
        
        toast({
          title: "ChargeZone Bulk Import Completed",
          description: `Successfully imported ${data.count} ChargeZone stations from predefined list.`,
        });
      } else {
        toast({
          title: "Import Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error importing ChargeZone stations from bulk list:", error);
      toast({
        title: "Error",
        description: "Failed to import ChargeZone stations from predefined list. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsImportingChargeZoneBulk(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-wrap gap-4">
        <Button 
          onClick={handleImportStations} 
          disabled={isImporting || isImportingKarnataka || isAddingGolfshire || isCrossCheckingMOP || isCrossCheckingCEA}
          className="w-full sm:w-auto"
        >
          {isImporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importing All Stations...
            </>
          ) : (
            "Import All Charging Stations"
          )}
        </Button>

        <Button 
          onClick={handleImportKarnatakaCZStations} 
          disabled={isImporting || isImportingKarnataka || isAddingGolfshire || isCrossCheckingMOP || isCrossCheckingCEA}
          className="w-full sm:w-auto"
          variant="secondary"
        >
          {isImportingKarnataka ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importing Karnataka ChargeZone Stations...
            </>
          ) : (
            "Import Karnataka ChargeZone Stations"
          )}
        </Button>
        
        <Button 
          onClick={handleAddJWGolfshire} 
          disabled={isImporting || isImportingKarnataka || isAddingGolfshire || isCrossCheckingMOP || isCrossCheckingCEA}
          className="w-full sm:w-auto"
          variant="outline"
        >
          {isAddingGolfshire ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding Station...
            </>
          ) : (
            <>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add JW Golfshire Station
            </>
          )}
        </Button>
        
        <Button 
          onClick={handleAddChandapura} 
          disabled={isImporting || isImportingKarnataka || isAddingGolfshire || isCrossCheckingMOP || isCrossCheckingCEA}
          className="w-full sm:w-auto"
          variant="outline"
        >
          {isAddingGolfshire ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding Station...
            </>
          ) : (
            <>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Chandapura Biotech Park Station
            </>
          )}
        </Button>
      </div>
      
      <div className="mt-2">
        <h3 className="text-lg font-semibold mb-2">Data Sources</h3>
        <p className="mb-2 text-sm text-muted-foreground">Import ChargeZone stations from different sources.</p>
        <div className="flex flex-wrap gap-4">
          <Button
            onClick={handleImportGoogleChargeZone}
            disabled={isImporting || isImportingKarnataka || isAddingGolfshire || 
                     isCrossCheckingMOP || isCrossCheckingCEA || isImportingGoogleChargeZone ||
                     isImportingChargeZoneBulk}
            className="w-full sm:w-auto"
            variant="secondary"
          >
            {isImportingGoogleChargeZone ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing from Google Places...
              </>
            ) : (
              <>
                <MapPin className="mr-2 h-4 w-4" />
                Import ChargeZone from Google Places
              </>
            )}
          </Button>
          
          <Button
            onClick={handleImportChargeZoneBulk}
            disabled={isImporting || isImportingKarnataka || isAddingGolfshire || 
                     isCrossCheckingMOP || isCrossCheckingCEA || isImportingGoogleChargeZone ||
                     isImportingChargeZoneBulk}
            className="w-full sm:w-auto"
            variant="secondary"
          >
            {isImportingChargeZoneBulk ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing ChargeZone Bulk List...
              </>
            ) : (
              <>
                <DownloadCloud className="mr-2 h-4 w-4" />
                Import ChargeZone Hotels Bulk List
              </>
            )}
          </Button>
        </div>
      </div>
      
      <div className="mt-2">
        <h3 className="text-lg font-semibold mb-2">Government Data Verification</h3>
        <p className="mb-2 text-sm text-muted-foreground">Cross-check our database with official government sources.</p>
        <div className="flex flex-wrap gap-4">
          <Button
            onClick={handleCrossCheckMOP}
            disabled={isImporting || isImportingKarnataka || isAddingGolfshire || 
                     isCrossCheckingMOP || isCrossCheckingCEA || isImportingGoogleChargeZone ||
                     isImportingChargeZoneBulk}
            className="w-full sm:w-auto"
            variant="secondary"
          >
            {isCrossCheckingMOP ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cross-checking with MoP data...
              </>
            ) : (
              <>
                <FileSearch className="mr-2 h-4 w-4" />
                Cross-check with Ministry of Power
              </>
            )}
          </Button>
          
          <Button
            onClick={handleCrossCheckCEA}
            disabled={isImporting || isImportingKarnataka || isAddingGolfshire || 
                     isCrossCheckingMOP || isCrossCheckingCEA || isImportingGoogleChargeZone ||
                     isImportingChargeZoneBulk}
            className="w-full sm:w-auto"
            variant="secondary"
          >
            {isCrossCheckingCEA ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cross-checking with CEA data...
              </>
            ) : (
              <>
                <FileSearch className="mr-2 h-4 w-4" />
                Cross-check with Central Electricity Authority
              </>
            )}
          </Button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="mt-4 bg-muted p-4 rounded-md">
          <h3 className="text-lg font-semibold mb-2">Import Results</h3>
          <p className="mb-2 text-sm">Successfully imported {totalImported} charging stations.</p>
          <div className="space-y-2">
            {results.map((result, index) => (
              <div 
                key={index} 
                className={`flex justify-between p-2 text-sm rounded ${
                  result.success 
                    ? "bg-green-100 dark:bg-green-900/20" 
                    : "bg-red-100 dark:bg-red-900/20"
                }`}
              >
                <span>{result.provider}</span>
                <span className="font-semibold">
                  {result.success 
                    ? `${result.count} stations imported` 
                    : "Failed"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {karnatakaCZCount > 0 && (
        <div className="mt-4 bg-muted p-4 rounded-md">
          <h3 className="text-lg font-semibold mb-2">Karnataka ChargeZone Import</h3>
          <p className="mb-2 text-sm">Successfully imported {karnatakaCZCount} ChargeZone stations from Karnataka.</p>
          <div className="p-2 text-sm rounded bg-green-100 dark:bg-green-900/20">
            <span>ChargeZone Karnataka</span>
            <span className="font-semibold float-right">
              {karnatakaCZCount} stations imported
            </span>
          </div>
        </div>
      )}
      
      {jwGolfshireAdded && (
        <div className="mt-4 bg-muted p-4 rounded-md">
          <h3 className="text-lg font-semibold mb-2">JW Golfshire Station</h3>
          <p className="mb-2 text-sm">Successfully added ChargeZone station at JW Golfshire, Devanahalli, Bengaluru.</p>
          <div className="p-2 text-sm rounded bg-green-100 dark:bg-green-900/20">
            <span>JW Golfshire, Devanahalli</span>
            <span className="font-semibold float-right">
              Added Successfully
            </span>
          </div>
        </div>
      )}
      
      {googleChargeZoneCount > 0 && (
        <div className="mt-4 bg-muted p-4 rounded-md">
          <h3 className="text-lg font-semibold mb-2">Google Places ChargeZone Import</h3>
          <p className="mb-2 text-sm">Successfully imported {googleChargeZoneCount} ChargeZone stations from Google Places API.</p>
          <div className="p-2 text-sm rounded bg-green-100 dark:bg-green-900/20">
            <span>ChargeZone via Google Places</span>
            <span className="font-semibold float-right">
              {googleChargeZoneCount} stations imported
            </span>
          </div>
        </div>
      )}
      
      {chargeZoneBulkCount > 0 && (
        <div className="mt-4 bg-muted p-4 rounded-md">
          <h3 className="text-lg font-semibold mb-2">ChargeZone Bulk Import</h3>
          <p className="mb-2 text-sm">Successfully imported {chargeZoneBulkCount} ChargeZone stations from predefined list.</p>
          <div className="p-2 text-sm rounded bg-green-100 dark:bg-green-900/20">
            <span>ChargeZone Hotels and Locations</span>
            <span className="font-semibold float-right">
              {chargeZoneBulkCount} stations imported
            </span>
          </div>
        </div>
      )}
      
      {crossCheckResult && (
        <div className="mt-4 bg-muted p-4 rounded-md">
          <h3 className="text-lg font-semibold mb-2">Government Data Cross-Check Results</h3>
          <p className="mb-2 text-sm">
            Cross-checked our database with <span className="font-medium">{crossCheckResult.source}</span> ({crossCheckResult.sourceDescription})
          </p>
          
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-md text-center">
              <div className="text-lg font-semibold">{crossCheckResult.total}</div>
              <div className="text-xs text-muted-foreground">Total Stations</div>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-md text-center">
              <div className="text-lg font-semibold">{crossCheckResult.found}</div>
              <div className="text-xs text-muted-foreground">Found in Database</div>
            </div>
            <div className="p-3 bg-amber-100 dark:bg-amber-900/20 rounded-md text-center">
              <div className="text-lg font-semibold">{crossCheckResult.notFound}</div>
              <div className="text-xs text-muted-foreground">Not Found</div>
            </div>
          </div>
          
          <div className="text-sm">
            <div className="flex justify-between items-center mb-1">
              <span>Database coverage:</span>
              <span className="font-medium">{Math.round((crossCheckResult.found / crossCheckResult.total) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div 
                className="bg-primary h-2.5 rounded-full" 
                style={{ width: `${Math.round((crossCheckResult.found / crossCheckResult.total) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}