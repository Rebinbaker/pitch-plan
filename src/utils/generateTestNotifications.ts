import { Project } from '@/types/project';
import { Notification } from '@/types/notification';

export function generateTestNotifications(projects: Project[]): Notification[] {
  const testNotifications: Notification[] = [];
  
  // Find projects that would logically be late based on their construction start weeks
  const currentDate = new Date();
  const currentWeek = Math.ceil((currentDate.getTime() - new Date(currentDate.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
  
  projects.forEach((project, index) => {
    // Extract week number from constructionStartWeek (e.g., "V32" -> 32)
    const weekMatch = project.constructionStartWeek.match(/\d+/);
    if (!weekMatch) return;
    
    const plannedWeek = parseInt(weekMatch[0]);
    
    // If the planned week was earlier than current week and project has actualConstructionStart
    if (plannedWeek < currentWeek && project.actualConstructionStart) {
      const daysLate = (currentWeek - plannedWeek) * 7; // Rough calculation
      
      testNotifications.push({
        id: `test-notification-${project.id}-${Date.now()}`,
        type: 'deadline_warning',
        priority: 'medium',
        title: 'Försenad projektstart',
        message: `Projekt "${project.name}" startade cirka ${Math.min(daysLate, 14)} dagar senare än planerat (${project.constructionStartWeek}).`,
        projectId: project.id,
        projectName: project.name,
        createdAt: new Date().toISOString(),
        isRead: false,
        actionRequired: true
      });
    }
  });
  
  // Add a few more test notifications for demonstration
  if (projects.length > 0) {
    const firstProject = projects[0];
    testNotifications.push({
      id: `demo-notification-${Date.now()}`,
      type: 'deadline_warning',
      priority: 'high',
      title: 'Viktigt: Projektuppdatering krävs',
      message: `Projekt "${firstProject.name}" kräver omedelbar uppmärksamhet. Kontrollera att alla arbetsmomenten följer tidplanen.`,
      projectId: firstProject.id,
      projectName: firstProject.name,
      createdAt: new Date().toISOString(),
      isRead: false,
      actionRequired: true
    });
  }
  
  return testNotifications;
}