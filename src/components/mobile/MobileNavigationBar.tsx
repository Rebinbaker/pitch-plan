import { Button } from '@/components/ui/button';
import { 
  Home, 
  Truck, 
  Users, 
  Clock, 
  FileText, 
  Calendar,
  Package,
  Shield,
  Bell,
  Menu
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

interface MobileNavigationBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  unreadNotifications?: number;
}

export function MobileNavigationBar({ 
  activeTab, 
  onTabChange, 
  unreadNotifications = 0 
}: MobileNavigationBarProps) {
  const mainTabs = [
    { id: 'projects', label: 'Projekt', icon: Home },
    { id: 'scaffolding', label: 'Ställning', icon: Truck },
    { id: 'teams', label: 'Team', icon: Users },
    { id: 'time', label: 'Tid', icon: Clock },
  ];

  const secondaryTabs = [
    { id: 'files', label: 'Filer', icon: FileText },
    { id: 'planning', label: 'Planering', icon: Calendar },
    { id: 'material', label: 'Material', icon: Package },
    { id: 'security', label: 'Säkerhet', icon: Shield },
    { id: 'notifications', label: 'Notiser', icon: Bell, badge: unreadNotifications },
  ];

  return (
    <>
      {/* Bottom Navigation Bar - Main Tabs */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
        <div className="flex items-center justify-around py-2 px-1">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <Button
                key={tab.id}
                variant="ghost"
                size="sm"
                onClick={() => onTabChange(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 h-auto py-2 ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{tab.label}</span>
              </Button>
            );
          })}
          
          {/* More Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 flex flex-col items-center gap-1 h-auto py-2 text-muted-foreground"
              >
                <div className="relative">
                  <Menu className="h-5 w-5" />
                  {unreadNotifications > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs flex items-center justify-center"
                    >
                      {unreadNotifications > 99 ? '99+' : unreadNotifications}
                    </Badge>
                  )}
                </div>
                <span className="text-xs font-medium">Mer</span>
              </Button>
            </SheetTrigger>
            
            <SheetContent side="bottom" className="h-auto p-6">
              <div className="space-y-1">
                <h3 className="font-semibold text-lg mb-4">Fler funktioner</h3>
                <div className="grid grid-cols-2 gap-3">
                  {secondaryTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    
                    return (
                      <Button
                        key={tab.id}
                        variant={isActive ? "default" : "outline"}
                        onClick={() => onTabChange(tab.id)}
                        className="flex items-center gap-3 h-12 justify-start"
                      >
                        <div className="relative">
                          <Icon className="h-5 w-5" />
                          {tab.badge && tab.badge > 0 && (
                            <Badge 
                              variant="destructive" 
                              className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs flex items-center justify-center"
                            >
                              {tab.badge > 99 ? '99+' : tab.badge}
                            </Badge>
                          )}
                        </div>
                        <span className="font-medium">{tab.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      
      {/* Bottom padding to account for fixed navigation */}
      <div className="h-16" />
    </>
  );
}