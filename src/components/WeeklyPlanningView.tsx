import React, { useState, memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, Clock, MapPin, User, Truck, Users, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Project, ProjectStatus, Region } from '@/types/project';
import { calculateRemainingTime, formatDaysRemaining } from '@/utils/timeCalculations';
import { isStartingThisWeek, isOngoingProject, isDueThisWeek, hasDelayedStart, isBehindSchedule, dateToWeekString, calculatePlannedStartDate } from '@/utils/projectPlanning';
import { format, addWeeks, getWeek, getYear, isSameMonth, startOfMonth, endOfMonth, startOfWeek as startWeek, endOfWeek as endWeek, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { ProjectHoverCard } from './ProjectHoverCard';
import { ProjectDetailModal } from './ProjectDetailModal';
import { DndContext, DragEndEvent, DragStartEvent, useSensor, useSensors, PointerSensor, useDroppable, useDraggable } from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { useToast } from '@/hooks/use-toast';
import { useRegions } from '@/hooks/useRegions';

interface WeeklyPlanningViewProps {
  projects: Project[];
  onUpdateProject?: (projectId: string, updates: Partial<Project>) => void;
  trailers?: any[];
  onUpdateTrailer?: (trailer: any) => void;
  onAddNotifications?: (notifications: any[]) => void;
  onFileUploaded?: (file: { name: string; url: string; type: 'warranty'; projectId: string; uploadedBy: string; description?: string; tags: string[] }) => void;
  files?: { id: string; name: string; type: string; url: string; projectId: string; uploadedAt: string }[];
}

export function WeeklyPlanningView({ projects, onUpdateProject, trailers = [], onUpdateTrailer, onAddNotifications, onFileUploaded, files = [] }: WeeklyPlanningViewProps) {
  console.log('WeeklyPlanningView re-rendered with projects:', projects.length);
  
  const [regionFilter, setRegionFilter] = useState<Region | 'all'>('all');
  const { regions } = useRegions();
  const [viewMode, setViewMode] = useState<'calendar' | 'board' | 'monthly'>(() => {
    // Persist view mode in localStorage to prevent reset during re-renders
    const saved = localStorage.getItem('planningViewMode');
    return (saved as 'calendar' | 'board' | 'monthly') || 'board';
  });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [monthlyDateRange, setMonthlyDateRange] = useState<{from: Date | undefined, to: Date | undefined} | undefined>(() => {
    // Default to current month
    const now = new Date();
    return {
      from: startOfMonth(now),
      to: endOfMonth(now)
    };
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Calculate dates for the selected week (ISO week starts on Monday)
  const getWeekDates = (date: Date) => {
    const startOfWeek = startWeek(date, { weekStartsOn: 1 }); // ISO week starts on Monday
    const endOfWeek = endWeek(date, { weekStartsOn: 1 }); // ISO week ends on Sunday
    return { startOfWeek, endOfWeek };
  };

  const { startOfWeek, endOfWeek } = getWeekDates(selectedDate);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Filter projects that are relevant for this week using new planning logic
  const allWeekProjects = projects.filter(project => {
    // Use new planning fields if available, fallback to legacy
    const plannedStartStr = project.planerad_start_datum || project.startDate;
    const calculatedEndStr = project.beräknat_slut_datum || project.deadline;
    
    const plannedStart = new Date(plannedStartStr);
    const calculatedEnd = new Date(calculatedEndStr);
    const today = new Date();
    
    // Project is relevant if:
    // 1. It starts this week (planned)
    // 2. It's ongoing and should be completed by or after this week
    // 3. It's due this week (calculated end)
    const isRelevant = isStartingThisWeek(project, startOfWeek, endOfWeek) ||
                      (isOngoingProject(project, today) && calculatedEnd >= startOfWeek) ||
                      isDueThisWeek(project, startOfWeek, endOfWeek);
    
    const matchesRegion = regionFilter === 'all' || project.region === regionFilter;
    
    return isRelevant && matchesRegion;
  });

  // Categorize projects using new business logic
  const startingThisWeek: Project[] = [];
  const ongoingProjects: Project[] = [];
  const completingThisWeek: Project[] = [];
  const today = new Date();

  allWeekProjects.forEach(project => {
    // Priority order: starting this week > due this week > ongoing
    if (isStartingThisWeek(project, startOfWeek, endOfWeek)) {
      startingThisWeek.push(project);
    } else if (isDueThisWeek(project, startOfWeek, endOfWeek)) {
      completingThisWeek.push(project);
    } else if (isOngoingProject(project, today)) {
      ongoingProjects.push(project);
    }
  });

  // Total categorized projects (should equal allWeekProjects.length)
  const thisWeekProjects = [...startingThisWeek, ...ongoingProjects, ...completingThisWeek];

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'planned': return 'bg-blue-500';
      case 'ongoing': return 'bg-orange-500';
      case 'completed': return 'bg-green-500';
      case 'invoiced': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getUrgencyBadge = (project: Project) => {
    const startDate = new Date(project.startDate);
    const deadline = new Date(project.deadline);
    const now = new Date();
    const daysToStart = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const daysToDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysToStart <= 1 && project.status === 'planned') {
      return <Badge variant="destructive" className="text-xs">Starts Soon</Badge>;
    }
    if (daysToDeadline <= 2 && project.status === 'ongoing') {
      return <Badge variant="destructive" className="text-xs">Due Soon</Badge>;
    }
    if (project.completionPercentage < 50 && daysToDeadline <= 5) {
      return <Badge variant="destructive" className="text-xs">Behind Schedule</Badge>;
    }
    return null;
  };

  const isCurrentWeek = () => {
    const today = new Date();
    const { startOfWeek: currentStart, endOfWeek: currentEnd } = getWeekDates(today);
    return startOfWeek.getTime() === currentStart.getTime();
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleViewDetails = (project: Project) => {
    console.log('handleViewDetails called in WeeklyPlanningView:', project.name);
    setSelectedProject(project);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedProject(null);
  };

  const handleUpdateProjectFromModal = (updatedProject: Project) => {
    if (onUpdateProject) {
      onUpdateProject(updatedProject.id, updatedProject);
      setSelectedProject(updatedProject);
    }
  };

  const handleBoardDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !onUpdateProject) {
      setActiveId(null);
      return;
    }

    const projectId = active.id as string;
    const targetWeek = over.id as string;
    
    // Calculate new start date based on target week
    const project = projects.find(p => p.id === projectId);
    if (!project) {
      setActiveId(null);
      return;
    }

    const currentStartDate = new Date(project.startDate);
    const currentDeadline = new Date(project.deadline);
    const projectDuration = Math.ceil((currentDeadline.getTime() - currentStartDate.getTime()) / (1000 * 60 * 60 * 24));

    let newStartDate: Date;

    if (targetWeek === 'starting') {
      // Move to current selected week - update bygg_start_vecka
      newStartDate = new Date(startOfWeek);
      const newWeekString = dateToWeekString(newStartDate);
      
      // Calculate deadline and activity log entry
      const newDeadline = new Date(newStartDate);
      newDeadline.setDate(newStartDate.getDate() + (project.ungefärlig_arbetstid_dagar || projectDuration));
      
      const oldStartDateObj = new Date(project.planerad_start_datum || project.startDate);
      const newActivityEntry = {
        id: `activity-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: 'System',
        action: 'Projekt omplanerat',
        description: `Projekt omplanerat från vecka ${dateToWeekString(oldStartDateObj)} till vecka ${newWeekString}`,
        category: 'general' as const,
        oldValue: `${dateToWeekString(oldStartDateObj)} (${format(oldStartDateObj, 'yyyy-MM-dd')})`,
        newValue: `${newWeekString} (${format(newStartDate, 'yyyy-MM-dd')})`
      };
      
      // Update project with new planning data
      onUpdateProject(projectId, {
        bygg_start_vecka: newWeekString,
        planerad_start_datum: calculatePlannedStartDate(newWeekString),
        beräknat_slut_datum: format(newDeadline, 'yyyy-MM-dd'),
        startDate: newStartDate.toISOString().split('T')[0], // Legacy compatibility
        deadline: newDeadline.toISOString().split('T')[0], // Legacy compatibility
        activityLog: [...(project.activityLog || []), newActivityEntry]
      });
      
      console.log(`Moved project ${project.name} to week ${newWeekString}, planerad_start_datum: ${calculatePlannedStartDate(newWeekString)}`);
      
      setActiveId(null);
      return;
    } else if (targetWeek === 'ongoing') {
      // Keep in ongoing (no date change needed)
      setActiveId(null);
      return;
    } else if (targetWeek === 'completing') {
      // For ongoing projects, this doesn't make sense with new logic
      // Only allow this for planned projects
      if (project.status === 'planned') {
        // Set calculated end to end of current week, calculate backwards
        const newCalculatedEnd = new Date(endOfWeek);
        newStartDate = new Date(newCalculatedEnd);
        newStartDate.setDate(newCalculatedEnd.getDate() - (project.ungefärlig_arbetstid_dagar || projectDuration));
        
        const newWeekString = dateToWeekString(newStartDate);
        
        const oldStartDateObj = new Date(project.startDate);
        const newActivityEntry = {
          id: `activity-${Date.now()}`,
          timestamp: new Date().toISOString(),
          user: 'System',
          action: 'Projekt omplanerat',
          description: `Projekt prioriterades om från vecka ${getWeek(oldStartDateObj)} (${format(oldStartDateObj, 'yyyy-MM-dd')}) till vecka ${getWeek(newStartDate)} (${format(newStartDate, 'yyyy-MM-dd')})`,
          category: 'general' as const,
          oldValue: `Vecka ${getWeek(oldStartDateObj)} (${format(oldStartDateObj, 'yyyy-MM-dd')})`,
          newValue: `Vecka ${getWeek(newStartDate)} (${format(newStartDate, 'yyyy-MM-dd')})`
        };
        
        onUpdateProject(projectId, {
          bygg_start_vecka: newWeekString,
          planerad_start_datum: calculatePlannedStartDate(newWeekString),
          startDate: newStartDate.toISOString().split('T')[0], // Legacy compatibility
          deadline: newCalculatedEnd.toISOString().split('T')[0], // Legacy compatibility
          activityLog: [...(project.activityLog || []), newActivityEntry]
        });
      }
      setActiveId(null);
      return;
    }

    setActiveId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        {/* Header with date navigation */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Weekly Planning</h2>
            <p className="text-muted-foreground">
              Week of {format(startOfWeek, 'MMM d')} - {format(endOfWeek, 'MMM d, yyyy')}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Select value={regionFilter} onValueChange={(value: Region | 'all') => setRegionFilter(value)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla regioner</SelectItem>
                {regions.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={viewMode} onValueChange={(value: 'calendar' | 'board' | 'monthly') => {
              setViewMode(value);
              localStorage.setItem('planningViewMode', value);
            }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="board">Kortvy</SelectItem>
                <SelectItem value="calendar">Kalendervy</SelectItem>
                <SelectItem value="monthly">Månadsvy</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Date navigation controls */}
        <div className="flex items-center gap-4 justify-center">
          {viewMode === 'monthly' ? (
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold">Månadsvy:</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const currentFrom = monthlyDateRange?.from || startOfMonth(new Date());
                  const prevMonth = addMonths(currentFrom, -1);
                  setMonthlyDateRange({
                    from: startOfMonth(prevMonth),
                    to: endOfMonth(prevMonth)
                  });
                }}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Föregående månad
              </Button>
              
              <span className="font-medium min-w-[200px] text-center">
                {monthlyDateRange?.from && monthlyDateRange?.to ? (
                  `${format(monthlyDateRange.from, "MMMM yyyy")}`
                ) : (
                  format(new Date(), "MMMM yyyy")
                )}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const currentFrom = monthlyDateRange?.from || startOfMonth(new Date());
                  const nextMonth = addMonths(currentFrom, 1);
                  setMonthlyDateRange({
                    from: startOfMonth(nextMonth),
                    to: endOfMonth(nextMonth)
                  });
                }}
                className="flex items-center gap-2"
              >
                Nästa månad
                <ChevronRight className="w-4 h-4" />
              </Button>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Anpassat intervall
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar
                    mode="range"
                    selected={monthlyDateRange}
                    onSelect={(range) => setMonthlyDateRange(range as any)}
                    numberOfMonths={2}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('prev')}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Föregående vecka
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Välj datum</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('next')}
                className="flex items-center gap-2"
              >
                Nästa vecka
                <ChevronRight className="w-4 h-4" />
              </Button>

              {!isCurrentWeek() && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={goToToday}
                  className="ml-2"
                >
                  Denna vecka
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {startingThisWeek.length}
            </div>
            <div className="text-sm text-muted-foreground">Starting This Week</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {ongoingProjects.length}
            </div>
            <div className="text-sm text-muted-foreground">Ongoing Projects</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {completingThisWeek.length}
            </div>
            <div className="text-sm text-muted-foreground">Due This Week</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">
              {thisWeekProjects.length}
            </div>
            <div className="text-sm text-muted-foreground">Total Active</div>
          </CardContent>
        </Card>
      </div>

      {viewMode === 'board' ? (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleBoardDragEnd}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Starting This Week */}
            <DroppableColumn id="starting" title="Starting This Week" count={startingThisWeek.length} color="text-blue-600" icon={CalendarDays}>
              {startingThisWeek.map(project => (
                <DraggableProjectCard key={project.id} project={project} onViewDetails={handleViewDetails} trailers={trailers} />
              ))}
              {startingThisWeek.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  No projects starting this week
                </div>
              )}
            </DroppableColumn>

            {/* Ongoing Projects */}
            <DroppableColumn id="ongoing" title="Ongoing Projects" count={ongoingProjects.length} color="text-orange-600" icon={Clock}>
              {ongoingProjects.map(project => (
                <DraggableProjectCard key={project.id} project={project} onViewDetails={handleViewDetails} trailers={trailers} />
              ))}
              {ongoingProjects.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  No ongoing projects
                </div>
              )}
            </DroppableColumn>

            {/* Completing This Week */}
            <DroppableColumn id="completing" title="Due This Week" count={completingThisWeek.length} color="text-green-600" icon={CalendarDays}>
              {completingThisWeek.map(project => (
                <DraggableProjectCard key={project.id} project={project} onViewDetails={handleViewDetails} trailers={trailers} />
              ))}
              {completingThisWeek.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  No projects due this week
                </div>
              )}
            </DroppableColumn>
          </div>

        </DndContext>
      ) : viewMode === 'calendar' ? (
        <CalendarView projects={thisWeekProjects} startOfWeek={startOfWeek} onViewDetails={handleViewDetails} />
      ) : (
        <MonthlyView projects={projects} dateRange={monthlyDateRange} regionFilter={regionFilter} onUpdateProject={onUpdateProject} onViewDetails={handleViewDetails} trailers={trailers} onAddNotifications={onAddNotifications} />
      )}

      <ProjectDetailModal
        project={selectedProject}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        onUpdateProject={handleUpdateProjectFromModal}
        trailers={trailers}
        teams={[]}
        onUpdateTrailer={onUpdateTrailer}
        onFileUploaded={onFileUploaded}
        files={files}
      />
    </div>
  );
}

interface ProjectWeeklyCardProps {
  project: Project;
  onViewDetails?: (project: Project) => void;
}

// Droppable Column Component
interface DroppableColumnProps {
  id: string;
  title: string;
  count: number;
  color: string;
  icon: React.ComponentType<any>;
  children: React.ReactNode;
}

function DroppableColumn({ id, title, count, color, icon: Icon, children }: DroppableColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <Card 
      ref={setNodeRef}
      className={cn(
        "transition-colors duration-200",
        isOver ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
      )}
    >
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${color}`}>
          <Icon className="w-5 h-5" />
          {title} ({count})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 min-h-[200px] overflow-visible">
        {children}
      </CardContent>
    </Card>
  );
}

// Draggable Project Card Component
interface DraggableProjectCardProps {
  project: Project;
  onViewDetails?: (project: Project) => void;
  trailers?: any[];
}

function DraggableProjectCard({ project, onViewDetails, trailers = [] }: DraggableProjectCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: project.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <ProjectHoverCard project={project}>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        className="relative"
      >
        {/* Drag handle - small area at top right */}
        <div 
          {...listeners}
          className="absolute top-2 right-2 w-8 h-8 bg-muted/20 hover:bg-muted/40 rounded-md cursor-grab active:cursor-grabbing z-30 flex items-center justify-center text-xs opacity-0 hover:opacity-100 transition-opacity"
          title="Drag to move project"
        >
          ⋮⋮
        </div>
        
        {/* Click area - everywhere else */}
        <div 
          className="cursor-pointer"
          onClick={(e) => {
            console.log('Project card clicked:', project.name);
            e.stopPropagation();
            if (onViewDetails) {
              onViewDetails(project);
            }
          }}
        >
          <ProjectWeeklyCard project={project} onViewDetails={undefined} trailers={trailers} />
        </div>
      </div>
    </ProjectHoverCard>
  );
}
function ProjectWeeklyCard({ project, onViewDetails, trailers = [] }: ProjectWeeklyCardProps & { trailers?: any[] }) {
  // Helper function to get trailer name
  const getTrailerName = (trailerId: string) => {
    const trailer = trailers.find(t => t.id === trailerId);
    return trailer ? trailer.name : trailerId;
  };
  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'planned': return 'bg-blue-500';
      case 'ongoing': return 'bg-orange-500';
      case 'completed': return 'bg-green-500';
      case 'invoiced': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getUrgencyBadge = (project: Project) => {
    const startDate = new Date(project.startDate);
    const deadline = new Date(project.deadline);
    const now = new Date();
    const daysToStart = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const daysToDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysToStart <= 1 && project.status === 'planned') {
      return <Badge variant="destructive" className="text-xs">Starts Soon</Badge>;
    }
    if (daysToDeadline <= 2 && project.status === 'ongoing') {
      return <Badge variant="destructive" className="text-xs">Due Soon</Badge>;
    }
    if (project.completionPercentage < 50 && daysToDeadline <= 5) {
      return <Badge variant="destructive" className="text-xs">Behind Schedule</Badge>;
    }
    return null;
  };

  // Calculate estimated completion
  const timeEstimate = calculateRemainingTime(project);
  const estimatedCompletionDate = () => {
    if (project.status === 'completed') return 'Klart';
    if (timeEstimate.workersRemainingDays === 0) return 'Klart idag';
    
    const today = new Date();
    const workingDaysToAdd = timeEstimate.workersRemainingDays;
    let completionDate = new Date(today);
    let daysAdded = 0;
    
    while (daysAdded < workingDaysToAdd) {
      completionDate.setDate(completionDate.getDate() + 1);
      // Skip weekends (Saturday = 6, Sunday = 0)
      if (completionDate.getDay() !== 0 && completionDate.getDay() !== 6) {
        daysAdded++;
      }
    }
    
    return completionDate.toLocaleDateString('sv-SE');
  };

  return (
    <Card 
      className="shadow-card hover:shadow-lg transition-shadow"
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between">
          <h4 className="font-medium text-sm">{project.name}</h4>
          <div className="flex gap-1">
            <Badge variant="secondary" className={`${getStatusColor(project.status)} text-white text-xs`}>
              {project.status}
            </Badge>
            {getUrgencyBadge(project)}
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          {project.region}
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="w-3 h-3" />
          {project.constructionTeam}
        </div>

         {/* Show assigned trailer if available */}
         {project.assignedTrailer && (
           <div className="flex items-center gap-2 text-xs text-muted-foreground">
             <Truck className="w-3 h-3" />
             <span>Släp: {getTrailerName(project.assignedTrailer)}</span>
           </div>
         )}
         
           <div className="text-xs text-muted-foreground">
             Start: {new Date(project.startDate).toLocaleDateString('sv-SE')}
           </div>
        
        <div className="text-xs text-muted-foreground">
          Deadline: {new Date(project.deadline).toLocaleDateString('sv-SE')}
        </div>

        {/* Estimated completion for ongoing projects */}
        {project.status === 'ongoing' && (
          <div className="text-xs font-medium text-orange-600">
            Uppskattat klart: {estimatedCompletionDate()}
          </div>
        )}

        {/* Time remaining for ongoing projects */}
        {project.status === 'ongoing' && timeEstimate.workersRemainingDays > 0 && (
          <div className="text-xs text-muted-foreground">
            Tid kvar: {formatDaysRemaining(timeEstimate.workersRemainingDays)}
          </div>
        )}
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300" 
            style={{ width: `${project.completionPercentage}%` }}
          />
        </div>
        <div className="text-xs text-muted-foreground text-right">
          {project.completionPercentage}% complete
        </div>

        {/* Avvarat Material Status */}
        {project.avvaratMaterial?.hasLeftoverMaterial === true && (
          <div className="flex items-center gap-1 text-xs">
            <div className="w-2 h-2 bg-warning rounded-full" />
            <span className="text-warning font-medium">Avvarat material</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface CalendarViewProps {
  projects: Project[];
  startOfWeek: Date;
  onViewDetails?: (project: Project) => void;
}

function CalendarView({ projects, startOfWeek, onViewDetails }: CalendarViewProps) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return date;
  });

  const getProjectsForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return projects.filter(project => {
      const startDate = new Date(project.startDate);
      const deadline = new Date(project.deadline);
      return startDate.toISOString().split('T')[0] === dateStr ||
             deadline.toISOString().split('T')[0] === dateStr ||
             (startDate <= date && deadline >= date);
    });
  };

  return (
    <div className="grid grid-cols-7 gap-4 overflow-visible" style={{ isolation: 'auto' }}>
      {days.map((day, index) => {
        const dayProjects = getProjectsForDay(day);
        const isToday = day.toDateString() === new Date().toDateString();
        
        return (
          <Card key={index} className={`min-h-[300px] overflow-visible ${isToday ? 'ring-2 ring-primary' : ''}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-center">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
                <div className="text-xs text-muted-foreground">
                  {day.getDate()}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 overflow-visible" style={{ position: 'static' }}>
              {dayProjects.map(project => (
                <div
                  key={project.id}
                  className="p-2 bg-muted rounded text-xs cursor-pointer hover:bg-muted/80"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails && onViewDetails(project);
                  }}
                >
                  <div className="font-medium truncate">{project.name}</div>
                  <div className="text-muted-foreground">{project.constructionTeam}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

interface MonthlyViewProps {
  projects: Project[];
  dateRange: {from: Date | undefined, to: Date | undefined} | undefined;
  regionFilter: Region | 'all';
  onViewDetails?: (project: Project) => void;
}

const MonthlyView = memo(function MonthlyView({ projects, dateRange, regionFilter, onUpdateProject, onViewDetails, trailers = [], onAddNotifications }: MonthlyViewProps & { onUpdateProject?: (projectId: string, updates: Partial<Project>) => void; trailers?: any[]; onAddNotifications?: (notifications: any[]) => void }) {
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, any>>(new Map());
  const [frozenProjects, setFrozenProjects] = useState<Project[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [localProjects, setLocalProjects] = useState<Project[]>(projects);
  
  console.log('MonthlyView re-rendered, projects count:', projects.length, 'activeId:', activeId, 'isTransitioning:', isTransitioning);
  if (!dateRange?.from || !dateRange?.to) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CalendarIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="text-lg">Välj ett datumintervall för att se månadsplanering</p>
      </div>
    );
  }

  // Apply optimistic updates to projects before using them
  const projectsWithOptimisticUpdates = projects.map(project => {
    const optimisticUpdate = optimisticUpdates.get(project.id);
    return optimisticUpdate ? { ...project, ...optimisticUpdate } : project;
  });

  // Use frozen projects during drag to prevent visual jumps
  const projectsToUse = frozenProjects.length > 0 ? frozenProjects : projectsWithOptimisticUpdates;
  
  // Filter projects within the date range
  const monthlyProjects = projectsToUse.filter(project => {
    const startDate = new Date(project.startDate);
    const deadline = new Date(project.deadline);
    const hasOverlap = (startDate <= dateRange.to! && deadline >= dateRange.from!) ||
                      (startDate >= dateRange.from! && startDate <= dateRange.to!) ||
                      (deadline >= dateRange.from! && deadline <= dateRange.to!);
    
    const matchesRegion = regionFilter === 'all' || project.region === regionFilter;
    return hasOverlap && matchesRegion;
  });

  // Get all weeks within the date range
  const getWeeksInRange = () => {
    const weeks: Array<{weekNumber: number, year: number, startDate: Date, endDate: Date, projects: Project[]}> = [];
    let current = startWeek(dateRange.from!);
    const end = endWeek(dateRange.to!);

    while (current <= end) {
      const weekEnd = endWeek(current);
      const weekNumber = getWeek(current);
      const year = getYear(current);
      
        const weekProjects = monthlyProjects.filter(project => {
          const startDate = new Date(project.startDate);
          return getWeek(startDate) === weekNumber && getYear(startDate) === year;
        });

      weeks.push({
        weekNumber,
        year,
        startDate: new Date(current),
        endDate: new Date(weekEnd),
        projects: weekProjects
      });

      current = addWeeks(current, 1);
    }

    return weeks;
  };

  const weeks = getWeeksInRange();

  const handleMonthlyDragEnd = (event: DragEndEvent) => {
    console.log('MONTHLY DRAG END CALLED:', event);
    const { active, over } = event;
    
    console.log('Active:', active?.id, 'Over:', over?.id);
    if (!over || active.id === over.id || !onUpdateProject) {
      console.log('Early return - no over, same id, or no onUpdateProject');
      setActiveId(null);
      setIsTransitioning(false);
      setFrozenProjects([]);
      return;
    }
    
    const projectId = active.id as string;
    const project = localProjects.find(p => p.id === projectId);
    console.log('MONTHLY DRAG: Project found:', project?.name, 'ID:', projectId);
    
    const newWeekId = over.id as string;
    
    // Extract week number from the drop zone ID
    const weekNumber = parseInt(newWeekId.replace('week-', ''));
    console.log('Extracted week number:', weekNumber);
    const targetWeek = weeks.find(w => w.weekNumber === weekNumber);
    
    console.log('Target week found:', !!targetWeek);
    if (!targetWeek || !project) {
      setActiveId(null);
      setIsTransitioning(false);
      setFrozenProjects([]);
      return;
    }
    
    const oldStartDate = new Date(project.planerad_start_datum || project.startDate);
    const oldDeadline = new Date(project.beräknat_slut_datum || project.deadline);
    const projectDuration = project.ungefärlig_arbetstid_dagar || Math.ceil((oldDeadline.getTime() - oldStartDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate new start date based on the target week (start on Monday)
    const newStartDate = new Date(targetWeek.startDate);
    const newDeadline = new Date(newStartDate);
    newDeadline.setDate(newStartDate.getDate() + projectDuration);
    
    // Generate new week string for planning
    const newWeekString = dateToWeekString(newStartDate);
    
    // Create activity log entry
    const newActivityEntry = {
      id: `activity-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: 'System',
      action: 'Projekt omplanerat',
      description: `Projekt flyttades från vecka ${dateToWeekString(oldStartDate)} till vecka ${newWeekString}`,
      category: 'general' as const,
      oldValue: `${dateToWeekString(oldStartDate)} (${format(oldStartDate, 'yyyy-MM-dd')})`,
      newValue: `${newWeekString} (${format(newStartDate, 'yyyy-MM-dd')})`
    };
    
    const updates = {
      bygg_start_vecka: newWeekString,
      planerad_start_datum: calculatePlannedStartDate(newWeekString),
      beräknat_slut_datum: format(newDeadline, 'yyyy-MM-dd'),
      startDate: format(newStartDate, 'yyyy-MM-dd'), // Legacy compatibility
      deadline: format(newDeadline, 'yyyy-MM-dd'), // Legacy compatibility
      activityLog: [...(project.activityLog || []), newActivityEntry]
    };

    // Apply optimistic update immediately
    setOptimisticUpdates(prev => {
      const newMap = new Map(prev);
      newMap.set(projectId, updates);
      return newMap;
    });
    
    // Update project in database
    onUpdateProject(projectId, updates);
    
    // Clear optimistic update after a delay to let database update propagate
    setTimeout(() => {
      setOptimisticUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(projectId);
        return newMap;
      });
    }, 2000);
    
    console.log(`MONTHLY: Moved project ${project.name} to week ${newWeekString}, planerad_start_datum: ${calculatePlannedStartDate(newWeekString)}`);

    // Show success toast
    toast({
      title: "Projekt omplanerat",
      description: `"${project.name}" flyttades till vecka ${weekNumber} (${format(newStartDate, 'd MMM yyyy')})`,
      duration: 3000,
    });

    // Create and add notification for project rescheduling
    const notification = {
      id: `reschedule-${projectId}-${Date.now()}`,
      type: 'project_rescheduled' as const,
      priority: 'medium' as const,
      title: 'Projekt omplanerat',
      message: `"${project.name}" flyttades från vecka ${dateToWeekString(oldStartDate)} till vecka ${weekNumber}`,
      projectId: project.id,
      projectName: project.name,
      createdAt: new Date().toISOString(),
      isRead: false,
      actionRequired: false,
      fieldName: 'bygg_start_vecka',
      oldValue: dateToWeekString(oldStartDate),
      newValue: newWeekString,
      changedByUser: 'System'
    };

    // Add notification using the React state function
    console.log('Adding notification via React state');
    if (onAddNotifications) {
      onAddNotifications([notification]);
      console.log('Notification added via React state');
    }
  };

  return (
    <div style={{ contain: 'layout style paint', transform: 'translateZ(0)', transition: 'opacity 0.3s ease' }}>
      <DndContext
        onDragStart={(event) => {
          setActiveId(event.active.id as string);
          setIsTransitioning(true);
          // Freeze current state to prevent visual jumps
          setFrozenProjects(projectsWithOptimisticUpdates);
        }}
        onDragEnd={(event) => {
          // Process the update but don't change visual state yet
          handleMonthlyDragEnd(event);
          // Clear state in a way that prevents visual jump
          setTimeout(() => {
            setIsTransitioning(false);
            setFrozenProjects([]);
            setActiveId(null);
          }, 100);
        }}
        modifiers={[restrictToWindowEdges]}
      >
      <div className="space-y-6 will-change-auto">
        <div className="text-center">
          <h3 className="text-xl font-bold">
            Månadsplanering: {format(dateRange.from, "d MMM yyyy")} - {format(dateRange.to, "d MMM yyyy")}
          </h3>
          <p className="text-muted-foreground mt-2">
            {monthlyProjects.length} projekt funna i datumintervallet
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 will-change-auto overflow-visible"
             style={{ transform: 'translateZ(0)' }} // Force hardware acceleration
        >
          {weeks.map((week, index) => (
            <MonthlyWeekCard key={index} week={week} onViewDetails={onViewDetails} trailers={trailers} />
          ))}
        </div>
      </div>
    </DndContext>
    </div>
  );
});

interface MonthlyWeekCardProps {
  week: {weekNumber: number, year: number, startDate: Date, endDate: Date, projects: Project[]};
  onViewDetails?: (project: Project) => void;
  trailers?: any[];
}

const MonthlyWeekCard = memo(function MonthlyWeekCard({ week, onViewDetails, trailers = [] }: MonthlyWeekCardProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `week-${week.weekNumber}`,
  });

  return (
    <Card 
      ref={setNodeRef}
      className={cn(
        "shadow-card transition-all duration-300",
        isOver && "ring-4 ring-primary bg-primary/10 scale-105 shadow-2xl"
      )}
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Vecka {week.weekNumber}</span>
          <Badge variant="outline">{week.year}</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {format(week.startDate, "d MMM")} - {format(week.endDate, "d MMM")}
        </p>
      </CardHeader>
      <CardContent className="space-y-3 min-h-[100px]">
        {week.projects.length > 0 ? (
          week.projects.map(project => (
            <MonthlyProjectCard key={project.id} project={project} onViewDetails={onViewDetails} trailers={trailers} />
          ))
        ) : (
          <div className={cn(
            "text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg transition-all duration-200",
            isOver && "border-primary bg-primary/5 text-primary"
          )}>
            {isOver ? "Släpp projektet här" : "Inga projekt denna vecka"}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

interface MonthlyProjectCardProps {
  project: Project;
  onViewDetails?: (project: Project) => void;
  trailers?: any[];
}

const MonthlyProjectCard = memo(function MonthlyProjectCard({ project, onViewDetails, trailers = [] }: MonthlyProjectCardProps) {
  console.log('MonthlyProjectCard re-rendered for project:', project.name);
  
  // Helper function to get trailer name
  const getTrailerName = (trailerId: string) => {
    const trailer = trailers.find(t => t.id === trailerId);
    return trailer ? trailer.name : trailerId;
  };
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: project.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.1 : 1, // Make original nearly invisible during drag
    zIndex: isDragging ? 1000 : ('auto' as const),
    willChange: isDragging ? 'transform' : 'auto',
    pointerEvents: isDragging ? ('none' as const) : ('auto' as const), // Disable interactions during drag
  } : { 
    opacity: 1,
    willChange: 'auto'
  };

  return (
    <ProjectHoverCard project={project}>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        className={cn(
          "border rounded-lg p-3 space-y-2 relative transition-all duration-200 group",
          isDragging ? "shadow-2xl ring-2 ring-primary scale-105" : "hover:shadow-md"
        )}
      >
        {/* Drag handle - larger and more visible */}
        <div 
          {...listeners}
          className={cn(
            "absolute top-2 right-2 w-10 h-10 bg-primary/10 hover:bg-primary/20 rounded-md cursor-grab active:cursor-grabbing z-30 flex items-center justify-center text-lg font-bold transition-all border-2 border-primary/30",
            "opacity-40 group-hover:opacity-100",
            isDragging && "cursor-grabbing"
          )}
          title="Dra för att flytta projekt"
        >
          <span className="text-primary">⋮⋮</span>
        </div>
        
        {/* Click area - everywhere else */}
        <div 
          className="cursor-pointer"
          onClick={(e) => {
            console.log('Monthly project card clicked:', project.name);
            e.stopPropagation();
            if (onViewDetails) {
              onViewDetails(project);
            }
          }}
        >
          <div className="flex items-start justify-between">
            <h5 className="font-medium text-sm">{project.name}</h5>
            <Badge 
              variant="secondary" 
              className={`${project.status === 'planned' ? 'bg-blue-500' : 
                         project.status === 'ongoing' ? 'bg-orange-500' : 
                         project.status === 'completed' ? 'bg-green-500' : 
                         'bg-purple-500'} text-white text-xs`}
            >
              {project.status}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            {project.region}
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="w-3 h-3" />
            {project.constructionTeam}
          </div>

          {/* Show assigned trailer if available */}
          {project.assignedTrailer && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Truck className="w-3 h-3" />
              <span>Släp: {getTrailerName(project.assignedTrailer)}</span>
            </div>
          )}
          
          <div className="text-xs text-muted-foreground">
            {format(new Date(project.startDate), "d/M")} - {format(new Date(project.deadline), "d/M")}
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-primary h-1.5 rounded-full transition-all duration-300" 
              style={{ width: `${project.completionPercentage}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground text-right">
            {project.completionPercentage}%
          </div>
        </div>
      </div>
    </ProjectHoverCard>
  );
});