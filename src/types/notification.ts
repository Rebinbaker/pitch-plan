export type NotificationType = 
  // Team notifications
  | 'team_member_added' | 'team_role_changed' | 'team_leave_request'
  // Planning notifications
  | 'planning_date_changed' | 'planning_milestone' | 'planning_schedule_update'
  // Project notifications
  | 'project_created' | 'project_status_changed' | 'project_completed'
  // File notifications
  | 'file_uploaded' | 'file_updated' | 'file_shared'
  // General notifications
  | 'material_order' | 'checklist_incomplete' | 'inspection_missing' | 'deadline_warning' | 'project_rescheduled';

export type NotificationCategory = 'team' | 'planning' | 'project' | 'files' | 'general';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Notification {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message: string;
  projectId: string;
  projectName: string;
  createdAt: string;
  isRead: boolean;
  actionRequired: boolean;
}