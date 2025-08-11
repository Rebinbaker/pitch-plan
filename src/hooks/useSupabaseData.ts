import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Project } from '@/types/project';
import { ScaffoldingTrailer } from '@/types/scaffolding';
import { ConstructionTeam } from '@/types/team';
import { ProjectFile } from '@/types/files';
import { Notification } from '@/types/notification';
import { trackProjectChanges } from '@/utils/projectChangeTracker';
import { toast } from 'sonner';

export const useSupabaseData = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [scaffolding, setScaffolding] = useState<ScaffoldingTrailer[]>([]);
  const [teams, setTeams] = useState<ConstructionTeam[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all data from Supabase
  useEffect(() => {
    if (user?.id) {
      loadAllData();
    }
  }, [user?.id]);

  const loadAllData = async () => {
    if (!user?.id) return;

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
      toast.error('Fel vid laddning av data');
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading projects:', error);
      return;
    }

    const formattedProjects: Project[] = data.map(project => ({
      id: project.id,
      name: project.name,
      address: project.address || '',
      customerName: project.customer_name || '',
      customerPhone: project.customer_phone || '',
      responsibleSeller: project.responsible_seller || '',
      constructionTeam: project.construction_team || '',
      startDate: project.start_date || '',
      deadline: project.deadline || '',
      constructionStartWeek: project.construction_start_week || '',
      estimatedWorkDays: project.estimated_work_days || 0,
      actualConstructionStart: project.actual_construction_start || '',
      rotStatus: (project.rot_status as any) || 'No',
      status: project.status as any,
      region: (project.region as any) || 'Stockholm',
      notes: project.notes || '',
      assignedTrailer: project.assigned_trailer || '',
      scaffoldingResponsible: project.scaffolding_responsible || '',
      completionPercentage: project.completion_percentage || 0,
      checklist: project.checklist as any || [],
      workPhases: project.work_phases as any || [],
      activityLog: project.activity_log as any || []
    }));

    setProjects(formattedProjects);
  };

  const loadScaffolding = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('scaffolding')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading scaffolding:', error);
      return;
    }

    const formattedScaffolding: ScaffoldingTrailer[] = data.map(item => ({
      id: item.id,
      name: item.name,
      status: item.status as any,
      ownership: 'Egna ställningar' as any,
      lastUpdated: item.updated_at
    }));

    setScaffolding(formattedScaffolding);
  };

  const loadTeams = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading teams:', error);
      return;
    }

    const formattedTeams: ConstructionTeam[] = data.map(team => ({
      id: team.id,
      name: team.name,
      type: team.type as any || 'Internt',
      leader: team.leader,
      currentJob: team.current_job,
      availabilityNextWeek: team.availability_next_week as any,
      performanceNotes: team.performance_notes,
      contactInfo: team.contact_info,
      skills: team.skills as any || [],
      members: team.members as any || [],
      sellers: team.sellers as any || []
    }));

    setTeams(formattedTeams);
  };

  const loadFiles = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error loading files:', error);
      return;
    }

    const formattedFiles: ProjectFile[] = data.map(file => ({
      id: file.id,
      name: file.name,
      type: file.type as any,
      url: file.url,
      projectId: file.project_id || '',
      uploadedAt: file.uploaded_at,
      uploadedBy: 'System',
      tags: []
    }));

    setFiles(formattedFiles);
  };

  const loadNotifications = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading notifications:', error);
      return;
    }

    const formattedNotifications: Notification[] = data.map(notif => ({
      id: notif.id,
      type: notif.type as any,
      priority: notif.priority as any,
      title: notif.title,
      message: notif.message,
      projectId: notif.project_id || '',
      projectName: notif.project_name || '',
      changedBy: notif.changed_by_user || '',
      isRead: notif.is_read,
      actionRequired: notif.action_required,
      createdAt: notif.created_at
    }));

    setNotifications(formattedNotifications);
  };

  const updateProject = async (updatedProject: Project) => {
    if (!user?.id) return;

    console.log('=== updateProject called ===');
    console.log('Project ID:', updatedProject.id);
    console.log('Project name:', updatedProject.name);

    // Track changes and generate notifications
    const currentProject = projects.find(p => p.id === updatedProject.id);
    if (currentProject) {
      const changeNotifications = trackProjectChanges(updatedProject, currentProject);
      if (changeNotifications.length > 0) {
        console.log('Generated change notifications:', changeNotifications.length);
        await addNotifications(changeNotifications);
      }
    }

    // Check if first work phase was just completed and set actual construction start
    if (currentProject && !currentProject.actualConstructionStart) {
      const firstWorkPhase = updatedProject.workPhases?.[0];
      if (firstWorkPhase?.completed && firstWorkPhase.completedAt) {
        updatedProject = {
          ...updatedProject,
          actualConstructionStart: firstWorkPhase.completedAt,
        };
      }
    }

    const { error } = await supabase
      .from('projects')
      .update({
        name: updatedProject.name,
        address: updatedProject.address,
        customer_name: updatedProject.customerName,
        customer_phone: updatedProject.customerPhone,
        responsible_seller: updatedProject.responsibleSeller,
        construction_team: updatedProject.constructionTeam,
        start_date: updatedProject.startDate,
        deadline: updatedProject.deadline,
        construction_start_week: updatedProject.constructionStartWeek,
        estimated_work_days: updatedProject.estimatedWorkDays,
        actual_construction_start: updatedProject.actualConstructionStart,
        rot_status: updatedProject.rotStatus,
        status: updatedProject.status,
        region: updatedProject.region,
        notes: updatedProject.notes,
        assigned_trailer: updatedProject.assignedTrailer,
        scaffolding_responsible: updatedProject.scaffoldingResponsible,
        completion_percentage: updatedProject.completionPercentage,
        checklist: updatedProject.checklist as any,
        work_phases: updatedProject.workPhases as any,
        activity_log: updatedProject.activityLog as any
      })
      .eq('id', updatedProject.id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating project:', error);
      toast.error('Fel vid uppdatering av projekt');
      return;
    }

    // Update local state
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    toast.success('Projekt uppdaterat');

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

  const addProject = async (newProject: Omit<Project, 'id'>) => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: newProject.name,
        address: newProject.address,
        customer_name: newProject.customerName,
        customer_phone: newProject.customerPhone,
        responsible_seller: newProject.responsibleSeller,
        construction_team: newProject.constructionTeam,
        start_date: newProject.startDate,
        deadline: newProject.deadline,
        construction_start_week: newProject.constructionStartWeek,
        estimated_work_days: newProject.estimatedWorkDays,
        actual_construction_start: newProject.actualConstructionStart,
        rot_status: newProject.rotStatus,
        status: newProject.status,
        region: newProject.region,
        notes: newProject.notes,
        assigned_trailer: newProject.assignedTrailer,
        scaffolding_responsible: newProject.scaffoldingResponsible,
        completion_percentage: newProject.completionPercentage,
        checklist: newProject.checklist as any,
        work_phases: newProject.workPhases as any,
        activity_log: newProject.activityLog as any
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding project:', error);
      toast.error('Fel vid skapande av projekt');
      return;
    }

    await loadProjects(); // Refresh projects
    toast.success('Projekt skapat');
  };

  const updateScaffolding = async (updatedTrailer: Partial<ScaffoldingTrailer> & { id: string }) => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('scaffolding')
      .update({
        name: updatedTrailer.name,
        status: updatedTrailer.status
      })
      .eq('id', updatedTrailer.id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating scaffolding:', error);
      toast.error('Fel vid uppdatering av ställning');
      return;
    }

    await loadScaffolding(); // Refresh scaffolding
    toast.success('Ställning uppdaterad');
  };

  const addScaffolding = async (newTrailer: Omit<ScaffoldingTrailer, 'id'>) => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('scaffolding')
      .insert({
        user_id: user.id,
        name: newTrailer.name,
        status: newTrailer.status
      });

    if (error) {
      console.error('Error adding scaffolding:', error);
      toast.error('Fel vid skapande av ställning');
      return;
    }

    await loadScaffolding(); // Refresh scaffolding
    toast.success('Ställning skapad');
  };

  const updateTeam = async (updatedTeam: ConstructionTeam) => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('teams')
      .update({
        name: updatedTeam.name,
        type: updatedTeam.type,
        leader: updatedTeam.leader,
        current_job: updatedTeam.currentJob,
        availability_next_week: updatedTeam.availabilityNextWeek,
        performance_notes: updatedTeam.performanceNotes,
        contact_info: updatedTeam.contactInfo,
        skills: updatedTeam.skills as any,
        members: updatedTeam.members as any,
        sellers: updatedTeam.sellers as any
      })
      .eq('id', updatedTeam.id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating team:', error);
      toast.error('Fel vid uppdatering av team');
      return;
    }

    await loadTeams(); // Refresh teams
    toast.success('Team uppdaterat');
  };

  const addTeam = async (newTeam: Omit<ConstructionTeam, 'id'>) => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('teams')
      .insert({
        user_id: user.id,
        name: newTeam.name,
        type: newTeam.type,
        leader: newTeam.leader,
        current_job: newTeam.currentJob,
        availability_next_week: newTeam.availabilityNextWeek,
        performance_notes: newTeam.performanceNotes,
        contact_info: newTeam.contactInfo,
        skills: newTeam.skills as any,
        members: newTeam.members as any,
        sellers: newTeam.sellers as any
      });

    if (error) {
      console.error('Error adding team:', error);
      toast.error('Fel vid skapande av team');
      return;
    }

    await loadTeams(); // Refresh teams
    toast.success('Team skapat');
  };

  const uploadFile = async (file: Omit<ProjectFile, 'id' | 'uploadedAt'>) => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('files')
      .insert({
        user_id: user.id,
        name: file.name,
        type: file.type,
        size: 0,
        url: file.url,
        project_id: file.projectId
      });

    if (error) {
      console.error('Error uploading file:', error);
      toast.error('Fel vid uppladdning av fil');
      return;
    }

    await loadFiles(); // Refresh files
    toast.success('Fil uppladdad');
  };

  const markNotificationAsRead = async (notificationId: string) => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error marking notification as read:', error);
      return;
    }

    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
  };

  const dismissNotification = async (notificationId: string) => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error dismissing notification:', error);
      return;
    }

    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const addNotifications = async (newNotifications: Notification[]) => {
    if (!user?.id || newNotifications.length === 0) return;

    const notificationsToInsert = newNotifications.map(notif => ({
      user_id: user.id,
      type: notif.type,
      priority: notif.priority,
      title: notif.title,
      message: notif.message,
      project_id: notif.projectId,
      project_name: notif.projectName,
      changed_by_user: notif.changedBy,
      is_read: notif.isRead,
      action_required: notif.actionRequired
    }));

    const { error } = await supabase
      .from('notifications')
      .insert(notificationsToInsert);

    if (error) {
      console.error('Error adding notifications:', error);
      return;
    }

    await loadNotifications(); // Refresh notifications
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
    dismissNotification,
    addNotifications
  };
};