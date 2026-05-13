import { FolderKanban, Truck, Users, UserCircle, FileText, CalendarDays, Clock, Package, Shield, Bell, Contact } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

interface AppNavSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  unreadNotifications: number;
}

const items = [
  { value: 'projects', label: 'Projekt', icon: FolderKanban },
  { value: 'scaffolding', label: 'Ställningsvagnar', icon: Truck },
  { value: 'teams', label: 'Team', icon: Users },
  { value: 'customers', label: 'Kunder', icon: UserCircle },
  { value: 'files', label: 'Filer', icon: FileText },
  { value: 'planning', label: 'Planering', icon: CalendarDays },
  { value: 'timetracking', label: 'Tidsrapporter', icon: Clock },
  { value: 'material', label: 'Avvarat Material', icon: Package },
  { value: 'resources', label: 'Resurser', icon: Contact },
  { value: 'security', label: 'Säkerhet', icon: Shield },
  { value: 'notifications', label: 'Meddelanden', icon: Bell },
];

export function AppNavSidebar({ activeTab, onTabChange, unreadNotifications }: AppNavSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigering</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.value;
                return (
                  <SidebarMenuItem key={item.value}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => onTabChange(item.value)}
                      tooltip={item.label}
                    >
                      <Icon className="h-4 w-4" />
                      {!collapsed && (
                        <span className="flex-1 flex items-center justify-between">
                          <span>{item.label}</span>
                          {item.value === 'notifications' && unreadNotifications > 0 && (
                            <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                              {unreadNotifications}
                            </span>
                          )}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
