import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Project } from '@/types/project';
import { ScaffoldingTrailer } from '@/types/scaffolding';
import { ConstructionTeam } from '@/types/team';
import { ProjectFile } from '@/types/files';
import { Notification } from '@/types/notification';
import { mockProjects } from '@/data/mockProjects';
import { mockScaffolding } from '@/data/mockScaffolding';
import { mockTeams } from '@/data/mockTeams';
import { mockNotifications } from '@/data/mockNotifications';

export const useSupabaseData = () => {
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [scaffolding, setScaffolding] = useState<ScaffoldingTrailer[]>(mockScaffolding);
  const [teams, setTeams] = useState<ConstructionTeam[]>(mockTeams);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [loading, setLoading] = useState(false);

  // Load all data on mount - currently using mock data until types are updated
  useEffect(() => {
    // Will enable database loading once types are available
    console.log('Using mock data - database tables created but types not yet updated');
  }, []);

  // CRUD operations for projects - temporarily using local state
  const updateProject = async (updatedProject: Project) => {
    console.log('Updating project:', updatedProject.name);
    setProjects(prev => 
      prev.map(project => 
        project.id === updatedProject.id ? updatedProject : project
      )
    );
  };

  const createProject = async (newProject: Omit<Project, 'id'>) => {
    console.log('Creating project:', newProject.name);
    const projectWithId: Project = {
      ...newProject,
      id: `project-${Date.now()}`,
      checklist: [],
      workPhases: [],
      completionPercentage: 0,
      activityLog: []
    };
    setProjects(prev => [projectWithId, ...prev]);
    return projectWithId;
  };

  // CRUD operations for scaffolding - temporarily using local state
  const updateScaffolding = async (updatedTrailer: ScaffoldingTrailer) => {
    console.log('Updating scaffolding:', updatedTrailer.name);
    setScaffolding(prev => 
      prev.map(trailer => 
        trailer.id === updatedTrailer.id ? updatedTrailer : trailer
      )
    );
  };

  const createScaffolding = async (newTrailer: Omit<ScaffoldingTrailer, 'id'>) => {
    console.log('Creating scaffolding:', newTrailer.name);
    const trailerWithId: ScaffoldingTrailer = {
      ...newTrailer,
      id: `trailer-${Date.now()}`
    };
    setScaffolding(prev => [...prev, trailerWithId]);
  };

  // CRUD operations for teams - temporarily using local state
  const updateTeam = async (updatedTeam: ConstructionTeam) => {
    console.log('Updating team:', updatedTeam.name);
    setTeams(prev => 
      prev.map(team => 
        team.id === updatedTeam.id ? updatedTeam : team
      )
    );
  };

  const createTeam = async (newTeam: Omit<ConstructionTeam, 'id'>) => {
    console.log('Creating team:', newTeam.name);
    const teamWithId: ConstructionTeam = {
      ...newTeam,
      id: `team-${Date.now()}`
    };
    setTeams(prev => [...prev, teamWithId]);
  };

  // File operations - temporarily using local state
  const uploadFile = async (file: Omit<ProjectFile, 'id' | 'uploadedAt'>) => {
    console.log('Uploading file:', file.name);
    const fileWithId: ProjectFile = {
      ...file,
      id: `file-${Date.now()}`,
      uploadedAt: new Date().toISOString()
    };
    setFiles(prev => [fileWithId, ...prev]);
  };

  // Notification operations - temporarily using local state
  const markAsRead = async (notificationId: string) => {
    console.log('Marking notification as read:', notificationId);
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  const dismissNotification = async (notificationId: string) => {
    console.log('Dismissing notification:', notificationId);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  return {
    // Data
    projects,
    scaffolding,
    teams,
    files,
    notifications,
    loading,
    
    // Operations
    updateProject,
    createProject,
    updateScaffolding,
    createScaffolding,
    updateTeam,
    createTeam,
    uploadFile,
    markAsRead,
    dismissNotification,
    
    // Refresh - will be implemented once database types are available
    loadAllData: () => console.log('Database refresh will be enabled once types are updated')
  };
};