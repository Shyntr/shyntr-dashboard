import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  AppWindow, 
  Link2,
  Building2,
  Menu,
  Sun,
  Moon,
  ChevronDown,
  Settings as SettingsIcon
} from 'lucide-react';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { 
    name: 'Applications', 
    icon: AppWindow,
    children: [
      { name: 'OIDC Clients', href: '/applications/oidc', protocol: 'oidc' },
      { name: 'SAML Clients', href: '/applications/saml', protocol: 'saml' },
    ]
  },
  { 
    name: 'Connections', 
    icon: Link2,
    children: [
      { name: 'OIDC Providers', href: '/connections/oidc', protocol: 'oidc' },
      { name: 'SAML Providers', href: '/connections/saml', protocol: 'saml' },
    ]
  },
  { name: 'Tenants', href: '/tenants', icon: Building2 },
  { name: 'Settings', href: '/settings', icon: SettingsIcon },
];

function NavItem({ item, mobile, onClose }) {
  const location = useLocation();
  const [open, setOpen] = useState(
    item.children?.some(child => location.pathname.startsWith(child.href))
  );
  
  const isActive = item.href === location.pathname;
  const hasChildren = item.children && item.children.length > 0;
  
  if (hasChildren) {
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200',
              'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
            data-testid={`nav-${item.name.toLowerCase()}-toggle`}
          >
            <span className="flex items-center gap-3">
              <item.icon className="h-5 w-5" strokeWidth={1.5} />
              {item.name}
            </span>
            <ChevronDown className={cn(
              'h-4 w-4 transition-transform duration-200',
              open && 'rotate-180'
            )} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-8 space-y-1 mt-1">
          {item.children.map((child) => {
            const childActive = location.pathname === child.href;
            return (
              <Link
                key={child.href}
                to={child.href}
                onClick={mobile ? onClose : undefined}
                data-testid={`nav-${child.name.toLowerCase().replace(/\s/g, '-')}`}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors duration-200',
                  childActive
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )}
              >
                <span className={cn(
                  'w-2 h-2 rounded-full',
                  child.protocol === 'oidc' ? 'bg-teal-500' : 'bg-orange-500'
                )} />
                {child.name}
              </Link>
            );
          })}
        </CollapsibleContent>
      </Collapsible>
    );
  }
  
  return (
    <Link
      to={item.href}
      data-testid={`nav-${item.name.toLowerCase()}`}
      onClick={mobile ? onClose : undefined}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200',
        isActive
          ? 'bg-primary/10 text-primary border border-primary/20'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      )}
    >
      <item.icon className="h-5 w-5" strokeWidth={1.5} />
      {item.name}
    </Link>
  );
}

function Sidebar({ mobile = false, onClose }) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-border/40">
        <img 
          src={window._env_.SHYNTR_PATH_PREFIX + "mascot.png"}
          alt="Shyntr Mascot" 
          className="h-10 w-10 object-contain"
        />
        <div className="flex flex-col">
          <span className="font-heading text-lg font-bold text-foreground leading-tight">Shyntr</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Auth Hub</span>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navigation.map((item) => (
          <NavItem key={item.name} item={item} mobile={mobile} onClose={onClose} />
        ))}
      </nav>
      
      {/* Footer */}
      <div className="border-t border-border/40 p-4">
        <div className="text-xs text-muted-foreground">
          <p className="font-medium">Shyntr v1.0</p>
          <p className="mt-1 opacity-70">Protocol-Agnostic Auth</p>
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
            src={window._env_.SHYNTR_PATH_PREFIX + "mascot.png"}
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
