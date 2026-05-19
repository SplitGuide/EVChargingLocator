import React, { Suspense } from 'react';
import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import VehicleRegistration from "@/pages/vehicle-registration";
import StationDetails from "@/pages/station-details";
import { SosButton } from "@/components/SosButton";
import Navbar from "@/components/Navbar";
import Logo from "@/components/Logo";
import Credits from "@/components/Credits";
import { Zap, Leaf, Loader2 } from "lucide-react";
import { ThemeProvider } from "@/components/ThemeProvider";

// AuthProvider wrapper to make user data available throughout the app
function AuthProvider({ children }: { children: React.ReactNode }) {
  // Fetch user data on initial load
  const { data: user } = useQuery({
    queryKey: ['/api/user'],
  });

  return (
    <>
      {children}
      {user && <SosButton />}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="ev-charge-theme">
        <TooltipProvider>
          <AuthProvider>
            {/* App Splash Screen - shows briefly when app opens */}
            <div 
              id="splash-screen"
              className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-green-500 to-green-700"
              style={{
                animation: 'fadeOut 1s ease-in-out 1.5s forwards'
              }}
            >
              <div className="flex items-center mb-4">
                <div className="bg-white p-3 rounded-full shadow-lg">
                  <Zap size={52} className="text-green-500" />
                </div>
              </div>
              <div className="text-4xl font-bold text-white mb-2">EV Charge</div>
              <div className="flex items-center text-green-100 mt-2">
                <Leaf size={18} className="mr-2" />
                <span className="text-sm">Powered by Green Energy</span>
              </div>
            </div>
            
            {/* Main App Content */}
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-1">
                <Switch>
                  <Route path="/" component={Home} />
                  <Route path="/auth" component={AuthPage} />
                  <Route path="/explore">
                    <Suspense fallback={
                      <div className="flex justify-center items-center min-h-[500px]">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    }>
                      {React.createElement(React.lazy(() => import('./pages/explore')))}
                    </Suspense>
                  </Route>
                  <Route path="/vehicle-registration" component={VehicleRegistration} />
                  <Route path="/stations/:id">
                    {params => (
                      <Suspense fallback={
                        <div className="flex justify-center items-center min-h-[500px]">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      }>
                        <StationDetails />
                      </Suspense>
                    )}
                  </Route>
                  <Route path="/dos-and-donts">
                    <Suspense fallback={
                      <div className="flex justify-center items-center min-h-[500px]">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    }>
                      {React.createElement(React.lazy(() => import('./pages/dos-and-donts')))}
                    </Suspense>
                  </Route>
                  <Route path="/trip-planner">
                    <Suspense fallback={
                      <div className="flex justify-center items-center min-h-[500px]">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    }>
                      {React.createElement(React.lazy(() => import('./pages/trip-planner')))}
                    </Suspense>
                  </Route>
                  <Route path="/helplines">
                    <Suspense fallback={
                      <div className="flex justify-center items-center min-h-[500px]">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    }>
                      {React.createElement(React.lazy(() => import('./pages/helplines')))}
                    </Suspense>
                  </Route>
                  <Route path="/india-map">
                    <Suspense fallback={
                      <div className="flex justify-center items-center min-h-[500px]">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    }>
                      {React.createElement(React.lazy(() => import('./pages/india-map')))}
                    </Suspense>
                  </Route>
                  <Route path="/admin">
                    <Suspense fallback={
                      <div className="flex justify-center items-center min-h-[500px]">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    }>
                      {React.createElement(React.lazy(() => import('./pages/admin-panel')))}
                    </Suspense>
                  </Route>
                  <Route component={NotFound} />
                </Switch>
              </main>
              <Credits />
            </div>
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
