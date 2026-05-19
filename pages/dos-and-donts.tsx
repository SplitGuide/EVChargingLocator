import React from 'react';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const DosAndDontsPage = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">EV Charging Do's and Don'ts</h1>
      
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full md:w-fit grid-cols-3 mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="safety">Safety</TabsTrigger>
          <TabsTrigger value="etiquette">Etiquette</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="bg-green-50">
                <CardTitle className="flex items-center text-green-700">
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Do's
                </CardTitle>
                <CardDescription>Follow these recommendations for better EV charging experience</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <CheckCircle className="mr-2 h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span>Plan your charging stops in advance, especially for long trips</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="mr-2 h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span>Arrive at charging stations with at least 10-15% battery remaining</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="mr-2 h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span>Fully understand your vehicle's charging capabilities and connector types</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="mr-2 h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span>Keep your charging port clean and free from debris</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="mr-2 h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span>Download and use multiple EV charging apps for better coverage</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="mr-2 h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span>Check your vehicle manufacturer's recommendations for optimal charging practices</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="bg-red-50">
                <CardTitle className="flex items-center text-red-700">
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  Don'ts
                </CardTitle>
                <CardDescription>Avoid these common mistakes when charging your EV</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <AlertTriangle className="mr-2 h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <span>Don't let your battery run extremely low before finding a charging station</span>
                  </li>
                  <li className="flex items-start">
                    <AlertTriangle className="mr-2 h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <span>Avoid constantly charging to 100% if not needed (80% is often optimal for battery health)</span>
                  </li>
                  <li className="flex items-start">
                    <AlertTriangle className="mr-2 h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <span>Don't leave your vehicle at a public charger after it's finished charging</span>
                  </li>
                  <li className="flex items-start">
                    <AlertTriangle className="mr-2 h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <span>Never use damaged charging cables or adapters</span>
                  </li>
                  <li className="flex items-start">
                    <AlertTriangle className="mr-2 h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <span>Don't ignore warning messages from your vehicle or charging station</span>
                  </li>
                  <li className="flex items-start">
                    <AlertTriangle className="mr-2 h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <span>Avoid charging during extreme weather conditions without proper precautions</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
          
          <Alert className="mt-6">
            <Info className="h-4 w-4" />
            <AlertTitle>Helpful Tip</AlertTitle>
            <AlertDescription>
              Most EVs have optimal charging between 20% and 80% battery level for everyday use. 
              Full charges are best reserved for long trips.
            </AlertDescription>
          </Alert>
        </TabsContent>
        
        <TabsContent value="safety">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="bg-green-50">
                <CardTitle className="flex items-center text-green-700">
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Safety Do's
                </CardTitle>
                <CardDescription>Follow these safety recommendations when charging</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <CheckCircle className="mr-2 h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span>Inspect charging cables for damage before connecting</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="mr-2 h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span>Follow the recommended charging sequence (plug into vehicle first, then charger)</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="mr-2 h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span>Keep charging equipment away from water and moisture</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="mr-2 h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span>Park in well-lit areas when charging at night</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="mr-2 h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span>Learn the location of emergency stop buttons at charging stations</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="mr-2 h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span>Follow instructions specific to your charging station</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="bg-red-50">
                <CardTitle className="flex items-center text-red-700">
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  Safety Don'ts
                </CardTitle>
                <CardDescription>Avoid these safety hazards when charging your EV</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <AlertTriangle className="mr-2 h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <span>Never use extension cords with EV chargers (especially Level 2 chargers)</span>
                  </li>
                  <li className="flex items-start">
                    <AlertTriangle className="mr-2 h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <span>Don't charge during lightning storms or severe weather if possible</span>
                  </li>
                  <li className="flex items-start">
                    <AlertTriangle className="mr-2 h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <span>Never attempt to modify charging equipment or bypass safety features</span>
                  </li>
                  <li className="flex items-start">
                    <AlertTriangle className="mr-2 h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <span>Don't leave cables stretched across walkways creating trip hazards</span>
                  </li>
                  <li className="flex items-start">
                    <AlertTriangle className="mr-2 h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <span>Never force connectors that don't properly fit your vehicle</span>
                  </li>
                  <li className="flex items-start">
                    <AlertTriangle className="mr-2 h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <span>Don't ignore burning smells, sparks, or unusual noises during charging</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
          
          <Alert className="mt-6" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Important Safety Warning</AlertTitle>
            <AlertDescription>
              If you experience any unusual behavior from your charging station or vehicle during charging, 
              disconnect immediately following proper procedures and contact support.
            </AlertDescription>
          </Alert>
        </TabsContent>
        
        <TabsContent value="etiquette">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="bg-green-50">
                <CardTitle className="flex items-center text-green-700">
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Charging Etiquette Do's
                </CardTitle>
                <CardDescription>Be a good member of the EV community</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <CheckCircle className="mr-2 h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span>Move your vehicle promptly once charging is complete</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="mr-2 h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span>Leave a note with your phone number if charging might take longer</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="mr-2 h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span>Report malfunctioning chargers to the operator</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="mr-2 h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span>Consider only charging to the level you need when others are waiting</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="mr-2 h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span>Neatly coil charging cables when finished</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="mr-2 h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span>Share charger locations and tips with other EV drivers</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="bg-red-50">
                <CardTitle className="flex items-center text-red-700">
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  Charging Etiquette Don'ts
                </CardTitle>
                <CardDescription>Poor etiquette to avoid when charging</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <AlertTriangle className="mr-2 h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <span>Don't unplug another vehicle unless specifically allowed by the owner</span>
                  </li>
                  <li className="flex items-start">
                    <AlertTriangle className="mr-2 h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <span>Don't block access to chargers with non-electric vehicles</span>
                  </li>
                  <li className="flex items-start">
                    <AlertTriangle className="mr-2 h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <span>Avoid "charge hogging" - don't monopolize public chargers longer than needed</span>
                  </li>
                  <li className="flex items-start">
                    <AlertTriangle className="mr-2 h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <span>Don't use dedicated charging spots for parking when not charging</span>
                  </li>
                  <li className="flex items-start">
                    <AlertTriangle className="mr-2 h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <span>Don't leave trash or litter around charging stations</span>
                  </li>
                  <li className="flex items-start">
                    <AlertTriangle className="mr-2 h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <span>Don't ignore local signage regarding time limits or fees</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
          
          <Alert className="mt-6" variant="default">
            <Info className="h-4 w-4" />
            <AlertTitle>Community Note</AlertTitle>
            <AlertDescription>
              Good charging etiquette helps build a positive EV community across India. 
              Consider checking in on apps to share real-time charger availability with other drivers.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DosAndDontsPage;