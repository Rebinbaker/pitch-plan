import { Project } from '@/types/project';
import { Notification } from '@/types/notification';

export function generateTestNotifications(projects: Project[]): Notification[] {
  console.log('GENERATING TEST NOTIFICATIONS for projects:', projects.length);
  const testNotifications: Notification[] = [];
  
  // Always create at least one test notification to verify the system works
  if (projects.length > 0) {
    const firstProject = projects[0];
    console.log('GENERATING for first project:', firstProject.name, 'Week:', firstProject.constructionStartWeek);
    
    // Create a delayed start notification for the first project
    testNotifications.push({
      id: `test-delay-${firstProject.id}-${Date.now()}`,
      type: 'deadline_warning',
      priority: 'high',
      title: 'Försenad projektstart',
      message: `Projekt "${firstProject.name}" startade senare än planerat (${firstProject.constructionStartWeek}). Kontrollera tidplanen.`,
      projectId: firstProject.id,
      projectName: firstProject.name,
      createdAt: new Date().toISOString(),
      isRead: false,
      actionRequired: true
    });
  }
  
  // Create additional test notifications for projects with V32 or earlier weeks (which are in the past)
  const currentWeek = 33; // Current week number (approximate)
  
  projects.slice(1, 3).forEach((project, index) => {
    // Check if constructionStartWeek exists and extract week number
    if (!project.constructionStartWeek) return;
    const weekMatch = project.constructionStartWeek.match(/\d+/);
    if (!weekMatch) return;
    
    const plannedWeek = parseInt(weekMatch[0]);
    
    // If the planned week was V32 or earlier (which is in the past)
    if (plannedWeek <= 32) {
      const daysLate = (currentWeek - plannedWeek) * 7; // Rough calculation
      
      testNotifications.push({
        id: `test-notification-${project.id}-${Date.now()}-${index}`,
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