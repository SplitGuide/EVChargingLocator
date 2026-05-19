import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, Database, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface AdminPanelProps {
  onDataImported?: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onDataImported }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleImportCsvData = async () => {
    try {
      setIsImporting(true);
      setImportResult(null);
      
      const response = await apiRequest('POST', '/api/import-csv-stations');
      
      if (response.ok) {
        const result = await response.json();
        setImportResult({
          success: true,
          message: `Successfully imported ${result.importedCount} stations and skipped ${result.skippedCount} records.`
        });
        
        // Notify parent component of successful import
        if (onDataImported) {
          onDataImported();
        }
      } else {
        const errorData = await response.json();
        setImportResult({
          success: false,
          message: `Error importing data: ${errorData.message || 'Unknown error'}`
        });
      }
    } catch (error) {
      console.error('Error importing CSV data:', error);
      setImportResult({
        success: false,
        message: `Failed to import data: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Database className="h-5 w-5 mr-2" />
          Admin Panel
        </CardTitle>
        <CardDescription>
          Import EV charging stations from the CSV database
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {importResult && (
          <Alert className={importResult.success ? "bg-green-50 mb-4" : "bg-red-50 mb-4"}>
            <div className="flex">
              {importResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
              )}
              <div>
                <AlertTitle>
                  {importResult.success ? 'Import Successful' : 'Import Failed'}
                </AlertTitle>
                <AlertDescription>
                  {importResult.message}
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}
        
        <p className="text-sm text-muted-foreground mb-4">
          This action will import EV charging stations from the provided CSV file. 
          The system will process each record, detect connector types, and assign appropriate 
          network names.
        </p>
      </CardContent>
      
      <CardFooter>
        <Button
          onClick={handleImportCsvData}
          disabled={isImporting}
          className="w-full"
        >
          {isImporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importing...
            </>
          ) : (
            'Import CSV Data'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AdminPanel;