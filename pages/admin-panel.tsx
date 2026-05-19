import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ImportStationsButton from "@/components/ImportStationsButton";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Provider information
const providers = [
  {
    id: "tata-power",
    name: "Tata Power EZ Charge",
    logo: "https://evstation.tatapowerddl.com/images/logo.png",
    website: "https://ev.tatapowerddl.com/",
    description: "Tata Power is India's largest EV charging network with fast DC and AC chargers across major highways and cities."
  },
  {
    id: "jiobp",
    name: "JioBP Pulse",
    logo: "https://myjioapp.b-cdn.net/minio-prd-edpp-bucket/jiobp_pulse_1.jpg",
    website: "https://www.jio-bp.com/",
    description: "JioBP (Reliance BP Mobility) operates EV charging stations in partnership with major EV OEMs across India."
  },
  {
    id: "ather",
    name: "Ather Grid",
    logo: "https://www.atherenergy.com/assets/components/home-page/grid-logo.svg",
    website: "https://www.atherenergy.com/grid",
    description: "Ather Grid is focused on electric scooter charging with a network across India's major cities."
  },
  {
    id: "fortum",
    name: "Fortum Charge & Drive",
    logo: "https://www.fortum.com/sites/default/files/styles/maximum_600x400/public/fortum_logo_rgb.png",
    website: "https://www.fortum.com/",
    description: "Fortum Charge & Drive is a global network expanding in India with fast DC chargers in major metropolitan areas."
  },
  {
    id: "chargezone",
    name: "ChargeZone",
    logo: "https://chargezone.in/wp-content/uploads/2023/07/cz-logo.webp",
    website: "https://chargezone.in/",
    description: "ChargeZone is building charging infrastructure across highways and cities in India, focusing on interoperability."
  },
  {
    id: "statiq",
    name: "Statiq",
    logo: "https://statiq.in/wp-content/uploads/2023/04/statiq-logo-black.svg",
    website: "https://statiq.in/",
    description: "Statiq is building a network of smart EV charging stations across residential societies, hotels and highways."
  },
  {
    id: "tata-motors",
    name: "Tata Motors EV",
    logo: "https://www.tatamotors.com/wp-content/themes/tatamotors_2019/images/tata-motors-logo.png",
    website: "https://www.tatamotors.com/",
    description: "Tata Motors provides charging infrastructure for its EV customers with a growing network across major cities in India."
  },
  {
    id: "mgmotor",
    name: "MG Motor Charge Hub",
    logo: "https://www.mgmotor.co.in/content/dam/mgmotor/brand/identity/mglogo.png",
    website: "https://www.mgmotor.co.in/",
    description: "MG Motor is expanding its charging network to support its electric vehicles like the ZS EV across India."
  },
  {
    id: "bolt",
    name: "Bolt Earth",
    logo: "https://www.boltearth.co.in/wp-content/uploads/2023/05/Bolt-Earth-logo.png", 
    website: "https://www.boltearth.co.in/",
    description: "Bolt Earth offers universal EV charging infrastructure with both AC and DC chargers across residential and commercial spaces."
  },
  {
    id: "hpcl",
    name: "HPCL",
    logo: "https://hindustanpetroleum.com/wp-content/themes/hcpl/assets/images/logo.png",
    website: "https://www.hindustanpetroleum.com/",
    description: "Hindustan Petroleum Corporation Limited is integrating EV charging stations within their extensive fuel station network."
  }
];

export default function AdminPanel() {
  const { data: stationStats, isLoading } = useQuery({
    queryKey: ["/api/stations/stats"],
    queryFn: async () => {
      const res = await fetch("/api/stations/stats");
      if (!res.ok) throw new Error("Failed to fetch station statistics");
      return res.json();
    },
    retry: false,
  });

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col md:flex-row md:items-center mb-6 justify-between">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        
        {!isLoading && stationStats?.totalStations >= 1500 && (
          <div className="mt-4 md:mt-0 bg-gradient-to-r from-green-500 to-emerald-700 text-white px-4 py-2 rounded-full font-semibold flex items-center shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Milestone: {stationStats.totalStations.toLocaleString()} Stations Nationwide!
          </div>
        )}
      </div>
      
      <Tabs defaultValue="stations">
        <TabsList className="mb-6">
          <TabsTrigger value="stations">Charging Stations</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="stations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Charging Station Management</CardTitle>
              <CardDescription>
                Import, update, and manage EV charging station data across all providers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Import Stations</h3>
                <ImportStationsButton />
              </div>
              
              <Separator className="my-6" />
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Station Statistics</h3>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                      <StatCard
                        title="Total Stations"
                        value={stationStats?.totalStations || 0}
                        description="All charging stations in the database"
                      />
                      <StatCard
                        title="Active Stations"
                        value={stationStats?.activeStations || 0}
                        description="Currently operational stations"
                      />
                      <StatCard
                        title="Cities"
                        value={stationStats?.cities || 0}
                        description="Cities with charging stations"
                      />
                      <StatCard
                        title="Providers"
                        value={stationStats?.providers || 0}
                        description="Unique charging network providers"
                      />
                    </div>
                    
                    {stationStats?.byProvider && stationStats.byProvider.length > 0 && (
                      <div>
                        <h4 className="text-md font-semibold mb-4">Stations by Provider</h4>
                        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                          <div className="bg-card rounded-lg p-4 border">
                            <div className="space-y-2">
                              {stationStats.byProvider.map((item, index) => (
                                <div key={index} className="flex flex-col">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium">{item.provider}</span>
                                    <span className="text-sm font-semibold">{item.count}</span>
                                  </div>
                                  <div className="w-full bg-muted rounded-full h-2.5">
                                    <div 
                                      className="bg-primary h-2.5 rounded-full" 
                                      style={{ 
                                        width: `${Math.min(100, (item.count / stationStats.totalStations) * 100)}%`,
                                        opacity: 0.8 + (0.2 * (1 - index / stationStats.byProvider.length))
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="bg-card rounded-lg p-4 border">
                            <h4 className="text-md font-semibold mb-4">Top Cities with Stations</h4>
                            {stationStats.topCities && stationStats.topCities.length > 0 ? (
                              <div className="space-y-2">
                                {stationStats.topCities.map((item, index) => (
                                  <div key={index} className="flex flex-col">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-sm font-medium">{item.city}</span>
                                      <span className="text-sm font-semibold">{item.count}</span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-2.5">
                                      <div 
                                        className="bg-green-500 h-2.5 rounded-full" 
                                        style={{ 
                                          width: `${Math.min(100, (item.count / stationStats.topCities[0].count) * 100)}%`,
                                        }}
                                      ></div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-muted-foreground text-sm">No city data available</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {stationStats?.byConnector && stationStats.byConnector.length > 0 && (
                      <div>
                        <h4 className="text-md font-semibold mb-4">Connector Types Distribution</h4>
                        <div className="bg-card rounded-lg p-4 border">
                          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                            {stationStats.byConnector.map((item, index) => (
                              <div key={index} className="flex flex-col">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-sm font-medium">{item.type}</span>
                                  <span className="text-sm font-semibold">{item.count}</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2.5">
                                  <div 
                                    className="bg-blue-500 h-2.5 rounded-full" 
                                    style={{ 
                                      width: `${Math.min(100, (item.count / stationStats.byConnector[0].count) * 100)}%`,
                                    }}
                                  ></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <Separator className="my-6" />
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Provider Networks</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {providers.map((provider) => (
                    <Card key={provider.id} className="overflow-hidden">
                      <div className="p-2 bg-muted flex justify-center items-center h-24">
                        <img 
                          src={provider.logo} 
                          alt={`${provider.name} logo`} 
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-md">{provider.name}</CardTitle>
                        <CardDescription>
                          <a 
                            href={provider.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Visit website
                          </a>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{provider.description}</p>
                        <div className="mt-4">
                          {stationStats?.byProvider && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">Stations in system:</span>
                              <span className="text-sm font-bold">
                                {stationStats.byProvider.find(p => 
                                  p.provider.toLowerCase().includes(provider.id.toLowerCase()))?.count || 0}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage user accounts and access permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">User management features will be added in a future update.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Application Settings</CardTitle>
              <CardDescription>
                Configure application settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Settings features will be added in a future update.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  description: string;
}

function StatCard({ title, value, description }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}