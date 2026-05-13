import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { 
  Menu, 
  LogOut, 
  Home, 
  Truck, 
  Users, 
  Clock, 
  FileText, 
  Calendar,
  Package,
  Shield,
  Bell,
  Contact
} from 'lucide-react';

interface MobileHeaderProps {
  user: any;
  username?: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  unreadNotifications?: number;
}

export function MobileHeader({ 
  user, 
  username, 
  activeTab, 
  onTabChange, 
  onLogout, 
  unreadNotifications = 0 
}: MobileHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuItems = [
    { id: 'projects', label: 'Projekt', icon: Home },
    { id: 'scaffolding', label: 'Ställning', icon: Truck },
    { id: 'teams', label: 'Team', icon: Users },
    { id: 'timetracking', label: 'Tidsregistrering', icon: Clock },
    { id: 'files', label: 'Filer', icon: FileText },
    { id: 'planning', label: 'Veckoplanering', icon: Calendar },
    { id: 'material', label: 'Material', icon: Package },
    { id: 'resources', label: 'Resurser', icon: Contact },
    { id: 'security', label: 'Säkerhet', icon: Shield },
    { id: 'notifications', label: 'Meddelanden', icon: Bell, badge: unreadNotifications },
  ];

  const handleMenuItemClick = (tabId: string) => {
    onTabChange(tabId);
    setIsMenuOpen(false);
  };

  const currentTab = menuItems.find(item => item.id === activeTab);

  return (
    <header className="bg-card/95 backdrop-blur-sm border-b border-border/50 sticky top-0 z-50">
      <div className="px-4">
        <div className="flex justify-between items-center h-14">
          {/* Logo and current page */}
          <div className="flex items-center gap-3">
            <img 
              src="/lovable-uploads/c09b6995-d03a-4e86-b925-942212af5d38.png" 
              alt="Lokala Hantverkarna Logo" 
              className="h-8 w-auto"
            />
            <div className="h-4 w-px bg-border" />
            <span className="text-sm font-medium text-foreground">
              {currentTab?.label || 'Projekt'}
            </span>
          </div>

          {/* Menu and Profile */}
          <div className="flex items-center gap-2">
            {/* Menu Button */}
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="relative">
                  <Menu className="h-5 w-5" />
                  {unreadNotifications > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center"
                    >
                      {unreadNotifications > 99 ? '99+' : unreadNotifications}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              
              <SheetContent side="top" className="h-auto">
                <SheetHeader className="pb-4">
                  <SheetTitle>Meny</SheetTitle>
                </SheetHeader>
                
                <div className="grid grid-cols-2 gap-3">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    
                    return (
                      <Button
                        key={item.id}
                        variant={isActive ? "default" : "outline"}
                        onClick={() => handleMenuItemClick(item.id)}
                        className="flex items-center gap-3 h-12 justify-start relative"
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{item.label}</span>
                        {item.badge && item.badge > 0 && (
                          <Badge 
                            variant="destructive" 
                            className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center"
                          >
                            {item.badge > 99 ? '99+' : item.badge}
                          </Badge>
                        )}
                      </Button>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {username ? username.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {username || user?.email}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logga ut</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}