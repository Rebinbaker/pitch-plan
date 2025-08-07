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
import { Notification } from '@/types/notification';
import { mockProjects } from '@/data/mockProjects';
import { mockScaffolding } from '@/data/mockScaffolding';
import { mockTeams } from '@/data/mockTeams';
import { mockNotifications } from '@/data/mockNotifications';

const Index = () => {
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [scaffolding, setScaffolding] = useState<ScaffoldingTrailer[]>(mockScaffolding);
  const [teams, setTeams] = useState<ConstructionTeam[]>(mockTeams);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('projects');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const handleUpdateProject = (updatedProject: Project) => {
    setProjects(prevProjects => 
      prevProjects.map(project => 
        project.id === updatedProject.id ? updatedProject : project
      )
    );
    
    // If project is completed, free up resources
    if (updatedProject.status === 'completed') {
      // Free up assigned trailer
      if (updatedProject.assignedTrailer) {
        setScaffolding(prevScaffolding =>
          prevScaffolding.map(trailer =>
            trailer.id === updatedProject.assignedTrailer
              ? { ...trailer, status: 'Tillgänglig' as const }
              : trailer
          )
        );
      }
      
      // Free up assigned team
      if (updatedProject.constructionTeam) {
        setTeams(prevTeams =>
          prevTeams.map(team =>
            team.name === updatedProject.constructionTeam
              ? { ...team, availabilityNextWeek: 'Tillgänglig' as const }
              : team
          )
        );
      }
    }
  };

  const handleAddProject = () => {
    setIsAddProjectModalOpen(true);
  };

  const handleCreateProject = (newProject: Project) => {
    setProjects(prev => [newProject, ...prev]);
    setIsAddProjectModalOpen(false);
  };

  const handleUpdateScaffolding = (updatedTrailer: ScaffoldingTrailer) => {
    setScaffolding(prev => 
      prev.map(trailer => 
        trailer.id === updatedTrailer.id ? updatedTrailer : trailer
      )
    );
  };

  const handleAddScaffolding = (newTrailer: ScaffoldingTrailer) => {
    setScaffolding(prev => [...prev, newTrailer]);
  };

  const handleUpdateTeam = (updatedTeam: ConstructionTeam) => {
    setTeams(prev => 
      prev.map(team => 
        team.id === updatedTeam.id ? updatedTeam : team
      )
    );
  };

  const handleAddTeam = (newTeam: ConstructionTeam) => {
    setTeams(prev => [...prev, newTeam]);
  };

  const handleUploadFile = (file: Omit<ProjectFile, 'id' | 'uploadedAt'>) => {
    const newFile: ProjectFile = {
      ...file,
      id: `file-${Date.now()}`,
      uploadedAt: new Date().toISOString(),
    };
    setFiles(prev => [...prev, newFile]);
  };

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  const handleDismissNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const handleNavigateToProject = (projectId: string) => {
    // Switch to projects tab and set selected project
    setActiveTab('projects');
    setSelectedProjectId(projectId);
  };

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
        />
      </div>
    </div>
  );
};

export default Index;
