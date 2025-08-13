import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Project } from '@/types/project';
import { ScaffoldingTrailer } from '@/types/scaffolding';
import { ConstructionTeam } from '@/types/team';
import { ProjectFile } from '@/types/files';
import { Notification } from '@/types/notification';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from '@/hooks/use-toast';

import { supabase } from '@/integrations/supabase/client';

// This hook provides Supabase storage with localStorage fallback
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

  // Supabase functions with localStorage fallback
  const updateProject = async (updatedProject: Project) => {
    try {
      if (user && migrationStatus === 'completed') {
        const { error } = await supabase
          .from('projects' as any)
          .update({
            name: updatedProject.name,
            address: updatedProject.address,
            customer_name: updatedProject.customerName,
            customer_phone: updatedProject.customerPhone,
            responsible_seller: updatedProject.responsibleSeller,
            construction_team: updatedProject.constructionTeam,
            construction_start_week: updatedProject.constructionStartWeek,
            rot_status: updatedProject.rotStatus,
            status: updatedProject.status,
            notes: updatedProject.notes,
            assigned_trailer: updatedProject.assignedTrailer,
            scaffolding_responsible: updatedProject.scaffoldingResponsible,
            start_date: updatedProject.startDate,
            deadline: updatedProject.deadline,
            estimated_work_days: updatedProject.estimatedWorkDays,
            actual_construction_start: updatedProject.actualConstructionStart,
            completion_percentage: updatedProject.completionPercentage,
            checklist: updatedProject.checklist || [],
            work_phases: updatedProject.workPhases || [],
            activity_log: updatedProject.activityLog || [],
            region: updatedProject.region,
            updated_at: new Date().toISOString(),
          })
          .eq('id', updatedProject.id);
        
        if (error) throw error;
      } else {
        await localStorageHook.updateProject(updatedProject);
      }
      
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
      if (user && migrationStatus === 'completed') {
        const { error } = await supabase
          .from('projects' as any)
          .insert({
            name: newProject.name,
            address: newProject.address,
            customer_name: newProject.customerName,
            customer_phone: newProject.customerPhone,
            responsible_seller: newProject.responsibleSeller,
            construction_team: newProject.constructionTeam,
            construction_start_week: newProject.constructionStartWeek,
            rot_status: newProject.rotStatus,
            status: newProject.status,
            notes: newProject.notes,
            assigned_trailer: newProject.assignedTrailer,
            scaffolding_responsible: newProject.scaffoldingResponsible,
            start_date: newProject.startDate,
            deadline: newProject.deadline,
            estimated_work_days: newProject.estimatedWorkDays,
            actual_construction_start: newProject.actualConstructionStart,
            completion_percentage: newProject.completionPercentage,
            checklist: newProject.checklist || [],
            work_phases: newProject.workPhases || [],
            activity_log: newProject.activityLog || [],
            region: newProject.region,
            user_id: user.id,
          });
        
        if (error) throw error;
      } else {
        await localStorageHook.addProject(newProject);
      }
      
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

  // Get data from Supabase or localStorage
  const getProjects = async (): Promise<Project[]> => {
    if (user && migrationStatus === 'completed') {
      const { data, error } = await supabase
        .from('projects' as any)
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data.map((project: any) => ({
        id: project.id,
        name: project.name,
        address: project.address || '',
        customerName: project.customer_name || '',
        customerPhone: project.customer_phone || '',
        responsibleSeller: project.responsible_seller || '',
        constructionTeam: project.construction_team || '',
        constructionStartWeek: project.construction_start_week || '',
        rotStatus: project.rot_status as any || 'Ej aktiverat',
        status: project.status as any,
        notes: project.notes || '',
        assignedTrailer: project.assigned_trailer || '',
        scaffoldingResponsible: project.scaffolding_responsible || '',
        startDate: project.start_date || '',
        deadline: project.deadline || '',
        estimatedWorkDays: project.estimated_work_days || 0,
        actualConstructionStart: project.actual_construction_start || '',
        completionPercentage: project.completion_percentage || 0,
        checklist: project.checklist || [],
        workPhases: project.work_phases || [],
        activityLog: project.activity_log || [],
        region: project.region || '',
      }));
    }
    return localStorageHook.projects;
  };

  return {
    ...localStorageHook,
    projects: user && migrationStatus === 'completed' ? [] : localStorageHook.projects,
    getProjects,
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