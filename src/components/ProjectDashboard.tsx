import { useState, useEffect } from 'react';
import { ProjectCard } from './ProjectCard';
import { ProjectHeader } from './ProjectHeader';
import { ProjectDetailModal } from './ProjectDetailModal';
import { Project, ProjectStatus, Region } from '@/types/project';
import { ScaffoldingTrailer } from '@/types/scaffolding';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

// Draggable Project Card Component
function DraggableProjectCard({ project, onViewDetails, onUpdateProject, trailers, teams, onUpdateTeam, onUpdateTrailer }: {
  project: Project;
  onViewDetails: (project: Project) => void;
  onUpdateProject?: (project: Project) => void;
  trailers: ScaffoldingTrailer[];
  teams: any[];
  onUpdateTeam?: (team: any) => void;
  onUpdateTrailer?: (trailer: any) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={isDragging ? 'z-50' : ''}
    >
      <div {...listeners} className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing" />
      <ProjectCard
        project={project}
        onViewDetails={onViewDetails}
        onUpdateProject={onUpdateProject}
        trailers={trailers}
        teams={teams}
        onUpdateTeam={onUpdateTeam}
        onUpdateTrailer={onUpdateTrailer}
      />
    </div>
  );
}

export function ProjectDashboard({ projects, onUpdateProject, onAddProject, trailers = [], teams = [], onUpdateTeam, onUpdateTrailer, selectedProjectId, onClearSelection }: ProjectDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [regionFilter, setRegionFilter] = useState<Region | 'all'>('all');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [projectOrder, setProjectOrder] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Initialize project order when projects change
  useEffect(() => {
    if (projects.length > 0 && projectOrder.length === 0) {
      setProjectOrder(projects.map(p => p.id));
    }
  }, [projects, projectOrder.length]);

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

  // Sort filtered projects according to projectOrder
  const sortedFilteredProjects = filteredProjects.sort((a, b) => {
    const aIndex = projectOrder.indexOf(a.id);
    const bIndex = projectOrder.indexOf(b.id);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = projectOrder.indexOf(active.id as string);
      const newIndex = projectOrder.indexOf(over.id as string);
      
      const newOrder = arrayMove(projectOrder, oldIndex, newIndex);
      setProjectOrder(newOrder);
    }
  };

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

      {/* Projects Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={projectOrder} strategy={verticalListSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {sortedFilteredProjects.map(project => (
              <DraggableProjectCard
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
        </SortableContext>
      </DndContext>

      {sortedFilteredProjects.length === 0 && (
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