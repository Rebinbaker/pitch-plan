import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectDashboard } from '@/components/ProjectDashboard';
import { ScaffoldingView } from '@/components/ScaffoldingView';
import { TeamsView } from '@/components/TeamsView';
import { FilesView } from '@/components/FilesView';
import { WeeklyPlanningView } from '@/components/WeeklyPlanningView';
import { NotificationsView } from '@/components/NotificationsView';
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

  const handleUpdateProject = (updatedProject: Project) => {
    setProjects(prevProjects => 
      prevProjects.map(project => 
        project.id === updatedProject.id ? updatedProject : project
      )
    );
  };

  const handleAddProject = () => {
    // TODO: Implement add project functionality
    console.log('Add new project');
  };

  const handleUpdateScaffolding = (updatedTrailer: ScaffoldingTrailer) => {
    setScaffolding(prev => 
      prev.map(trailer => 
        trailer.id === updatedTrailer.id ? updatedTrailer : trailer
      )
    );
  };

  const handleUpdateTeam = (updatedTeam: ConstructionTeam) => {
    setTeams(prev => 
      prev.map(team => 
        team.id === updatedTeam.id ? updatedTeam : team
      )
    );
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

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="scaffolding">Scaffolding</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="planning">Planning</TabsTrigger>
            <TabsTrigger value="notifications">
              Notifications
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
            />
          </TabsContent>

          <TabsContent value="scaffolding" className="space-y-6">
            <ScaffoldingView 
              scaffolding={scaffolding}
              onUpdateScaffolding={handleUpdateScaffolding}
            />
          </TabsContent>

          <TabsContent value="teams" className="space-y-6">
            <TeamsView 
              teams={teams}
              onUpdateTeam={handleUpdateTeam}
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

          <TabsContent value="notifications" className="space-y-6">
            <NotificationsView 
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onDismiss={handleDismissNotification}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
