import React from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet';
import { Menu, User, LogOut, LogIn, Car, BookOpen, BatteryFull, Leaf, HelpCircle, Phone, Settings } from 'lucide-react';
import Logo from './Logo';
import EVHelplines from './EVHelplines';
import { ThemeToggle } from './ThemeToggle';
import { apiRequest, queryClient } from '@/lib/queryClient';

const Navbar = () => {
  const [location] = useLocation();
  const [open, setOpen] = React.useState(false);
  
  // Fetch user data
  const { data: user } = useQuery({
    queryKey: ['/api/user'],
  });

  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/logout');
      queryClient.setQueryData(['/api/user'], null);
    } catch (error) {
      console.error('Error logging out', error);
    }
  };

  return (
    <header className="bg-background border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <Logo size="md" />
          
          {/* Show green power icon */}
          <div className="ml-2 hidden md:flex items-center text-green-600">
            <Leaf size={16} className="mr-1" />
            <span className="text-xs font-medium">Green Power</span>
          </div>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/">
            <div className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${
              location === '/' ? 'text-primary' : 'text-muted-foreground'
            }`}>
              Home
            </div>
          </Link>
          <Link href="/explore">
            <div className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${
              location === '/explore' ? 'text-primary' : 'text-muted-foreground'
            }`}>
              Explore Stations
            </div>
          </Link>
          <Link href="/trip-planner">
            <div className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${
              location === '/trip-planner' ? 'text-primary' : 'text-muted-foreground'
            }`}>
              Trip Planner
            </div>
          </Link>
          <Link href="/dos-and-donts">
            <div className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${
              location === '/dos-and-donts' ? 'text-primary' : 'text-muted-foreground'
            }`}>
              Do's & Don'ts
            </div>
          </Link>
          
          <Link href="/india-map">
            <div className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer flex items-center ${
              location === '/india-map' ? 'text-primary' : 'text-muted-foreground'
            }`}>
              <svg className="mr-1" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 2a8.19 8.19 0 0 1 1.79.21 2.61 2.61 0 0 1-.78 1c-.22.17-.46.31-.7.5a4.56 4.56 0 0 0-1.85 3.85c0 1.1.51 2.45 1.28 3.56.77 1.11 1.8 1.74 2.66 1.74s2.46-.113 2.46-2.5c0-2.5 3.21-2.29 3.79-.5.4 1.3-.5 2.34-1.42 2.34-.92 0-1.64-.81-1.64-1.55a.77.77 0 0 1 .037-.22 4.39 4.39 0 0 0 .3-1.59c0-.87-.5-1.62-1.12-2.33-.63-.7-1.39-1.3-1.88-2.1a6.43 6.43 0 0 1-.381-.874c-.52-1.45-1.45-2.5-3.55-2.5z" />
              </svg>
              India Map
            </div>
          </Link>
          
          <Link href="/helplines">
            <div className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer flex items-center ${
              location === '/helplines' ? 'text-primary' : 'text-muted-foreground'
            }`}>
              <Phone size={16} className="mr-1 text-red-500" />
              EV Helplines
            </div>
          </Link>
          
          {/* EV Helplines Component (popover) */}
          <EVHelplines className="hidden" />
          
          <ThemeToggle className="mr-2" />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/avatar.png" alt={user.username} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user.username?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="flex items-center gap-2">
                  <User size={16} />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2">
                  <Car size={16} />
                  My Vehicles
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2">
                  <BookOpen size={16} />
                  My Bookings
                </DropdownMenuItem>
                <Link href="/admin">
                  <DropdownMenuItem className="flex items-center gap-2">
                    <Settings size={16} />
                    Admin Panel
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem className="flex items-center gap-2" onClick={handleLogout}>
                  <LogOut size={16} />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/auth">
              <Button size="sm" className="gap-2">
                <LogIn size={16} />
                Login
              </Button>
            </Link>
          )}
        </nav>
        
        {/* Mobile Navigation */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="bg-background">
            <div className="flex flex-col space-y-4 mt-8">
              <Link href="/">
                <div 
                  className={`flex items-center gap-2 py-2 cursor-pointer ${location === '/' ? 'text-primary' : 'text-muted-foreground'}`}
                  onClick={() => setOpen(false)}
                >
                  Home
                </div>
              </Link>
              <Link href="/explore">
                <div 
                  className={`flex items-center gap-2 py-2 cursor-pointer ${location === '/explore' ? 'text-primary' : 'text-muted-foreground'}`}
                  onClick={() => setOpen(false)}
                >
                  Explore Stations
                </div>
              </Link>
              <Link href="/trip-planner">
                <div 
                  className={`flex items-center gap-2 py-2 cursor-pointer ${location === '/trip-planner' ? 'text-primary' : 'text-muted-foreground'}`}
                  onClick={() => setOpen(false)}
                >
                  Trip Planner
                </div>
              </Link>
              <Link href="/dos-and-donts">
                <div 
                  className={`flex items-center gap-2 py-2 cursor-pointer ${location === '/dos-and-donts' ? 'text-primary' : 'text-muted-foreground'}`}
                  onClick={() => setOpen(false)}
                >
                  <HelpCircle size={16} />
                  Do's & Don'ts
                </div>
              </Link>
              
              <Link href="/india-map">
                <div 
                  className={`flex items-center gap-2 py-2 cursor-pointer ${location === '/india-map' ? 'text-primary' : 'text-muted-foreground'}`}
                  onClick={() => setOpen(false)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 2a8.19 8.19 0 0 1 1.79.21 2.61 2.61 0 0 1-.78 1c-.22.17-.46.31-.7.5a4.56 4.56 0 0 0-1.85 3.85c0 1.1.51 2.45 1.28 3.56.77 1.11 1.8 1.74 2.66 1.74s2.46-.113 2.46-2.5c0-2.5 3.21-2.29 3.79-.5.4 1.3-.5 2.34-1.42 2.34-.92 0-1.64-.81-1.64-1.55a.77.77 0 0 1 .037-.22 4.39 4.39 0 0 0 .3-1.59c0-.87-.5-1.62-1.12-2.33-.63-.7-1.39-1.3-1.88-2.1a6.43 6.43 0 0 1-.381-.874c-.52-1.45-1.45-2.5-3.55-2.5z" />
                  </svg>
                  India Map
                </div>
              </Link>
              
              {user ? (
                <>
                  <Link href="/profile">
                    <div 
                      className="flex items-center gap-2 py-2 text-muted-foreground cursor-pointer"
                      onClick={() => setOpen(false)}
                    >
                      <User size={16} />
                      Profile
                    </div>
                  </Link>
                  <Link href="/vehicles">
                    <div 
                      className="flex items-center gap-2 py-2 text-muted-foreground cursor-pointer"
                      onClick={() => setOpen(false)}
                    >
                      <Car size={16} />
                      My Vehicles
                    </div>
                  </Link>
                  <Link href="/bookings">
                    <div 
                      className="flex items-center gap-2 py-2 text-muted-foreground cursor-pointer"
                      onClick={() => setOpen(false)}
                    >
                      <BookOpen size={16} />
                      My Bookings
                    </div>
                  </Link>
                  <button 
                    className="flex items-center gap-2 py-2 text-muted-foreground" 
                    onClick={() => {
                      handleLogout();
                      setOpen(false);
                    }}
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </>
              ) : (
                <Link href="/auth">
                  <div 
                    className="flex items-center gap-2 py-2 text-muted-foreground cursor-pointer"
                    onClick={() => setOpen(false)}
                  >
                    <LogIn size={16} />
                    Login
                  </div>
                </Link>
              )}
              
              {/* EVHelplines in mobile view */}
              <Link href="/helplines">
                <div 
                  className="flex items-center gap-2 py-2 cursor-pointer text-red-500 font-medium"
                  onClick={() => setOpen(false)}
                >
                  <Phone size={16} />
                  EV Helplines
                </div>
              </Link>
              
              {/* Show green power icon in mobile view too */}
              <div className="mt-4 flex items-center text-green-600">
                <BatteryFull size={16} className="mr-2" />
                <span className="text-sm font-medium">Powered by Green Energy</span>
              </div>
              
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm font-medium">Theme</span>
                <ThemeToggle />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default Navbar;