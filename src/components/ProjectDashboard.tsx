import { useState } from 'react';
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
}

export function ProjectDashboard({ projects, onUpdateProject, onAddProject, trailers = [], teams = [], onUpdateTeam, onUpdateTrailer }: ProjectDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [regionFilter, setRegionFilter] = useState<Region | 'all'>('all');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

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
    setSelectedProject(project);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedProject(null);
  };

  const handleUpdateProjectFromModal = (updatedProject: Project) => {
    onUpdateProject(updatedProject);
    setSelectedProject(updatedProject);
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
        <div className="p-4 bg-card rounded-lg border shadow-card">
          <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          <div className="text-sm text-muted-foreground">Totalt projekt</div>
        </div>
        <div className="p-4 bg-card rounded-lg border shadow-card">
          <div className="text-2xl font-bold text-planned">{stats.planned}</div>
          <div className="text-sm text-muted-foreground">Planerade</div>
        </div>
        <div className="p-4 bg-card rounded-lg border shadow-card">
          <div className="text-2xl font-bold text-ongoing">{stats.ongoing}</div>
          <div className="text-sm text-muted-foreground">Pågående</div>
        </div>
        <div className="p-4 bg-card rounded-lg border shadow-card">
          <div className="text-2xl font-bold text-completed">{stats.completed}</div>
          <div className="text-sm text-muted-foreground">Slutförda</div>
        </div>
        <div className="p-4 bg-card rounded-lg border shadow-card">
          <div className="text-2xl font-bold text-invoiced">{stats.invoiced}</div>
          <div className="text-sm text-muted-foreground">Fakturerade</div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredProjects.map(project => (
          <ProjectCard
            key={project.id}
            project={project}
            onViewDetails={handleViewDetails}
            onUpdateProject={onUpdateProject}
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
      />
    </div>
  );
}