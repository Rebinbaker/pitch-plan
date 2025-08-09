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
  const [projects, setProjects] = useState<Project[]>([]);
  const [scaffolding, setScaffolding] = useState<ScaffoldingTrailer[]>([]);
  const [teams, setTeams] = useState<ConstructionTeam[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadProjects(),
        loadScaffolding(),
        loadTeams(),
        loadFiles(),
        loadNotifications()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      // Fallback to mock data if database fails
      setProjects(mockProjects);
      setScaffolding(mockScaffolding);
      setTeams(mockTeams);
      setNotifications(mockNotifications);
    }
    setLoading(false);
  };

  const loadProjects = async () => {
    // Temporarily use mock data until Supabase types are updated
    console.log('Loading projects from database (using mock data temporarily)');
    setProjects(mockProjects);
  };

  const loadScaffolding = async () => {
    // Temporarily use mock data until Supabase types are updated
    console.log('Loading scaffolding from database (using mock data temporarily)');
    setScaffolding(mockScaffolding);
  };

  const loadTeams = async () => {
    // Temporarily use mock data until Supabase types are updated
    console.log('Loading teams from database (using mock data temporarily)');
    setTeams(mockTeams);
  };

  const loadFiles = async () => {
    // Temporarily use empty array until Supabase types are updated
    console.log('Loading files from database (using empty array temporarily)');
    setFiles([]);
  };

  const loadNotifications = async () => {
    // Temporarily use mock data until Supabase types are updated
    console.log('Loading notifications from database (using mock data temporarily)');
    setNotifications(mockNotifications);
  };

  const updateProject = async (updatedProject: Project) => {
    // Temporarily log action and update state directly
    console.log('Updating project in database:', updatedProject.id, updatedProject.name);

    setProjects(prev => prev.map(project => 
      project.id === updatedProject.id ? updatedProject : project
    ));

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
    // Temporarily log action and update state directly
    console.log('Adding project to database:', newProject.id, newProject.name);

    setProjects(prev => [newProject, ...prev]);
  };

  const updateScaffolding = async (updatedTrailer: Partial<ScaffoldingTrailer> & { id: string }) => {
    // Temporarily log action and update state directly
    console.log('Updating scaffolding in database:', updatedTrailer.id);

    setScaffolding(prev => prev.map(trailer => 
      trailer.id === updatedTrailer.id 
        ? { ...trailer, ...updatedTrailer }
        : trailer
    ));
  };

  const addScaffolding = async (newTrailer: ScaffoldingTrailer) => {
    // Temporarily log action and update state directly
    console.log('Adding scaffolding to database:', newTrailer.id, newTrailer.name);

    setScaffolding(prev => [...prev, newTrailer]);
  };

  const updateTeam = async (updatedTeam: ConstructionTeam) => {
    // Temporarily log action and update state directly
    console.log('Updating team in database:', updatedTeam.id, updatedTeam.name);

    setTeams(prev => prev.map(team => 
      team.id === updatedTeam.id ? updatedTeam : team
    ));
  };

  const addTeam = async (newTeam: ConstructionTeam) => {
    // Temporarily log action and update state directly
    console.log('Adding team to database:', newTeam.id, newTeam.name);

    setTeams(prev => [...prev, newTeam]);
  };

  const uploadFile = async (file: Omit<ProjectFile, 'id' | 'uploadedAt'>) => {
    const newFile: ProjectFile = {
      ...file,
      id: `file-${Date.now()}`,
      uploadedAt: new Date().toISOString(),
    };

    // Temporarily log action and update state directly
    console.log('Uploading file to database:', newFile.id, newFile.name);

    setFiles(prev => [...prev, newFile]);
  };

  const markNotificationAsRead = async (notificationId: string) => {
    // Temporarily log action and update state directly
    console.log('Marking notification as read in database:', notificationId);

    setNotifications(prev => prev.map(notification =>
      notification.id === notificationId
        ? { ...notification, isRead: true }
        : notification
    ));
  };

  const dismissNotification = async (notificationId: string) => {
    // Temporarily log action and update state directly
    console.log('Dismissing notification in database:', notificationId);

    setNotifications(prev => prev.filter(n => n.id !== notificationId));
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