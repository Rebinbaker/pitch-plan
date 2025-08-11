import { Project } from '@/types/project';
import { Notification } from '@/types/notification';

export function generateTestNotifications(projects: Project[]): Notification[] {
  console.log('GENERATING TEST NOTIFICATIONS for projects:', projects.length);
  const testNotifications: Notification[] = [];
  const processedProjects = new Set<string>(); // Track which projects already have notifications
  
  const currentWeek = 33; // Current week number (approximate)
  
  // Check each project for delayed start (only one notification per project)
  projects.forEach((project, index) => {
    // Skip if we already processed this project
    if (processedProjects.has(project.id)) return;
    
    // Check if constructionStartWeek exists and extract week number
    if (!project.constructionStartWeek) return;
    const weekMatch = project.constructionStartWeek.match(/\d+/);
    if (!weekMatch) return;
    
    const plannedWeek = parseInt(weekMatch[0]);
    
    // If the planned week was V32 or earlier (which is in the past)
    if (plannedWeek <= 32) {
      const daysLate = Math.min((currentWeek - plannedWeek) * 7, 14); // Max 14 days
      
      testNotifications.push({
        id: `delayed-start-${project.id}-${Date.now()}`,
        type: 'deadline_warning',
        priority: 'high',
        title: 'Försenad projektstart',
        message: `Projekt "${project.name}" startade cirka ${daysLate} dagar senare än planerat (${project.constructionStartWeek}). Brådskande: Kontrollera materialbeställningar och tidplan.`,
        projectId: project.id,
        projectName: project.name,
        createdAt: new Date().toISOString(),
        isRead: false,
        actionRequired: true
      });
      
      processedProjects.add(project.id);
      console.log(`GENERATED delayed start notification for project: ${project.name}`);
    }
  });
  
  // If no delayed projects found, create one test notification for demonstration
  if (testNotifications.length === 0 && projects.length > 0) {
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