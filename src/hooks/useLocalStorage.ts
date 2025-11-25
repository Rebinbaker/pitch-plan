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
import { migrateProjectToNewPlanning, calculateBeraknatSlutDatum } from '@/utils/projectPlanning';

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
    
    // Force migration flag - set to false after initial migration
    const FORCE_MIGRATION = false;
    
    if (FORCE_MIGRATION) {
      console.log('FORCE MIGRATION: Clearing localStorage to force re-migration');
      localStorage.removeItem(STORAGE_KEYS.PROJECTS);
    }
    
    // Migration function to ensure work phases, checklist items and new planning fields
    const migrateProjects = (projects: Project[]): Project[] => {
      console.log('MIGRATION: Starting migration of projects:', projects.length);
      return projects.map(project => {
        console.log('MIGRATION: Processing project:', project.name);
        
        // First migrate to new planning structure
        let migratedProject = migrateProjectToNewPlanning(project);
        
        // Migrate checklist to include new "Generera garantibevis" item if missing
        if (migratedProject.checklist && !migratedProject.checklist.some(item => item.label === 'Generera garantibevis')) {
          console.log('MIGRATION: Adding "Generera garantibevis" to checklist for:', migratedProject.name);
          
          // Find the index where "Mark ready for invoice" is located
          const invoiceIndex = migratedProject.checklist.findIndex(item => item.label === 'Mark ready for invoice');
          
          const newChecklistItem = {
            id: `checklist-${migratedProject.id}-generera-garantibevis`,
            label: 'Generera garantibevis',
            completed: false,
            weight: 3
          };
          
          if (invoiceIndex !== -1) {
            // Insert before "Mark ready for invoice"
            migratedProject.checklist.splice(invoiceIndex, 0, newChecklistItem);
          } else {
            // Append to end if "Mark ready for invoice" not found
            migratedProject.checklist.push(newChecklistItem);
          }
        }
        
        // Then migrate work phases if needed
        console.log('MIGRATION CHECK: workPhases for', migratedProject.name, ':', migratedProject.workPhases);
        if (!migratedProject.workPhases || migratedProject.workPhases.length === 0 || !migratedProject.workPhases[0].id || migratedProject.workPhases[0].completed === undefined) {
          console.log('MIGRATION: Creating new workPhases structure for:', migratedProject.name);
          
          const newWorkPhases = defaultWorkPhases.map((defaultPhase, index) => ({
            ...defaultPhase,
            id: `workphase-${migratedProject.id}-${index}`,
            completed: false,
            completedAt: undefined,
            imagesReceived: false,
            inspectionConfirmed: false,
            comment: undefined,
            lastReminderSent: undefined,
          }));
          
          migratedProject = {
            ...migratedProject,
            workPhases: newWorkPhases
          };
          console.log('MIGRATION: Created workPhases:', newWorkPhases);
        } else {
          // Force migration for all existing projects to ensure correct structure
          console.log('MIGRATION: Force migrating workPhases for:', migratedProject.name, 'Current workPhases:', migratedProject.workPhases);
          
          migratedProject = {
            ...migratedProject,
            workPhases: migratedProject.workPhases.map((phase, index) => {
              console.log('MIGRATION: Checking phase', index, ':', phase);
              // Check if phase has proper structure
              if (!phase.id || phase.completed === undefined) {
                console.log('MIGRATION: Phase needs migration:', phase);
                // Use default structure with proper completion state
                const defaultPhase = defaultWorkPhases[index] || defaultWorkPhases[0];
                const migratedPhase = {
                  ...defaultPhase,
                  id: `workphase-${migratedProject.id}-${index}`,
                  completed: false,
                  completedAt: undefined,
                  imagesReceived: false,
                  inspectionConfirmed: false,
                  comment: undefined,
                  lastReminderSent: undefined,
                };
                console.log('MIGRATION: Migrated phase to:', migratedPhase);
                return migratedPhase;
              }
              
              console.log('MIGRATION: Phase already has proper structure:', phase);
              // Ensure all required fields exist
              return {
                ...phase,
                requiresDailyInspection: phase.requiresDailyInspection ?? true,
                imagesReceived: phase.imagesReceived ?? false,
                inspectionConfirmed: phase.inspectionConfirmed ?? false,
              };
            })
          };
          console.log('MIGRATION: Final migrated workPhases:', migratedProject.workPhases);
        }
        
        // After migration, check if project should be completed based on completion percentage
        console.log('MIGRATION: Checking completion for project:', migratedProject.name, {
          completionPercentage: migratedProject.completionPercentage,
          status: migratedProject.status,
          shouldAutoComplete: migratedProject.completionPercentage === 100 && migratedProject.status !== 'completed'
        });
        
        if (migratedProject.completionPercentage === 100 && migratedProject.status !== 'completed') {
          console.log('MIGRATION: Auto-completing project due to 100% completion:', migratedProject.name);
          migratedProject = {
            ...migratedProject,
            status: 'completed' as const,
          };
        }
        
        console.log('MIGRATION: Updated project:', migratedProject.name, 'with', migratedProject.workPhases.length, 'work phases');
        return migratedProject;
      });
    };
    
    // Load projects
    const savedProjects = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    console.log('LOADING: localStorage data exists:', !!savedProjects);
    
    if (savedProjects) {
      const parsedProjects = JSON.parse(savedProjects);
      console.log('LOADING: Parsed projects from localStorage:', parsedProjects.length);
      const migratedProjects = migrateProjects(parsedProjects);
      console.log('LOADING: Setting migrated projects:', migratedProjects.length);
      setProjects(migratedProjects);
      // Save migrated data back to localStorage
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(migratedProjects));
      console.log('LOADING: Saved migrated data back to localStorage');
    } else {
      console.log('LOADING: No localStorage data, using mock projects');
      const migratedMockProjects = migrateProjects(mockProjects);
      setProjects(migratedMockProjects);
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(migratedMockProjects));
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
    console.log('Projects in storage before update:', projects.length);
    
    // Check if first work phase was just completed and handle status transition
    const currentProject = projects.find(p => p.id === updatedProject.id);
    console.log('Found current project:', !!currentProject);
    console.log('Current project första_moment_bockat_datum:', currentProject?.första_moment_bockat_datum);
    
    if (currentProject && !currentProject.första_moment_bockat_datum) {
      console.log('No första_moment_bockat_datum yet, checking first work phase...');
      const firstWorkPhase = updatedProject.workPhases?.[0];
      console.log('First work phase:', {
        exists: !!firstWorkPhase,
        label: firstWorkPhase?.label,
        completed: firstWorkPhase?.completed,
        completedAt: firstWorkPhase?.completedAt,
        id: firstWorkPhase?.id
      });
      
      if (firstWorkPhase?.completed && firstWorkPhase.completedAt) {
        console.log('Setting första_moment_bockat_datum and changing status to ongoing');
        updatedProject = {
          ...updatedProject,
          första_moment_bockat_datum: firstWorkPhase.completedAt,
          status: 'ongoing' as const,
          // Keep legacy field for backwards compatibility
          actualConstructionStart: firstWorkPhase.completedAt,
        };
        console.log('Updated project första_moment_bockat_datum:', updatedProject.första_moment_bockat_datum);
      } else {
        console.log('First work phase not completed or missing completedAt');
      }
    } else {
      console.log('Skipping första_moment_bockat_datum check - already exists or no current project');
    }
    
    // Recalculate beräknat_slut_datum after potential status change
    updatedProject.beräknat_slut_datum = calculateBeraknatSlutDatum(updatedProject);

    const newProjects = projects.map(project => 
      project.id === updatedProject.id ? updatedProject : project
    );
    
    console.log('Saving projects to localStorage. Count before:', projects.length);
    console.log('Saving projects to localStorage. Count after:', newProjects.length);
    console.log('Updated project saved with actualConstructionStart:', updatedProject.actualConstructionStart);
    
    setProjects(newProjects);
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(newProjects));
    
    // Verify the save was successful
    const savedData = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    console.log('Data successfully saved to localStorage:', !!savedData);
    console.log('Saved data length:', savedData ? JSON.parse(savedData).length : 0);

    // Note: Timeline notifications are now handled directly in the UI components
    // where the specific actions occur (like in WeeklyPlanningView for rescheduling)

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

  const deleteScaffolding = async (trailerId: string) => {
    console.log('Deleting scaffolding from localStorage:', trailerId);

    const newScaffolding = scaffolding.filter(trailer => trailer.id !== trailerId);
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

  const deleteFile = async (fileId: string) => {
    console.log('Deleting file from localStorage:', fileId);

    const newFiles = files.filter(file => file.id !== fileId);
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

  const addNotifications = (newNotifications: Notification[]) => {
    const currentNotifications = [...notifications, ...newNotifications];
    setNotifications(currentNotifications);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(currentNotifications));
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
    deleteScaffolding,
    updateTeam,
    addTeam,
    uploadFile,
    deleteFile,
    markNotificationAsRead,
    dismissNotification,
    addNotifications,
  };
};