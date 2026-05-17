import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppNavSidebar } from '@/components/AppNavSidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LogOut, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSupabaseStorage } from '@/hooks/useSupabaseStorage';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ProjectDashboard } from '@/components/ProjectDashboard';
import { AddProjectModal } from '@/components/AddProjectModal';
import { ScaffoldingView } from '@/components/ScaffoldingView';
import { MobileProjectDashboard } from '@/components/mobile/MobileProjectDashboard';
import { MobileScaffoldingView } from '@/components/mobile/MobileScaffoldingView';
import { MobileTeamsView } from '@/components/mobile/MobileTeamsView';
import { MobileTimeTrackingView } from '@/components/mobile/MobileTimeTrackingView';
import { MobileFilesView } from '@/components/mobile/MobileFilesView';
import { MobilePlanningView } from '@/components/mobile/MobilePlanningView';
import { MobileNotificationsView } from '@/components/mobile/MobileNotificationsView';
import { MobileMaterialView } from '@/components/mobile/MobileMaterialView';
import { MobileSecurityView } from '@/components/mobile/MobileSecurityView';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { useIsMobile } from '@/hooks/use-mobile';
import { TeamsView } from '@/components/TeamsView';
import { FilesView } from '@/components/FilesView';
import { WeeklyPlanningView } from '@/components/WeeklyPlanningView';
import { NotificationsView } from '@/components/NotificationsView';
import { AvvaratMaterialOverview } from '@/components/AvvaratMaterialOverview';
import { SecurityStatus } from '@/components/SecurityStatus';
import { CustomersView } from '@/components/CustomersView';
import { ResourcesView } from '@/components/resources/ResourcesView';
import { DataMigrationModal } from '@/components/DataMigrationModal';
import { DataExportModal } from '@/components/DataExportModal';
import TimeTrackingView from '@/components/TimeTrackingView';
import { useUserRole } from '@/hooks/useUserRole';
import { Project } from '@/types/project';
import { ConstructionTeam } from '@/types/team';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const Index = () => {
  const { signOut, user } = useAuth();
  const { isAdmin, role, loading: roleLoading, isWorker } = useUserRole();
  const isMobile = useIsMobile();
  
  // Debug logging
  console.log('Current user role:', role, 'isAdmin:', isAdmin, 'roleLoading:', roleLoading);
  const [username, setUsername] = useState<string>('');
  const {
    projects,
    scaffolding,
    teams,
    files,
    notifications,
    loading,
    updateProject,
    addProject,
    deleteProject,
    updateScaffolding,
    addScaffolding,
    deleteScaffolding,
    updateTeam,
    addTeam,
    deleteTeam,
    uploadFile,
    deleteFile,
    markNotificationAsRead,
    dismissNotification,
    addNotifications,
    migrationStatus,
    checkMigrationNeeded,
    markMigrationCompleted,
  } = useSupabaseStorage();

  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window === 'undefined') return 'projects';
    return localStorage.getItem('activeTab') || 'projects';
  });

  useEffect(() => {
    try {
      localStorage.setItem('activeTab', activeTab);
    } catch {}
  }, [activeTab]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showDataExportModal, setShowDataExportModal] = useState(false);
  const [showMigrationModal, setShowMigrationModal] = useState(false);

  // Fetch username from profile
  useEffect(() => {
    const fetchUsername = async () => {
      if (user?.id) {
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('user_id', user.id)
          .single();
        
        if (data && !error) {
          setUsername(data.username);
        }
      }
    };

    fetchUsername();
  }, [user]);

  // Check for migration needs
  useEffect(() => {
    if (user && checkMigrationNeeded()) {
      setShowMigrationModal(true);
    }
  }, [user, checkMigrationNeeded]);

  // Generate test notifications for projects on first load (works for both localStorage and Supabase)
  useEffect(() => {
    const generateNotifications = async () => {
      console.log('NOTIFICATION CHECK: Projects length:', projects.length, 'Notifications length:', notifications.length);
      
      // Only generate notifications if we haven't generated any yet AND we have projects
      const hasTestNotifications = notifications.some(n => n.id.includes('team-') || n.id.includes('plan-') || n.id.includes('proj-') || n.id.includes('file-') || n.id.includes('gen-'));
      
      if (projects.length > 0 && !hasTestNotifications) {
        const { generateTestNotifications } = await import('@/utils/generateTestNotifications');
        const testNotifications = generateTestNotifications(projects);
        
        console.log('NOTIFICATION CHECK: Generated test notifications:', testNotifications.length);
        
        if (testNotifications.length > 0) {
          console.log('NOTIFICATION CHECK: Adding notifications:', testNotifications);
          await addNotifications(testNotifications);
          
          toast({
            title: "Testnotifikationer genererade",
            description: `${testNotifications.length} notifikationer har lagts till för testning.`,
          });
        }
      }
    };

    // Add a small delay to ensure other data is loaded first
    const timeoutId = setTimeout(generateNotifications, 1000);
    return () => clearTimeout(timeoutId);
  }, [projects, notifications.length, addNotifications]);

  const handleAddProject = () => {
    setIsAddProjectModalOpen(true);
  };

  const handleCreateProject = (newProject: any) => {
    addProject(newProject);
    setIsAddProjectModalOpen(false);
  };

  const handleNavigateToProject = (projectId: string) => {
    // Switch to projects tab and set selected project
    setActiveTab('projects');
    setSelectedProjectId(projectId);
  };

  const handleUpdateProject = (projectId: string, updates: Partial<Project>) => {
    console.log('Index.tsx handleUpdateProject called for:', projectId);
    const project = projects.find(p => p.id === projectId);
    if (project) {
      console.log('Index.tsx calling updateProject with:', updates);
      updateProject({ ...project, ...updates });
    }
  };

  const handleUpdateTeam = (updatedTeam: ConstructionTeam) => {
    updateTeam(updatedTeam);
  };

  const handleAddTeam = (newTeam: ConstructionTeam) => {
    addTeam(newTeam);
  };

  const handleDeleteTeam = (teamId: string) => {
    deleteTeam(teamId);
  };

  if (!roleLoading && isWorker) {
    return <Navigate to="/worker" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Laddar data...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-subtle relative">
        {/* Background image */}
        <div 
          className="fixed inset-0 bg-contain bg-center bg-no-repeat opacity-50 z-0"
          style={{ 
            backgroundImage: 'url(/lovable-uploads/7bf989f5-6fb0-4457-86aa-977ae4c5ff5b.png)',
            backgroundAttachment: 'fixed',
            backgroundSize: '100%'
          }}
        />
        <div className="relative z-10 container mx-auto px-4 py-8">
          {/* Mobile Layout */}
          {isMobile ? (
            <div className="fixed inset-0 z-50">
              <MobileHeader
                user={user}
                username={username}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onLogout={signOut}
                unreadNotifications={notifications.filter(n => !n.isRead).length}
              />
              
              <div className="pt-14 overflow-y-auto h-full bg-background/90 backdrop-blur-sm">
                {activeTab === 'projects' && (
                  <MobileProjectDashboard
                    projects={projects}
                    onUpdateProject={updateProject}
                    onAddProject={addProject}
                    trailers={scaffolding}
                    teams={teams}
                    files={files}
                  />
                )}
                {activeTab === 'scaffolding' && (
                  <MobileScaffoldingView
                    scaffolding={scaffolding}
                    onUpdateScaffolding={updateScaffolding}
                    onAddScaffolding={addScaffolding}
                    onDeleteScaffolding={deleteScaffolding}
                    projects={projects}
                  />
                )}
                {activeTab === 'teams' && (
                  <MobileTeamsView
                    teams={teams}
                    onUpdateTeam={updateTeam}
                    onAddTeam={addTeam}
                  />
                )}
                {activeTab === 'timetracking' && (
                  <MobileTimeTrackingView projects={projects} />
                )}
                {activeTab === 'files' && (
                  <MobileFilesView
                    files={files}
                    projects={projects}
                    onUploadFile={uploadFile}
                    onDeleteFile={deleteFile}
                  />
                )}
                {activeTab === 'planning' && (
                  <MobilePlanningView projects={projects} />
                )}
                {activeTab === 'material' && (
                  <MobileMaterialView projects={projects} />
                )}
                {activeTab === 'resources' && (
                  <div className="p-4"><ResourcesView /></div>
                )}
                {activeTab === 'security' && (
                  <MobileSecurityView />
                )}
                {activeTab === 'notifications' && (
                  <MobileNotificationsView
                    notifications={notifications}
                    onMarkAsRead={markNotificationAsRead}
                    onDismiss={dismissNotification}
                    onNavigateToProject={handleNavigateToProject}
                  />
                )}
              </div>
            </div>
          ) : (
            /* Desktop Layout */
            <SidebarProvider defaultOpen={false}>
              <div className="flex w-full">
                <AppNavSidebar
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  unreadNotifications={notifications.filter(n => !n.isRead).length}
                />
                <div className="flex-1 min-w-0">
              {/* Header with logo on left and profile on right */}
              <div className="flex justify-between items-center mb-6">
                {/* Logo on the left */}
                <div className="flex items-center gap-3">
                  <SidebarTrigger />
                  <img 
                    src="/lovable-uploads/c09b6995-d03a-4e86-b925-942212af5d38.png" 
                    alt="Lokala Hantverkarna" 
                    className="h-20 w-auto hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Profile on the right */}
                <div className="flex items-center gap-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src="#" alt={username} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {username ? username.charAt(0).toUpperCase() : 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">{username}</p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {user?.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {isAdmin && (
                        <>
                          <DropdownMenuItem asChild>
                            <Link to="/admin" className="cursor-pointer flex items-center">
                              <Shield className="mr-2 h-4 w-4" />
                              <span>Administratör</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Logga ut</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">

                <TabsContent value="projects" className="space-y-6">
                  <ProjectDashboard 
                    projects={projects}
                    onUpdateProject={updateProject}
                    onDeleteProject={isAdmin ? deleteProject : undefined}
                    onAddProject={handleAddProject}
                    trailers={scaffolding}
                    teams={teams}
                    onUpdateTeam={updateTeam}
                    onUpdateTrailer={updateScaffolding}
                    selectedProjectId={selectedProjectId}
                    onClearSelection={() => setSelectedProjectId(null)}
                    onAddNotifications={addNotifications}
                    onFileUploaded={uploadFile}
                    isAdmin={isAdmin}
                    files={files}
                  />
                </TabsContent>

                <TabsContent value="scaffolding" className="space-y-6">
                  <ScaffoldingView
                    scaffolding={scaffolding}
                    onUpdateScaffolding={updateScaffolding}
                    onAddScaffolding={addScaffolding}
                    onDeleteScaffolding={deleteScaffolding}
                    onReloadScaffolding={() => window.location.reload()}
                    projects={projects}
                  />
                </TabsContent>

                <TabsContent value="teams" className="space-y-6">
                  <TeamsView 
                    teams={teams}
                    onUpdateTeam={handleUpdateTeam}
                    onAddTeam={handleAddTeam}
                    onDeleteTeam={handleDeleteTeam}
                    projects={projects}
                  />
                </TabsContent>

                <TabsContent value="customers" className="space-y-6">
                  <CustomersView projects={projects} />
                </TabsContent>

                <TabsContent value="files" className="space-y-6">
                  <FilesView 
                    files={files}
                    projects={projects}
                    onUploadFile={uploadFile}
                    onDeleteFile={deleteFile}
                  />
                </TabsContent>

                <TabsContent value="planning" className="space-y-6">
                  <WeeklyPlanningView 
                    projects={projects}
                    onUpdateProject={handleUpdateProject}
                    trailers={scaffolding}
                    onUpdateTrailer={updateScaffolding}
                    onAddNotifications={addNotifications}
                    onFileUploaded={uploadFile}
                    files={files}
                  />
                </TabsContent>

                <TabsContent value="timetracking" className="space-y-6">
                  <TimeTrackingView />
                </TabsContent>

                <TabsContent value="material" className="space-y-6">
                  <AvvaratMaterialOverview projects={projects} />
                </TabsContent>

                <TabsContent value="resources" className="space-y-6">
                  <ResourcesView />
                </TabsContent>

                <TabsContent value="security" className="space-y-6">
                  <SecurityStatus />
                </TabsContent>

                <TabsContent value="notifications" className="space-y-6">
                  <NotificationsView 
                    notifications={notifications}
                    onMarkAsRead={markNotificationAsRead}
                    onDismiss={dismissNotification}
                    onNavigateToProject={handleNavigateToProject}
                  />
                </TabsContent>
              </Tabs>

              <AddProjectModal
                isOpen={isAddProjectModalOpen}
                onClose={() => setIsAddProjectModalOpen(false)}
                onAddProject={handleCreateProject}
                teams={teams}
              />

              <DataExportModal
                isOpen={showDataExportModal}
                onClose={() => setShowDataExportModal(false)}
              />

              <DataMigrationModal
                isOpen={showMigrationModal}
                onClose={() => setShowMigrationModal(false)}
                onMigrationComplete={() => {
                  markMigrationCompleted();
                  setShowMigrationModal(false);
                }}
              />
                </div>
              </div>
            </SidebarProvider>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Index;
