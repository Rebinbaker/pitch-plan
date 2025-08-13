import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Project } from '@/types/project';
import { ScaffoldingTrailer } from '@/types/scaffolding';
import { ConstructionTeam } from '@/types/team';
import { ProjectFile } from '@/types/files';
import { Notification } from '@/types/notification';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from '@/hooks/use-toast';

// This hook provides a migration path from localStorage to Supabase
// It starts with localStorage but prepares for Supabase migration
export const useSupabaseStorage = () => {
  const { user } = useAuth();
  const localStorageHook = useLocalStorage();
  const [migrationStatus, setMigrationStatus] = useState<'pending' | 'migrating' | 'completed' | 'error'>('pending');

  // For now, return localStorage data but with enhanced error handling and migration preparation
  useEffect(() => {
    if (user && migrationStatus === 'pending') {
      // Check if migration is needed
      const migrationNeeded = checkMigrationNeeded();
      if (migrationNeeded) {
        setMigrationStatus('pending');
        // Migration will be triggered separately
      } else {
        setMigrationStatus('completed');
      }
    }
  }, [user, migrationStatus]);

  const checkMigrationNeeded = (): boolean => {
    // Check if localStorage data exists and Supabase migration hasn't been completed
    const hasLocalData = localStorage.getItem('lovable_projects') !== null;
    const migrationCompleted = localStorage.getItem('supabase_migration_completed') === 'true';
    return hasLocalData && !migrationCompleted;
  };

  const markMigrationCompleted = () => {
    localStorage.setItem('supabase_migration_completed', 'true');
    setMigrationStatus('completed');
  };

  // Enhanced versions of localStorage functions with better error handling
  const updateProject = async (updatedProject: Project) => {
    try {
      await localStorageHook.updateProject(updatedProject);
      toast({
        title: "Projekt uppdaterat",
        description: `${updatedProject.name} har uppdaterats framgångsrikt.`,
      });
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        variant: "destructive",
        title: "Fel vid uppdatering",
        description: "Kunde inte uppdatera projektet. Försök igen.",
      });
      throw error;
    }
  };

  const addProject = async (newProject: Project) => {
    try {
      await localStorageHook.addProject(newProject);
      toast({
        title: "Projekt skapat",
        description: `${newProject.name} har skapats framgångsrikt.`,
      });
    } catch (error) {
      console.error('Error adding project:', error);
      toast({
        variant: "destructive",
        title: "Fel vid skapande",
        description: "Kunde inte skapa projektet. Försök igen.",
      });
      throw error;
    }
  };

  const updateScaffolding = async (updatedTrailer: Partial<ScaffoldingTrailer> & { id: string }) => {
    try {
      await localStorageHook.updateScaffolding(updatedTrailer);
    } catch (error) {
      console.error('Error updating scaffolding:', error);
      toast({
        variant: "destructive",
        title: "Fel vid uppdatering",
        description: "Kunde inte uppdatera ställningen. Försök igen.",
      });
      throw error;
    }
  };

  const addScaffolding = async (newTrailer: ScaffoldingTrailer) => {
    try {
      await localStorageHook.addScaffolding(newTrailer);
      toast({
        title: "Ställning skapad",
        description: `${newTrailer.name} har skapats framgångsrikt.`,
      });
    } catch (error) {
      console.error('Error adding scaffolding:', error);
      toast({
        variant: "destructive",
        title: "Fel vid skapande",
        description: "Kunde inte skapa ställningen. Försök igen.",
      });
      throw error;
    }
  };

  const updateTeam = async (updatedTeam: ConstructionTeam) => {
    try {
      await localStorageHook.updateTeam(updatedTeam);
    } catch (error) {
      console.error('Error updating team:', error);
      toast({
        variant: "destructive",
        title: "Fel vid uppdatering",
        description: "Kunde inte uppdatera teamet. Försök igen.",
      });
      throw error;
    }
  };

  const addTeam = async (newTeam: ConstructionTeam) => {
    try {
      await localStorageHook.addTeam(newTeam);
      toast({
        title: "Team skapat",
        description: `${newTeam.name} har skapats framgångsrikt.`,
      });
    } catch (error) {
      console.error('Error adding team:', error);
      toast({
        variant: "destructive",
        title: "Fel vid skapande",
        description: "Kunde inte skapa teamet. Försök igen.",
      });
      throw error;
    }
  };

  const uploadFile = async (file: Omit<ProjectFile, 'id' | 'uploadedAt'>) => {
    try {
      await localStorageHook.uploadFile(file);
      toast({
        title: "Fil uppladdad",
        description: `${file.name} har laddats upp framgångsrikt.`,
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        variant: "destructive",
        title: "Fel vid uppladdning",
        description: "Kunde inte ladda upp filen. Försök igen.",
      });
      throw error;
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await localStorageHook.markNotificationAsRead(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  };

  const dismissNotification = async (notificationId: string) => {
    try {
      await localStorageHook.dismissNotification(notificationId);
    } catch (error) {
      console.error('Error dismissing notification:', error);
      throw error;
    }
  };

  const addNotifications = async (newNotifications: Notification[]) => {
    try {
      await localStorageHook.addNotifications(newNotifications);
    } catch (error) {
      console.error('Error adding notifications:', error);
      throw error;
    }
  };

  return {
    ...localStorageHook,
    migrationStatus,
    updateProject,
    addProject,
    updateScaffolding,
    addScaffolding,
    updateTeam,
    addTeam,
    uploadFile,
    markNotificationAsRead,
    dismissNotification,
    addNotifications,
    checkMigrationNeeded,
    markMigrationCompleted,
  };
};