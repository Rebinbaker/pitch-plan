import { Project } from '@/types/project';
import { Notification } from '@/types/notification';

export function generateTestNotifications(projects: Project[]): Notification[] {
  const notifications: Notification[] = [
    // Team notifications
    {
      id: 'team-1',
      type: 'team_member_added',
      category: 'team',
      priority: 'medium',
      title: 'Ny teammedlem tillagd',
      message: 'Anna Svensson har lagts till i teamet Takarbetare',
      projectId: projects[0]?.id || '1',
      projectName: projects[0]?.name || 'Test Project',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      isRead: false,
      actionRequired: false,
    },
    {
      id: 'team-2',
      type: 'team_leave_request',
      category: 'team',
      priority: 'high',
      title: 'Ledighetsansökan',
      message: 'Erik Nilsson har ansökt om ledighet nästa vecka',
      projectId: projects[0]?.id || '1',
      projectName: projects[0]?.name || 'Test Project',
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      isRead: false,
      actionRequired: true,
    },
    
    // Planning notifications
    {
      id: 'plan-1',
      type: 'planning_date_changed',
      category: 'planning',
      priority: 'high',
      title: 'Projektdatum ändrat',
      message: 'Startdatum för Villa Andersson har flyttats fram med 3 dagar',
      projectId: projects[0]?.id || '1',
      projectName: projects[0]?.name || 'Test Project',
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      isRead: false,
      actionRequired: true,
    },
    {
      id: 'plan-2',
      type: 'planning_milestone',
      category: 'planning',
      priority: 'medium',
      title: 'Milstolpe uppnådd',
      message: 'Första byggfasen för Företagsbyggnad är nu klar',
      projectId: projects[1]?.id || '2',
      projectName: projects[1]?.name || 'Test Project 2',
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      isRead: true,
      actionRequired: false,
    },
    
    // Project notifications
    {
      id: 'proj-1',
      type: 'project_created',
      category: 'project',
      priority: 'medium',
      title: 'Nytt projekt skapat',
      message: 'Projekt "Radhus Andersson - Takbyte" har skapats och tilldelats team A',
      projectId: projects[2]?.id || '3',
      projectName: projects[2]?.name || 'Test Project 3',
      createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      isRead: false,
      actionRequired: false,
    },
    {
      id: 'proj-2',
      type: 'project_status_changed',
      category: 'project',
      priority: 'low',
      title: 'Projektstatus uppdaterad',
      message: 'Villa Karlsson har ändrat status till "Pågående"',
      projectId: projects[0]?.id || '1',
      projectName: projects[0]?.name || 'Test Project',
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      isRead: true,
      actionRequired: false,
    },
    
    // File notifications
    {
      id: 'file-1',
      type: 'file_uploaded',
      category: 'files',
      priority: 'low',
      title: 'Nya filer uppladdade',
      message: 'Besiktningsprotokoll har laddats upp för Villa Andersson',
      projectId: projects[0]?.id || '1',
      projectName: projects[0]?.name || 'Test Project',
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      isRead: false,
      actionRequired: false,
    },
    {
      id: 'file-2',
      type: 'file_shared',
      category: 'files',
      priority: 'medium',
      title: 'Filer delade',
      message: 'Tekniska ritningar har delats med team B för Företagsbyggnad',
      projectId: projects[1]?.id || '2',
      projectName: projects[1]?.name || 'Test Project 2',
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      isRead: false,
      actionRequired: false,
    },
    
    // General notifications
    {
      id: 'gen-1',
      type: 'material_order',
      category: 'general',
      priority: 'urgent',
      title: 'Brådskande materialbeställning',
      message: 'Material för takpannor behöver beställas innan imorgon',
      projectId: projects[0]?.id || '1',
      projectName: projects[0]?.name || 'Test Project',
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      isRead: false,
      actionRequired: true,
    },
  ];
  
  return notifications;
}