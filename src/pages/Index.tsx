import { useState } from 'react';
import { ProjectDashboard } from '@/components/ProjectDashboard';
import { Project } from '@/types/project';
import { mockProjects } from '@/data/mockProjects';

const Index = () => {
  const [projects, setProjects] = useState<Project[]>(mockProjects);

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

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8">
        <ProjectDashboard 
          projects={projects}
          onUpdateProject={handleUpdateProject}
          onAddProject={handleAddProject}
        />
      </div>
    </div>
  );
};

export default Index;
