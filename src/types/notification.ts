export type NotificationType = 'material_order' | 'checklist_incomplete' | 'inspection_missing' | 'deadline_warning' | 'project_rescheduled';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  projectId: string;
  projectName: string;
  createdAt: string;
  isRead: boolean;
  actionRequired: boolean;
}