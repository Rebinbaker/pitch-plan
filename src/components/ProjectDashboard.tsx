import { useState, useEffect } from 'react';
import { ProjectCard } from './ProjectCard';
import { ProjectHeader } from './ProjectHeader';
import { ProjectDetailModal } from './ProjectDetailModal';
import { Project, ProjectStatus, Region } from '@/types/project';
import { ScaffoldingTrailer } from '@/types/scaffolding';

interface ProjectDashboardProps {
  projects: Project[];
  onUpdateProject: (updatedProject: Project) => void;
  onAddProject: () => void;
  trailers?: ScaffoldingTrailer[];
  teams?: any[];
  onUpdateTeam?: (team: any) => void;
  onUpdateTrailer?: (trailer: any) => void;
  selectedProjectId?: string | null;
  onClearSelection?: () => void;
}

// Simple Project Card Component (no drag functionality)
function SimpleProjectCard({ project, onViewDetails, onUpdateProject, trailers, teams, onUpdateTeam, onUpdateTrailer }: {
  project: Project;
  onViewDetails: (project: Project) => void;
  onUpdateProject?: (project: Project) => void;
  trailers: ScaffoldingTrailer[];
  teams: any[];
  onUpdateTeam?: (team: any) => void;
  onUpdateTrailer?: (trailer: any) => void;
}) {
  return (
    <ProjectCard
      project={project}
      onViewDetails={onViewDetails}
      onUpdateProject={onUpdateProject}
      trailers={trailers}
      teams={teams}
      onUpdateTeam={onUpdateTeam}
      onUpdateTrailer={onUpdateTrailer}
    />
  );
}

export function ProjectDashboard({ projects, onUpdateProject, onAddProject, trailers = [], teams = [], onUpdateTeam, onUpdateTrailer, selectedProjectId, onClearSelection }: ProjectDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [regionFilter, setRegionFilter] = useState<Region | 'all'>('all');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Auto-open project detail modal when selectedProjectId changes
  useEffect(() => {
    if (selectedProjectId) {
      const project = projects.find(p => p.id === selectedProjectId);
      if (project) {
        setSelectedProject(project);
        setIsDetailModalOpen(true);
      }
    }
  }, [selectedProjectId, projects]);

  // Filter projects based on search term and filters
  const filteredProjects = projects.filter(project => {
    const matchesSearch = 
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchesRegion = regionFilter === 'all' || project.region === regionFilter;
    
    return matchesSearch && matchesStatus && matchesRegion;
  });

  const handleViewDetails = (project: Project) => {
    console.log('handleViewDetails called:', project.name);
    setSelectedProject(project);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedProject(null);
    onClearSelection?.();
  };

  const handleUpdateProjectFromModal = (updatedProject: Project) => {
    onUpdateProject(updatedProject);
    setSelectedProject(updatedProject);
  };

  // Handle project updates from cards and update selected project if it matches
  const handleUpdateProjectFromCard = (updatedProject: Project) => {
    onUpdateProject(updatedProject);
    // If this is the currently selected project, update it too
    if (selectedProject && selectedProject.id === updatedProject.id) {
      setSelectedProject(updatedProject);
    }
  };

  // Statistics for the header
  const stats = {
    total: projects.length,
    planned: projects.filter(p => p.status === 'planned').length,
    ongoing: projects.filter(p => p.status === 'ongoing').length,
    completed: projects.filter(p => p.status === 'completed').length,
    invoiced: projects.filter(p => p.status === 'invoiced').length,
  };

  return (
    <div className="space-y-6">
      <ProjectHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        regionFilter={regionFilter}
        onRegionFilterChange={setRegionFilter}
        onAddProject={onAddProject}
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 bg-card rounded-lg border shadow-card hover:shadow-lg hover:bg-background/90 hover:scale-[1.05] transition-all duration-300">
          <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          <div className="text-sm text-muted-foreground">Totalt projekt</div>
        </div>
        <div className="p-4 bg-card rounded-lg border shadow-card hover:shadow-lg hover:bg-background/90 hover:scale-[1.05] transition-all duration-300">
          <div className="text-2xl font-bold text-planned">{stats.planned}</div>
          <div className="text-sm text-muted-foreground">Planerade</div>
        </div>
        <div className="p-4 bg-card rounded-lg border shadow-card hover:shadow-lg hover:bg-background/90 hover:scale-[1.05] transition-all duration-300">
          <div className="text-2xl font-bold text-ongoing">{stats.ongoing}</div>
          <div className="text-sm text-muted-foreground">Pågående</div>
        </div>
        <div className="p-4 bg-card rounded-lg border shadow-card hover:shadow-lg hover:bg-background/90 hover:scale-[1.05] transition-all duration-300">
          <div className="text-2xl font-bold text-completed">{stats.completed}</div>
          <div className="text-sm text-muted-foreground">Slutförda</div>
        </div>
        <div className="p-4 bg-card rounded-lg border shadow-card hover:shadow-lg hover:bg-background/90 hover:scale-[1.05] transition-all duration-300">
          <div className="text-2xl font-bold text-invoiced">{stats.invoiced}</div>
          <div className="text-sm text-muted-foreground">Fakturerade</div>
        </div>
      </div>

      {/* Projects Grid - No drag functionality */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredProjects.map(project => (
          <SimpleProjectCard
            key={project.id}
            project={project}
            onViewDetails={handleViewDetails}
            onUpdateProject={handleUpdateProjectFromCard}
            trailers={trailers}
            teams={teams}
            onUpdateTeam={onUpdateTeam}
            onUpdateTrailer={onUpdateTrailer}
          />
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            Inga projekt hittades som matchar dina kriterier.
          </div>
        </div>
      )}

      <ProjectDetailModal
        project={selectedProject}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        onUpdateProject={handleUpdateProjectFromModal}
        trailers={trailers}
        teams={teams}
        onUpdateTrailer={onUpdateTrailer}
      />
    </div>
  );
}