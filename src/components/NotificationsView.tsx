import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, AlertTriangle, Clock, CheckCircle, X, Eye } from 'lucide-react';
import { Notification, NotificationType, NotificationPriority } from '@/types/notification';

interface NotificationsViewProps {
  notifications: Notification[];
  onMarkAsRead: (notificationId: string) => void;
  onDismiss: (notificationId: string) => void;
  onNavigateToProject: (projectId: string) => void;
}

export function NotificationsView({ notifications, onMarkAsRead, onDismiss, onNavigateToProject }: NotificationsViewProps) {
  const [filterPriority, setFilterPriority] = useState<NotificationPriority | 'all'>('all');
  const [filterType, setFilterType] = useState<NotificationType | 'all'>('all');
  const [showRead, setShowRead] = useState(false);

  const filteredNotifications = notifications
    .filter(notification => {
      const matchesPriority = filterPriority === 'all' || notification.priority === filterPriority;
      const matchesType = filterType === 'all' || notification.type === filterType;
      const matchesReadStatus = showRead || !notification.isRead;
      return matchesPriority && matchesType && matchesReadStatus;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'material_order': return AlertTriangle;
      case 'checklist_incomplete': return Clock;
      case 'inspection_missing': return Eye;
      case 'deadline_warning': return Bell;
      case 'project_rescheduled': return Clock;
      default: return Bell;
    }
  };

  const getTypeLabel = (type: NotificationType) => {
    switch (type) {
      case 'material_order': return 'Material Order';
      case 'checklist_incomplete': return 'Checklist';
      case 'inspection_missing': return 'Inspection';
      case 'deadline_warning': return 'Deadline';
      case 'project_rescheduled': return 'Omplanering';
      default: return 'Notification';
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const urgentCount = notifications.filter(n => n.priority === 'urgent' && !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Notifications & Reminders
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount} unread
              </Badge>
            )}
          </h2>
          <p className="text-muted-foreground">
            Stay on top of project deadlines and requirements
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
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterType} onValueChange={(value: NotificationType | 'all') => setFilterType(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Typ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla typer</SelectItem>
              <SelectItem value="material_order">Materialbeställningar</SelectItem>
              <SelectItem value="checklist_incomplete">Checklists</SelectItem>
              <SelectItem value="inspection_missing">Inspections</SelectItem>
              <SelectItem value="deadline_warning">Deadlines</SelectItem>
              <SelectItem value="project_rescheduled">Omplaneringar</SelectItem>
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

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {urgentCount}
            </div>
            <div className="text-sm text-muted-foreground">Urgent Notifications</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {notifications.filter(n => n.priority === 'high' && !n.isRead).length}
            </div>
            <div className="text-sm text-muted-foreground">High Priority</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {notifications.filter(n => n.actionRequired && !n.isRead).length}
            </div>
            <div className="text-sm text-muted-foreground">Action Required</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">
              {unreadCount}
            </div>
            <div className="text-sm text-muted-foreground">Total Unread</div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.map(notification => {
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
                        <Badge variant="outline" className="text-xs">
                          {getTypeLabel(notification.type)}
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
                        Mark Read
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
                      Dismiss
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredNotifications.length === 0 && (
        <div className="text-center py-12">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <div className="text-muted-foreground">
            {showRead ? 'No notifications found matching your criteria.' : 'No unread notifications. Great job staying on top of things!'}
          </div>
        </div>
      )}
    </div>
  );
}