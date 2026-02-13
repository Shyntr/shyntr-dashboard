import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  AppWindow, 
  KeyRound, 
  GlobeLock, 
  Settings,
  Menu,
  X,
  Sun,
  Moon
} from 'lucide-react';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import { useTheme } from '../../context/ThemeContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Applications', href: '/applications', icon: AppWindow },
  { name: 'SSO Integrations', href: '/sso', icon: KeyRound },
  { name: 'OIDC Connections', href: '/oidc', icon: GlobeLock },
  { name: 'Settings', href: '/settings', icon: Settings },
];

function Sidebar({ mobile = false, onClose }) {
  const location = useLocation();
  
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-border/40">
        <img 
          src="/mascot.png" 
          alt="Shyntr Mascot" 
          className="h-10 w-10 object-contain"
        />
        <span className="font-heading text-xl font-bold text-foreground">Shyntr</span>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              data-testid={`nav-${item.name.toLowerCase().replace(' ', '-')}`}
              onClick={mobile ? onClose : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
                isActive 
                  ? 'bg-primary/10 text-primary border border-primary/20' 
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              <item.icon className="h-5 w-5" strokeWidth={1.5} />
              {item.name}
            </Link>
          );
        })}
      </nav>
      
      {/* Footer */}
      <div className="border-t border-border/40 p-4">
        <div className="text-xs text-muted-foreground">
          <p>Shyntr IAM v1.0</p>
          <p className="mt-1">Identity Management</p>
        </div>
      </div>
    </div>
  );
}

export function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  
  return (
    <div className="relative min-h-screen bg-background">
      {/* Radial gradient background */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/10 via-background to-background pointer-events-none" />
      
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col overflow-y-auto border-r border-border/40 bg-card/50 backdrop-blur-xl">
          <Sidebar />
        </div>
      </div>
      
      {/* Mobile Header */}
      <div className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border/40 bg-background/80 backdrop-blur-xl px-4 lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="mobile-menu-btn">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-card/95 backdrop-blur-xl">
            <Sidebar mobile onClose={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
        
        <div className="flex items-center gap-2">
          <img 
            src="/mascot.png" 
            alt="Shyntr" 
            className="h-8 w-8 object-contain"
          />
          <span className="font-heading text-lg font-bold">Shyntr</span>
        </div>
        
        <div className="flex-1" />
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleTheme}
          data-testid="theme-toggle-mobile"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>
      
      {/* Desktop Header */}
      <div className="hidden lg:fixed lg:top-0 lg:right-0 lg:left-64 lg:z-40 lg:flex lg:h-16 lg:items-center lg:justify-end lg:gap-4 lg:border-b lg:border-border/40 lg:bg-background/80 lg:backdrop-blur-xl lg:px-6">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleTheme}
          data-testid="theme-toggle-desktop"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>
      
      {/* Main Content */}
      <main className="lg:pl-64 pt-0 lg:pt-16">
        <div className="relative min-h-[calc(100vh-4rem)] lg:min-h-[calc(100vh-4rem)]">
          {children}
        </div>
      </main>
    </div>
  );
}
