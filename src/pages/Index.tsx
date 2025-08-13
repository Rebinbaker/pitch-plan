import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LogOut, User, Shield, Download } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSupabaseStorage } from '@/hooks/useSupabaseStorage';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ProjectDashboard } from '@/components/ProjectDashboard';
import { AddProjectModal } from '@/components/AddProjectModal';
import { ScaffoldingView } from '@/components/ScaffoldingView';
import { TeamsView } from '@/components/TeamsView';
import { FilesView } from '@/components/FilesView';
import { WeeklyPlanningView } from '@/components/WeeklyPlanningView';
import { NotificationsView } from '@/components/NotificationsView';
import { AvvaratMaterialOverview } from '@/components/AvvaratMaterialOverview';
import { SecurityStatus } from '@/components/SecurityStatus';
import { DataMigrationModal } from '@/components/DataMigrationModal';
import { DataExportModal } from '@/components/DataExportModal';
import TimeTrackingView from '@/components/TimeTrackingView';
import { useUserRole } from '@/hooks/useUserRole';
import { Project } from '@/types/project';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const Index = () => {
  const { signOut, user } = useAuth();
  const { isAdmin, role, loading: roleLoading } = useUserRole();
  
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
    updateScaffolding,
    addScaffolding,
    updateTeam,
    addTeam,
    uploadFile,
    markNotificationAsRead,
    dismissNotification,
    addNotifications,
    migrationStatus,
    checkMigrationNeeded,
    markMigrationCompleted,
  } = useSupabaseStorage();

  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('projects');
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
          {/* Header with logo on left and profile on right */}
          <div className="flex justify-between items-center mb-6">
            {/* Logo on the left */}
            <div className="flex items-center">
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
            <TabsList className="grid w-full grid-cols-9 hover:bg-background/80 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
              <TabsTrigger value="projects">Projekt</TabsTrigger>
              <TabsTrigger value="scaffolding">Ställningsvagnar</TabsTrigger>
              <TabsTrigger value="teams">Team</TabsTrigger>
              <TabsTrigger value="files">Filer</TabsTrigger>
              <TabsTrigger value="planning">Planering</TabsTrigger>
              <TabsTrigger value="timetracking">⏱️ Tidsrapporter</TabsTrigger>
              <TabsTrigger value="material">♻️ Avvarat Material</TabsTrigger>
              <TabsTrigger value="security">🔒 Säkerhet</TabsTrigger>
              <TabsTrigger value="notifications">
                Meddelanden
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                    {notifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="projects" className="space-y-6">
              <ProjectDashboard 
                projects={projects}
                onUpdateProject={updateProject}
                onAddProject={handleAddProject}
                trailers={scaffolding}
                teams={teams}
                onUpdateTeam={updateTeam}
                onUpdateTrailer={updateScaffolding}
                selectedProjectId={selectedProjectId}
                onClearSelection={() => setSelectedProjectId(null)}
                onAddNotifications={addNotifications}
              />
            </TabsContent>

            <TabsContent value="scaffolding" className="space-y-6">
              <ScaffoldingView 
                scaffolding={scaffolding}
                onUpdateScaffolding={updateScaffolding}
                onAddScaffolding={addScaffolding}
                projects={projects}
              />
            </TabsContent>

            <TabsContent value="teams" className="space-y-6">
              <TeamsView 
                teams={teams}
                onUpdateTeam={updateTeam}
                onAddTeam={addTeam}
                projects={projects}
              />
            </TabsContent>

            <TabsContent value="files" className="space-y-6">
              <FilesView 
                files={files}
                projects={projects}
                onUploadFile={uploadFile}
              />
            </TabsContent>

            <TabsContent value="planning" className="space-y-6">
              <WeeklyPlanningView 
                projects={projects}
                onUpdateProject={handleUpdateProject}
                trailers={scaffolding}
                onUpdateTrailer={updateScaffolding}
                onAddNotifications={addNotifications}
              />
            </TabsContent>

            <TabsContent value="timetracking" className="space-y-6">
              <TimeTrackingView />
            </TabsContent>

            <TabsContent value="material" className="space-y-6">
              <AvvaratMaterialOverview 
                projects={projects}
              />
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <SecurityStatus 
                onShowDataExport={() => setShowDataExportModal(true)}
              />
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
    </ProtectedRoute>
  );
};

export default Index;