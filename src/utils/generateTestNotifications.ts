import { Project } from '@/types/project';
import { Notification } from '@/types/notification';

export function generateTestNotifications(projects: Project[]): Notification[] {
  console.log('GENERATING TEST NOTIFICATIONS for projects:', projects.length);
  const testNotifications: Notification[] = [];
  
  // Only generate ONE test notification for demonstration purposes, not related to actual delays
  if (projects.length > 0) {
    const firstProject = projects[0];
    testNotifications.push({
      id: `demo-notification-${Date.now()}`,
      type: 'deadline_warning',
      priority: 'medium',
      title: 'Systemtest',
      message: `Detta är en testnotifiering för projekt "${firstProject.name}". Notifieringssystemet fungerar korrekt.`,
      projectId: firstProject.id,
      projectName: firstProject.name,
      createdAt: new Date().toISOString(),
      isRead: false,
      actionRequired: false
    });
  }
  
  return testNotifications;
}