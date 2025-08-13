import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Project } from '@/types/project';
import { ScaffoldingTrailer, ScaffoldingStatus, ScaffoldingOwnership } from '@/types/scaffolding';
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
  const [supabaseProjects, setSupabaseProjects] = useState<Project[]>([]);
  const [supabaseScaffolding, setSupabaseScaffolding] = useState<ScaffoldingTrailer[]>([]);
  const [loading, setLoading] = useState(false);

  // Load projects and scaffolding from Supabase when migration is completed
  useEffect(() => {
    if (user && migrationStatus === 'completed') {
      loadSupabaseProjects();
      loadSupabaseScaffolding();
    }
  }, [user, migrationStatus]);

  const loadSupabaseProjects = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const mappedProjects = data.map((project: any) => ({
        id: project.id,
        name: project.name,
        address: project.address || '',
        customerName: project.customer_name || '',
        customerPhone: project.customer_phone || '',
        responsibleSeller: project.responsible_seller || '',
        constructionTeam: project.construction_team || '',
        constructionStartWeek: project.construction_start_week || '',
        rotStatus: project.rot_status as any || 'No',
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
        region: project.region || 'Stockholm',
        avvaratMaterial: project.avvarat_material || undefined,
      }));
      
      setSupabaseProjects(mappedProjects);
    } catch (error) {
      console.error('Error loading Supabase projects:', error);
      // Fallback to localStorage if Supabase fails
      setMigrationStatus('pending');
      localStorage.removeItem('supabase_migration_completed');
    } finally {
      setLoading(false);
    }
  };

  const loadSupabaseScaffolding = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('scaffolding' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const mappedScaffolding = data.map((scaffold: any) => ({
        id: scaffold.id,
        name: scaffold.name,
        status: scaffold.status as ScaffoldingStatus,
        ownership: 'Egna ställningar' as ScaffoldingOwnership,
        assignedProject: '',
        location: '',
        moverNote: scaffold.description || '',
        lastUpdated: scaffold.updated_at || scaffold.created_at,
      }));
      
      setSupabaseScaffolding(mappedScaffolding);
    } catch (error) {
      console.error('Error loading Supabase scaffolding:', error);
    }
  };

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
    // For now, always return false to use Supabase data directly
    return false;
  };

  const markMigrationCompleted = () => {
    localStorage.setItem('supabase_migration_completed', 'true');
    setMigrationStatus('completed');
  };

  // Supabase functions with localStorage fallback
  const updateProject = async (updatedProject: Project) => {
    console.log('updateProject called for:', updatedProject.id, 'user:', user?.id, 'migrationStatus:', migrationStatus);
    try {
      if (user && migrationStatus === 'completed') {
        console.log('updateProject: Using Supabase storage');
        // Helper function to convert empty strings to null for date fields
        const formatDateField = (dateValue: string | undefined | null): string | null => {
          if (!dateValue || dateValue.trim() === '') {
            return null;
          }
          return dateValue;
        };

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
            start_date: formatDateField(updatedProject.startDate),
            deadline: formatDateField(updatedProject.deadline),
            estimated_work_days: updatedProject.estimatedWorkDays,
            actual_construction_start: formatDateField(updatedProject.actualConstructionStart),
            completion_percentage: updatedProject.completionPercentage,
            checklist: updatedProject.checklist || [],
            work_phases: updatedProject.workPhases || [],
            activity_log: updatedProject.activityLog || [],
            region: updatedProject.region,
            avvarat_material: updatedProject.avvaratMaterial || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', updatedProject.id)
          .eq('user_id', user.id);
        
        if (error) throw error;
        
        // Update local state instead of reloading to prevent redirect
        setSupabaseProjects(prev => 
          prev.map(p => p.id === updatedProject.id ? updatedProject : p)
        );
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
        // Helper function to convert empty strings to null for date fields
        const formatDateField = (dateValue: string | undefined | null): string | null => {
          if (!dateValue || dateValue.trim() === '') {
            return null;
          }
          return dateValue;
        };

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
            start_date: formatDateField(newProject.startDate),
            deadline: formatDateField(newProject.deadline),
            estimated_work_days: newProject.estimatedWorkDays,
            actual_construction_start: formatDateField(newProject.actualConstructionStart),
            completion_percentage: newProject.completionPercentage,
            checklist: newProject.checklist || [],
            work_phases: newProject.workPhases || [],
            activity_log: newProject.activityLog || [],
            region: newProject.region,
            user_id: user.id,
          });
        
        if (error) throw error;
        // Reload projects after adding
        await loadSupabaseProjects();
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
      if (user && migrationStatus === 'completed') {
        const { error } = await supabase
          .from('scaffolding' as any)
          .update({
            name: updatedTrailer.name,
            status: updatedTrailer.status,
            description: updatedTrailer.moverNote,
            updated_at: new Date().toISOString(),
          })
          .eq('id', updatedTrailer.id);
        
        if (error) throw error;
        // Reload scaffolding after update
        await loadSupabaseScaffolding();
      } else {
        await localStorageHook.updateScaffolding(updatedTrailer);
      }
      
      toast({
        title: "Ställning uppdaterad",
        description: `${updatedTrailer.name} har uppdaterats framgångsrikt.`,
      });
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
      if (user && migrationStatus === 'completed') {
        const { error } = await supabase
          .from('scaffolding' as any)
          .insert({
            name: newTrailer.name,
            status: newTrailer.status,
            description: newTrailer.moverNote,
            user_id: user.id,
          });
        
        if (error) throw error;
        // Reload scaffolding after adding
        await loadSupabaseScaffolding();
      } else {
        await localStorageHook.addScaffolding(newTrailer);
      }
      
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

  const deleteFile = async (fileId: string) => {
    try {
      await localStorageHook.deleteFile(fileId);
      toast({
        title: "Fil borttagen",
        description: "Filen har tagits bort framgångsrikt.",
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        variant: "destructive",
        title: "Fel vid borttagning",
        description: "Kunde inte ta bort filen. Försök igen.",
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
    projects: migrationStatus === 'completed' ? supabaseProjects : localStorageHook.projects,
    scaffolding: migrationStatus === 'completed' ? supabaseScaffolding : localStorageHook.scaffolding,
    loading: loading || localStorageHook.loading,
    migrationStatus,
    updateProject,
    addProject,
    updateScaffolding,
    addScaffolding,
    updateTeam,
    addTeam,
    uploadFile,
    deleteFile,
    markNotificationAsRead,
    dismissNotification,
    addNotifications,
    checkMigrationNeeded,
    markMigrationCompleted,
    loadSupabaseProjects,
    loadSupabaseScaffolding,
  };
};