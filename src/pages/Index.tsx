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
import { Project } from '@/types/project';
import { ScaffoldingTrailer } from '@/types/scaffolding';
import { ConstructionTeam } from '@/types/team';
import { ProjectFile } from '@/types/files';
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
    createProject,
    updateScaffolding,
    createScaffolding,
    updateTeam,
    createTeam,
    uploadFile,
    markAsRead,
    dismissNotification
  } = useSupabaseData();
  
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('projects');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const handleUpdateProject = async (updatedProject: Project) => {
    await updateProject(updatedProject);
    
    // If project is completed, free up resources
    if (updatedProject.status === 'completed') {
      // Free up assigned trailer
      if (updatedProject.assignedTrailer) {
        const trailer = scaffolding.find(t => t.id === updatedProject.assignedTrailer);
        if (trailer) {
          await updateScaffolding({ ...trailer, status: 'Tillgänglig' as const });
        }
      }
      
      // Free up assigned team
      if (updatedProject.constructionTeam) {
        const team = teams.find(t => t.name === updatedProject.constructionTeam);
        if (team) {
          await updateTeam({ ...team, availabilityNextWeek: 'Tillgänglig' as const });
        }
      }
    }
  };

  const handleAddProject = () => {
    setIsAddProjectModalOpen(true);
  };

  const handleCreateProject = async (newProject: Project) => {
    await createProject(newProject);
    setIsAddProjectModalOpen(false);
  };

  const handleUpdateScaffolding = async (updatedTrailer: ScaffoldingTrailer) => {
    await updateScaffolding(updatedTrailer);
  };

  const handleAddScaffolding = async (newTrailer: ScaffoldingTrailer) => {
    await createScaffolding(newTrailer);
  };

  const handleUpdateTeam = async (updatedTeam: ConstructionTeam) => {
    await updateTeam(updatedTeam);
  };

  const handleAddTeam = async (newTeam: ConstructionTeam) => {
    await createTeam(newTeam);
  };

  const handleUploadFile = async (file: Omit<ProjectFile, 'id' | 'uploadedAt'>) => {
    await uploadFile(file);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const handleDismissNotification = async (notificationId: string) => {
    await dismissNotification(notificationId);
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Laddar data...</p>
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
              onUpdateProject={handleUpdateProject}
              onAddProject={handleAddProject}
              trailers={scaffolding}
              teams={teams}
              onUpdateTeam={handleUpdateTeam}
              onUpdateTrailer={handleUpdateScaffolding}
              selectedProjectId={selectedProjectId}
              onClearSelection={() => setSelectedProjectId(null)}
            />
          </TabsContent>

          <TabsContent value="scaffolding" className="space-y-6">
            <ScaffoldingView 
              scaffolding={scaffolding}
              onUpdateScaffolding={handleUpdateScaffolding}
              onAddScaffolding={handleAddScaffolding}
              projects={projects}
            />
          </TabsContent>

          <TabsContent value="teams" className="space-y-6">
            <TeamsView 
              teams={teams}
              onUpdateTeam={handleUpdateTeam}
              onAddTeam={handleAddTeam}
              projects={projects}
            />
          </TabsContent>

          <TabsContent value="files" className="space-y-6">
            <FilesView 
              files={files}
              projects={projects}
              onUploadFile={handleUploadFile}
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
              onMarkAsRead={handleMarkAsRead}
              onDismiss={handleDismissNotification}
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
