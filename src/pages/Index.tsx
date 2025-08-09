import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectDashboard } from '@/components/ProjectDashboard';
import { AddProjectModal } from '@/components/AddProjectModal';
import { ScaffoldingView } from '@/components/ScaffoldingView';
import { TeamsView } from '@/components/TeamsView';
import { FilesView } from '@/components/FilesView';
import { WeeklyPlanningView } from '@/components/WeeklyPlanningView';
import { NotificationsView } from '@/components/NotificationsView';
import { AvvaratMaterialOverview } from '@/components/AvvaratMaterialOverview';
import { useSupabaseData } from '@/hooks/useSupabaseData';

const Index = () => {
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
    dismissNotification
  } = useSupabaseData();

  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('projects');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 hover:bg-background/80 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
            <TabsTrigger value="projects">Projekt</TabsTrigger>
            <TabsTrigger value="scaffolding">Ställningsvagnar</TabsTrigger>
            <TabsTrigger value="teams">Team</TabsTrigger>
            <TabsTrigger value="files">Filer</TabsTrigger>
            <TabsTrigger value="planning">Planering</TabsTrigger>
            <TabsTrigger value="material">♻️ Avvarat Material</TabsTrigger>
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
            />
          </TabsContent>

          <TabsContent value="material" className="space-y-6">
            <AvvaratMaterialOverview 
              projects={projects}
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
      </div>
    </div>
  );
};

export default Index;
