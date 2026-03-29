import { useState, useEffect } from 'react';
import { ProjectCard } from './ProjectCard';
import { ProjectHeader } from './ProjectHeader';
import { ProjectDetailModal } from './ProjectDetailModal';
import { ProjectMapView } from './ProjectMapView';
import { Project, ProjectStatus, Region } from '@/types/project';
import { analyzeProjectRisk } from '@/utils/riskAnalysis';
import { ScaffoldingTrailer } from '@/types/scaffolding';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Map } from 'lucide-react';

interface ProjectDashboardProps {
  projects: Project[];
  onUpdateProject: (updatedProject: Project) => void;
  onDeleteProject?: (projectId: string) => void;
  onAddProject: () => void;
  trailers?: ScaffoldingTrailer[];
  teams?: any[];
  onUpdateTeam?: (team: any) => void;
  onUpdateTrailer?: (trailer: any) => void;
  selectedProjectId?: string | null;
  onClearSelection?: () => void;
  onAddNotifications?: (notifications: any[]) => void;
  onFileUploaded?: (file: { name: string; url: string; type: 'warranty'; projectId: string; uploadedBy: string; description?: string; tags: string[] }) => void;
  isAdmin?: boolean;
}

// Simple Project Card Component (no drag functionality)
function SimpleProjectCard({ project, onViewDetails, onUpdateProject, onDeleteProject, trailers, teams, onUpdateTeam, onUpdateTrailer, onAddNotifications, isAdmin }: {
  project: Project;
  onViewDetails: (project: Project) => void;
  onUpdateProject?: (project: Project) => void;
  onDeleteProject?: (projectId: string) => void;
  trailers: ScaffoldingTrailer[];
  teams: any[];
  onUpdateTeam?: (team: any) => void;
  onUpdateTrailer?: (trailer: any) => void;
  onAddNotifications?: (notifications: any[]) => void;
  isAdmin?: boolean;
}) {
  return (
    <ProjectCard
      project={project}
      onViewDetails={onViewDetails}
      onUpdateProject={onUpdateProject}
      onDeleteProject={onDeleteProject}
      trailers={trailers}
      teams={teams}
      onUpdateTeam={onUpdateTeam}
      onUpdateTrailer={onUpdateTrailer}
      onAddNotifications={onAddNotifications}
      isAdmin={isAdmin}
    />
  );
}

export function ProjectDashboard({ projects, onUpdateProject, onDeleteProject, onAddProject, trailers = [], teams = [], onUpdateTeam, onUpdateTrailer, selectedProjectId, onClearSelection, onAddNotifications, onFileUploaded, isAdmin }: ProjectDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [regionFilter, setRegionFilter] = useState<Region | 'all'>('all');
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

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
    
    let matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    if (statusFilter === 'delayed' || statusFilter === 'riskzon') {
      const risk = analyzeProjectRisk(project);
      matchesStatus = statusFilter === 'delayed' ? risk.level === 'delayed' : (risk.level === 'warning' || risk.level === 'high');
    }
    const matchesRegion = regionFilter === 'all' || project.region === regionFilter;
    
    // Date filtering - check if project's start date or deadline falls within selected range
    let matchesDate = true;
    if (dateFrom || dateTo) {
      const projectStartDate = project.startDate ? new Date(project.startDate) : null;
      const projectDeadline = project.deadline ? new Date(project.deadline) : null;
      
      if (dateFrom && dateTo) {
        // Both dates selected - check if project overlaps with date range
        matchesDate = 
          (projectStartDate && projectStartDate >= dateFrom && projectStartDate <= dateTo) ||
          (projectDeadline && projectDeadline >= dateFrom && projectDeadline <= dateTo) ||
          (projectStartDate && projectDeadline && projectStartDate <= dateTo && projectDeadline >= dateFrom);
      } else if (dateFrom) {
        // Only start date - show projects starting on or after this date
        matchesDate = projectStartDate ? projectStartDate >= dateFrom : false;
      } else if (dateTo) {
        // Only end date - show projects ending on or before this date
        matchesDate = projectDeadline ? projectDeadline <= dateTo : false;
      }
    }
    
    return matchesSearch && matchesStatus && matchesRegion && matchesDate;
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
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
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

      {/* View Mode Toggle */}
      <div className="flex justify-end">
        <div className="inline-flex rounded-lg border bg-card p-1 shadow-sm">
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="gap-1.5"
          >
            <LayoutGrid className="h-4 w-4" />
            Lista
          </Button>
          <Button
            variant={viewMode === 'map' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('map')}
            className="gap-1.5"
          >
            <Map className="h-4 w-4" />
            Karta
          </Button>
        </div>
      </div>

      {/* View Content */}
      {viewMode === 'map' ? (
        <ProjectMapView
          projects={filteredProjects}
          trailers={trailers}
          teams={teams}
          onViewDetails={handleViewDetails}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredProjects.map(project => (
              <SimpleProjectCard
                key={project.id}
                project={project}
                onViewDetails={handleViewDetails}
                onUpdateProject={handleUpdateProjectFromCard}
                onDeleteProject={onDeleteProject}
                trailers={trailers}
                teams={teams}
                onUpdateTeam={onUpdateTeam}
                onUpdateTrailer={onUpdateTrailer}
                onAddNotifications={onAddNotifications}
                isAdmin={isAdmin}
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
        </>
      )}

        <ProjectDetailModal
          project={selectedProject}
          isOpen={isDetailModalOpen}
          onClose={handleCloseDetailModal}
          onUpdateProject={handleUpdateProjectFromModal}
          trailers={trailers}
          teams={teams}
          onUpdateTrailer={onUpdateTrailer}
          projects={projects}
          onFileUploaded={onFileUploaded}
        />
    </div>
  );
}