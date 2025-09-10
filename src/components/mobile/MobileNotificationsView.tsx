import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Info, Clock, X, Check, Eye } from 'lucide-react';
import { Notification, NotificationPriority, NotificationCategory } from '@/types/notification';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

interface MobileNotificationsViewProps {
  notifications: Notification[];
  onMarkAsRead: (notificationId: string) => void;
  onDismiss: (notificationId: string) => void;
  onNavigateToProject: (projectId: string) => void;
}

export function MobileNotificationsView({ 
  notifications, 
  onMarkAsRead, 
  onDismiss, 
  onNavigateToProject 
}: MobileNotificationsViewProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.isRead;
    return true;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'low': return 'bg-info text-info-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityIcon = (priority: NotificationPriority) => {
    switch (priority) {
      case 'high': return AlertTriangle;
      case 'medium': return Clock;
      case 'low': return Info;
      default: return Info;
    }
  };

  const getCategoryLabel = (category: NotificationCategory) => {
    switch (category) {
      case 'project': return 'Projekt';
      case 'team': return 'Team';
      case 'planning': return 'Planering';
      case 'files': return 'Filer';
      case 'general': return 'Allmänt';
      default: return category;
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Notifieringar</h2>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} olästa` : 'Alla lästa'}
          </p>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter('all')}
          className="flex-1"
        >
          Alla ({notifications.length})
        </Button>
        <Button
          variant={filter === 'unread' ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter('unread')}
          className="flex-1"
        >
          Olästa ({unreadCount})
        </Button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-12 w-12 text-success mx-auto mb-3" />
              <p className="text-muted-foreground">
                {filter === 'unread' ? 'Inga olästa notifieringar' : 'Inga notifieringar'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notification) => {
            const PriorityIcon = getPriorityIcon(notification.priority);
            
            return (
              <Card 
                key={notification.id} 
                className={`transition-all hover:shadow-hover ${
                  !notification.isRead ? 'border-primary/50 bg-primary/5' : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    {/* Priority Icon */}
                    <div className={`p-2 rounded-full ${getPriorityColor(notification.priority)} flex-shrink-0`}>
                      <PriorityIcon className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm leading-tight mb-1">
                            {notification.title}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                        </div>
                        
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1 ml-2" />
                        )}
                      </div>

                      {/* Meta Info */}
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className="text-xs">
                          {getCategoryLabel(notification.category)}
                        </Badge>
                        {notification.projectName && (
                          <Badge variant="secondary" className="text-xs">
                            {notification.projectName}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(notification.createdAt), 'dd MMM HH:mm', { locale: sv })}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        {!notification.isRead && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => onMarkAsRead(notification.id)}
                            className="flex-1"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Markera som läst
                          </Button>
                        )}
                        
                        {notification.projectId && (
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => onNavigateToProject(notification.projectId)}
                            className="flex-1"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Visa projekt
                          </Button>
                        )}
                        
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => onDismiss(notification.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}