import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, AlertTriangle, Clock, CheckCircle, X, Eye, Users, Calendar, FolderOpen, FileText, Settings } from 'lucide-react';
import { Notification, NotificationType, NotificationPriority, NotificationCategory } from '@/types/notification';

interface NotificationsViewProps {
  notifications: Notification[];
  onMarkAsRead: (notificationId: string) => void;
  onDismiss: (notificationId: string) => void;
  onNavigateToProject: (projectId: string) => void;
}

export function NotificationsView({ notifications, onMarkAsRead, onDismiss, onNavigateToProject }: NotificationsViewProps) {
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>('general');
  const [filterPriority, setFilterPriority] = useState<NotificationPriority | 'all'>('all');
  const [showRead, setShowRead] = useState(false);

  const getNotificationsByCategory = (category: NotificationCategory) => {
    return notifications
      .filter(notification => {
        const matchesCategory = notification.category === category;
        const matchesPriority = filterPriority === 'all' || notification.priority === filterPriority;
        const matchesReadStatus = showRead || !notification.isRead;
        return matchesCategory && matchesPriority && matchesReadStatus;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const getUnreadCountByCategory = (category: NotificationCategory) => {
    return notifications.filter(n => n.category === category && !n.isRead).length;
  };

  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case 'team': return Users;
      case 'planning': return Calendar;
      case 'project': return FolderOpen;
      case 'files': return FileText;
      case 'general': return Settings;
      default: return Bell;
    }
  };

  const getCategoryLabel = (category: NotificationCategory) => {
    switch (category) {
      case 'team': return 'Team';
      case 'planning': return 'Planering';
      case 'project': return 'Projekt';
      case 'files': return 'Filer';
      case 'general': return 'Allmänt';
      default: return 'Allmänt';
    }
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      // Team icons
      case 'team_member_added': return Users;
      case 'team_role_changed': return Users;
      case 'team_leave_request': return Calendar;
      // Planning icons
      case 'planning_date_changed': return Calendar;
      case 'planning_milestone': return CheckCircle;
      case 'planning_schedule_update': return Clock;
      // Project icons
      case 'project_created': return FolderOpen;
      case 'project_status_changed': return Settings;
      case 'project_completed': return CheckCircle;
      // File icons
      case 'file_uploaded': return FileText;
      case 'file_updated': return FileText;
      case 'file_shared': return FileText;
      // General icons
      case 'material_order': return AlertTriangle;
      case 'checklist_incomplete': return Clock;
      case 'inspection_missing': return Eye;
      case 'deadline_warning': return Bell;
      case 'project_rescheduled': return Clock;
      default: return Bell;
    }
  };

  const totalUnreadCount = notifications.filter(n => !n.isRead).length;
  const categories: NotificationCategory[] = ['team', 'planning', 'project', 'files', 'general'];

  const renderNotificationsList = (categoryNotifications: Notification[]) => (
    <div className="space-y-3">
      {categoryNotifications.map(notification => {
        const TypeIcon = getTypeIcon(notification.type);
        return (
          <Card 
            key={notification.id} 
            className={`shadow-card transition-all duration-200 cursor-pointer hover:shadow-lg hover:scale-[1.01] ${
              !notification.isRead ? 'border-l-4 border-l-primary bg-primary/5' : ''
            }`}
            onClick={() => onNavigateToProject(notification.projectId)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`p-2 rounded-full ${getPriorityColor(notification.priority)} text-white`}>
                    <TypeIcon className="w-4 h-4" />
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-foreground">
                        {notification.title}
                      </h4>
                      <Badge 
                        variant="secondary" 
                        className={`${getPriorityColor(notification.priority)} text-white text-xs`}
                      >
                        {notification.priority}
                      </Badge>
                      {notification.actionRequired && (
                        <Badge variant="destructive" className="text-xs">
                          Action Required
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Project: {notification.projectName}</span>
                      <span>
                        {new Date(notification.createdAt).toLocaleDateString()} at{' '}
                        {new Date(notification.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {!notification.isRead && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkAsRead(notification.id);
                      }}
                    >
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismiss(notification.id);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      
      {categoryNotifications.length === 0 && (
        <div className="text-center py-12">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <div className="text-muted-foreground">
            {showRead ? 'Inga notifikationer hittades.' : 'Inga olästa notifikationer i denna kategori.'}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Meddelanden
            {totalUnreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {totalUnreadCount} olästa
              </Badge>
            )}
          </h2>
          <p className="text-muted-foreground">
            Håll koll på alla viktiga uppdateringar
          </p>
        </div>
        
        <div className="flex gap-2">
          <Select value={filterPriority} onValueChange={(value: NotificationPriority | 'all') => setFilterPriority(value)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Prioritet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla prioriteter</SelectItem>
              <SelectItem value="urgent">Brådskande</SelectItem>
              <SelectItem value="high">Hög</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Låg</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant={showRead ? "default" : "outline"}
            onClick={() => setShowRead(!showRead)}
            size="sm"
          >
            {showRead ? "Dölj lästa" : "Visa lästa"}
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={(value) => setActiveCategory(value as NotificationCategory)}>
        <TabsList className="grid w-full grid-cols-5">
          {categories.map(category => {
            const CategoryIcon = getCategoryIcon(category);
            const unreadCount = getUnreadCountByCategory(category);
            return (
              <TabsTrigger key={category} value={category} className="flex items-center gap-2">
                <CategoryIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{getCategoryLabel(category)}</span>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="text-xs ml-1 min-w-[20px] h-5 flex items-center justify-center">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {categories.map(category => (
          <TabsContent key={category} value={category} className="mt-6">
            {renderNotificationsList(getNotificationsByCategory(category))}
          </TabsContent>
        ))}
      </Tabs>

    </div>
  );
}