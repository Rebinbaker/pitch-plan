import { useState, useEffect } from 'react';
import { Project } from '@/types/project';
import { ScaffoldingTrailer } from '@/types/scaffolding';
import { ConstructionTeam } from '@/types/team';
import { ProjectFile } from '@/types/files';
import { Notification } from '@/types/notification';
import { mockProjects } from '@/data/mockProjects';
import { mockScaffolding } from '@/data/mockScaffolding';
import { mockTeams } from '@/data/mockTeams';
import { mockNotifications } from '@/data/mockNotifications';
import { defaultWorkPhases } from '@/types/project';

const STORAGE_KEYS = {
  PROJECTS: 'lovable_projects',
  SCAFFOLDING: 'lovable_scaffolding',
  TEAMS: 'lovable_teams',
  FILES: 'lovable_files',
  NOTIFICATIONS: 'lovable_notifications'
};

export const useLocalStorage = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [scaffolding, setScaffolding] = useState<ScaffoldingTrailer[]>([]);
  const [teams, setTeams] = useState<ConstructionTeam[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data from localStorage on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = () => {
    setLoading(true);
    
    // Migration function to ensure work phases have proper structure
    const migrateWorkPhases = (projects: Project[]): Project[] => {
      console.log('MIGRATION: Starting migration of projects:', projects.length);
      return projects.map(project => {
        console.log('MIGRATION: Processing project:', project.name);
        
        // Check if workPhases need migration (missing essential fields)
        if (!project.workPhases || project.workPhases.length === 0 || !project.workPhases[0].id) {
          console.log('MIGRATION: Creating new workPhases structure for:', project.name);
          
          const newWorkPhases = defaultWorkPhases.map((defaultPhase, index) => ({
            ...defaultPhase,
            id: `workphase-${Date.now()}-${index}`,
            completed: false,
            completedAt: undefined,
            imagesReceived: false,
            inspectionConfirmed: false,
            comment: undefined,
            lastReminderSent: undefined,
          }));
          
          return {
            ...project,
            workPhases: newWorkPhases
          };
        }
        
        // If workPhases exist with proper structure, just ensure all required fields exist
        const updatedProject = {
          ...project,
          workPhases: project.workPhases.map(phase => ({
            ...phase,
            requiresDailyInspection: phase.requiresDailyInspection ?? true,
            imagesReceived: phase.imagesReceived ?? false,
            inspectionConfirmed: phase.inspectionConfirmed ?? false,
          }))
        };
        
        console.log('MIGRATION: Updated project:', project.name, 'with', updatedProject.workPhases.length, 'work phases');
        return updatedProject;
      });
    };
    
    // Load projects
    const savedProjects = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    console.log('LOADING: localStorage data exists:', !!savedProjects);
    
    if (savedProjects) {
      const parsedProjects = JSON.parse(savedProjects);
      console.log('LOADING: Parsed projects from localStorage:', parsedProjects.length);
      const migratedProjects = migrateWorkPhases(parsedProjects);
      console.log('LOADING: Setting migrated projects:', migratedProjects.length);
      setProjects(migratedProjects);
      // Save migrated data back to localStorage
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(migratedProjects));
      console.log('LOADING: Saved migrated data back to localStorage');
    } else {
      console.log('LOADING: No localStorage data, using mock projects');
      setProjects(mockProjects);
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(mockProjects));
    }

    // Load scaffolding
    const savedScaffolding = localStorage.getItem(STORAGE_KEYS.SCAFFOLDING);
    if (savedScaffolding) {
      setScaffolding(JSON.parse(savedScaffolding));
    } else {
      setScaffolding(mockScaffolding);
      localStorage.setItem(STORAGE_KEYS.SCAFFOLDING, JSON.stringify(mockScaffolding));
    }

    // Load teams
    const savedTeams = localStorage.getItem(STORAGE_KEYS.TEAMS);
    if (savedTeams) {
      setTeams(JSON.parse(savedTeams));
    } else {
      setTeams(mockTeams);
      localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(mockTeams));
    }

    // Load files
    const savedFiles = localStorage.getItem(STORAGE_KEYS.FILES);
    if (savedFiles) {
      setFiles(JSON.parse(savedFiles));
    } else {
      setFiles([]);
    }

    // Load notifications
    const savedNotifications = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (savedNotifications) {
      setNotifications(JSON.parse(savedNotifications));
    } else {
      setNotifications(mockNotifications);
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(mockNotifications));
    }

    setLoading(false);
  };

  const updateProject = async (updatedProject: Project) => {
    console.log('=== updateProject called ===');
    console.log('Project ID:', updatedProject.id);
    console.log('Project name:', updatedProject.name);
    console.log('Current actualConstructionStart:', updatedProject.actualConstructionStart);
    
    // Check if first work phase was just completed and set actual construction start
    const currentProject = projects.find(p => p.id === updatedProject.id);
    console.log('Found current project:', !!currentProject);
    console.log('Current project actualConstructionStart:', currentProject?.actualConstructionStart);
    
    if (currentProject && !currentProject.actualConstructionStart) {
      console.log('No actualConstructionStart yet, checking first work phase...');
      const firstWorkPhase = updatedProject.workPhases?.[0];
      console.log('First work phase:', {
        exists: !!firstWorkPhase,
        label: firstWorkPhase?.label,
        completed: firstWorkPhase?.completed,
        completedAt: firstWorkPhase?.completedAt,
        id: firstWorkPhase?.id
      });
      
      if (firstWorkPhase?.completed && firstWorkPhase.completedAt) {
        console.log('Setting actualConstructionStart to:', firstWorkPhase.completedAt);
        updatedProject = {
          ...updatedProject,
          actualConstructionStart: firstWorkPhase.completedAt,
        };
        console.log('Updated project actualConstructionStart:', updatedProject.actualConstructionStart);
      } else {
        console.log('First work phase not completed or missing completedAt');
      }
    } else {
      console.log('Skipping actualConstructionStart check - already exists or no current project');
    }

    const newProjects = projects.map(project => 
      project.id === updatedProject.id ? updatedProject : project
    );
    
    setProjects(newProjects);
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(newProjects));

    // Generate timeline notifications after project update
    const { checkProjectTimelineNotifications } = await import('@/utils/projectNotifications');
    const notification = checkProjectTimelineNotifications(updatedProject);
    
    if (notification) {
      console.log('Generated notification:', notification);
      const currentNotifications = [...notifications];
      // Check if this notification already exists to avoid duplicates
      const existingNotification = currentNotifications.find(n => 
        n.id === notification.id || 
        (n.projectId === notification.projectId && n.title.includes(notification.projectName))
      );
      
      if (!existingNotification) {
        // Convert ProjectNotification to Notification format
        const formattedNotification = {
          id: notification.id,
          type: 'deadline_warning' as const,
          priority: notification.type === 'early_completion' ? 'low' as const : 'medium' as const,
          title: notification.type === 'early_completion' ? 'Projekt slutfört i förtid' : 'Projektförseining',
          message: notification.message,
          projectId: notification.projectId,
          projectName: notification.projectName,
          createdAt: notification.createdAt,
          isRead: false,
          actionRequired: notification.type === 'delay_warning'
        };
        
        currentNotifications.push(formattedNotification);
        setNotifications(currentNotifications);
        localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(currentNotifications));
        console.log('Added notification to storage');
      } else {
        console.log('Notification already exists, skipping');
      }
    } else {
      console.log('No notification generated for this project update');
    }

    // Handle resource freeing when project is completed
    if (updatedProject.status === 'completed') {
      if (updatedProject.assignedTrailer) {
        await updateScaffolding({
          id: updatedProject.assignedTrailer,
          status: 'Tillgänglig'
        } as any);
      }
      
      if (updatedProject.constructionTeam) {
        const team = teams.find(t => t.name === updatedProject.constructionTeam);
        if (team) {
          await updateTeam({
            ...team,
            availabilityNextWeek: 'Tillgänglig'
          });
        }
      }
    }
  };

  const addProject = async (newProject: Project) => {
    console.log('Adding project to localStorage:', newProject.id, newProject.name);

    const newProjects = [newProject, ...projects];
    setProjects(newProjects);
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(newProjects));
  };

  const updateScaffolding = async (updatedTrailer: Partial<ScaffoldingTrailer> & { id: string }) => {
    console.log('Saving scaffolding to localStorage:', updatedTrailer.id);

    const newScaffolding = scaffolding.map(trailer => 
      trailer.id === updatedTrailer.id 
        ? { ...trailer, ...updatedTrailer }
        : trailer
    );
    
    setScaffolding(newScaffolding);
    localStorage.setItem(STORAGE_KEYS.SCAFFOLDING, JSON.stringify(newScaffolding));
  };

  const addScaffolding = async (newTrailer: ScaffoldingTrailer) => {
    console.log('Adding scaffolding to localStorage:', newTrailer.id, newTrailer.name);

    const newScaffolding = [...scaffolding, newTrailer];
    setScaffolding(newScaffolding);
    localStorage.setItem(STORAGE_KEYS.SCAFFOLDING, JSON.stringify(newScaffolding));
  };

  const updateTeam = async (updatedTeam: ConstructionTeam) => {
    console.log('Saving team to localStorage:', updatedTeam.id, updatedTeam.name);

    const newTeams = teams.map(team => 
      team.id === updatedTeam.id ? updatedTeam : team
    );
    
    setTeams(newTeams);
    localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(newTeams));
  };

  const addTeam = async (newTeam: ConstructionTeam) => {
    console.log('Adding team to localStorage:', newTeam.id, newTeam.name);

    const newTeams = [...teams, newTeam];
    setTeams(newTeams);
    localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(newTeams));
  };

  const uploadFile = async (file: Omit<ProjectFile, 'id' | 'uploadedAt'>) => {
    const newFile: ProjectFile = {
      ...file,
      id: `file-${Date.now()}`,
      uploadedAt: new Date().toISOString(),
    };

    console.log('Saving file to localStorage:', newFile.id, newFile.name);

    const newFiles = [...files, newFile];
    setFiles(newFiles);
    localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(newFiles));
  };

  const markNotificationAsRead = async (notificationId: string) => {
    console.log('Marking notification as read in localStorage:', notificationId);

    const newNotifications = notifications.map(notification =>
      notification.id === notificationId
        ? { ...notification, isRead: true }
        : notification
    );
    
    setNotifications(newNotifications);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(newNotifications));
  };

  const dismissNotification = async (notificationId: string) => {
    console.log('Dismissing notification in localStorage:', notificationId);

    const newNotifications = notifications.filter(n => n.id !== notificationId);
    setNotifications(newNotifications);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(newNotifications));
  };

  return {
    projects,
    scaffolding,
    teams,
    files,
    notifications,
    loading,
    updateProject,
    addProject,
    updateScaffolding,
    addScaffolding,
    updateTeam,
    addTeam,
    uploadFile,
    markNotificationAsRead,
    dismissNotification
  };
};