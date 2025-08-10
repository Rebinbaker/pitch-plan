import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, Clock, MapPin, User, Truck, Users, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Project, ProjectStatus, Region } from '@/types/project';
import { calculateRemainingTime, formatDaysRemaining } from '@/utils/timeCalculations';
import { format, addWeeks, getWeek, getYear, isSameMonth, startOfMonth, endOfMonth, startOfWeek as startWeek, endOfWeek as endWeek, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { ProjectHoverCard } from './ProjectHoverCard';
import { ProjectDetailModal } from './ProjectDetailModal';
import { DndContext, DragEndEvent, DragStartEvent, useSensor, useSensors, PointerSensor, useDroppable, useDraggable } from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';

interface WeeklyPlanningViewProps {
  projects: Project[];
  onUpdateProject?: (projectId: string, updates: Partial<Project>) => void;
}

export function WeeklyPlanningView({ projects, onUpdateProject }: WeeklyPlanningViewProps) {
  const [regionFilter, setRegionFilter] = useState<Region | 'all'>('all');
  const [viewMode, setViewMode] = useState<'calendar' | 'board' | 'monthly'>('board');
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

  // Calculate dates for the selected week
  const getWeekDates = (date: Date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay() + 1); // Monday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
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

  // Filter projects for the selected week
  const allWeekProjects = projects.filter(project => {
    const startDate = new Date(project.startDate);
    const deadline = new Date(project.deadline);
    const isThisWeek = (startDate >= startOfWeek && startDate <= endOfWeek) ||
                      (deadline >= startOfWeek && deadline <= endOfWeek) ||
                      (startDate <= startOfWeek && deadline >= endOfWeek);
    
    const matchesRegion = regionFilter === 'all' || project.region === regionFilter;
    return isThisWeek && matchesRegion;
  });

  // Categorize projects - each project appears in exactly one category
  const startingThisWeek: Project[] = [];
  const ongoingProjects: Project[] = [];
  const completingThisWeek: Project[] = [];

  allWeekProjects.forEach(project => {
    const startDate = new Date(project.startDate);
    const deadline = new Date(project.deadline);
    
    // Priority order: starting > completing > ongoing
    if (startDate >= startOfWeek && startDate <= endOfWeek) {
      startingThisWeek.push(project);
    } else if (deadline >= startOfWeek && deadline <= endOfWeek && 
               (project.status === 'ongoing' || project.status === 'completed')) {
      completingThisWeek.push(project);
    } else if (project.status === 'ongoing') {
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

  const handleDragEnd = (event: DragEndEvent) => {
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

    let newStartDate: Date;
    const currentStartDate = new Date(project.startDate);
    const currentDeadline = new Date(project.deadline);
    const projectDuration = Math.ceil((currentDeadline.getTime() - currentStartDate.getTime()) / (1000 * 60 * 60 * 24));

    if (targetWeek === 'starting') {
      // Move to current selected week
      newStartDate = new Date(startOfWeek);
    } else if (targetWeek === 'ongoing') {
      // Keep in ongoing (no date change needed)
      setActiveId(null);
      return;
    } else if (targetWeek === 'completing') {
      // Set deadline to end of current week, calculate backwards
      const newDeadline = new Date(endOfWeek);
      newStartDate = new Date(newDeadline);
      newStartDate.setDate(newDeadline.getDate() - projectDuration);
    } else {
      setActiveId(null);
      return;
    }

    // Calculate new deadline
    const newDeadline = new Date(newStartDate);
    newDeadline.setDate(newStartDate.getDate() + projectDuration);

    // Create activity log entry
    const oldStartDateObj = new Date(project.startDate);
    const newActivityEntry = {
      id: `activity-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: 'System', // In a real app, this would be the current user
      action: 'Projekt omplanerat',
      description: `Projekt prioriterades om från vecka ${getWeek(oldStartDateObj)} (${format(oldStartDateObj, 'yyyy-MM-dd')}) till vecka ${getWeek(newStartDate)} (${format(newStartDate, 'yyyy-MM-dd')})`,
      category: 'general' as const,
      oldValue: `Vecka ${getWeek(oldStartDateObj)} (${format(oldStartDateObj, 'yyyy-MM-dd')})`,
      newValue: `Vecka ${getWeek(newStartDate)} (${format(newStartDate, 'yyyy-MM-dd')})`
    };

    // Update project
    onUpdateProject(projectId, {
      startDate: newStartDate.toISOString().split('T')[0],
      deadline: newDeadline.toISOString().split('T')[0],
      activityLog: [...(project.activityLog || []), newActivityEntry]
    });

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
                <SelectItem value="Stockholm">Stockholm</SelectItem>
                <SelectItem value="Västra Götaland">Västra Götaland</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={viewMode} onValueChange={(value: 'calendar' | 'board' | 'monthly') => setViewMode(value)}>
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
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Starting This Week */}
            <DroppableColumn id="starting" title="Starting This Week" count={startingThisWeek.length} color="text-blue-600" icon={CalendarDays}>
              {startingThisWeek.map(project => (
                <DraggableProjectCard key={project.id} project={project} onViewDetails={handleViewDetails} />
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
                <DraggableProjectCard key={project.id} project={project} onViewDetails={handleViewDetails} />
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
                <DraggableProjectCard key={project.id} project={project} onViewDetails={handleViewDetails} />
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
        <MonthlyView projects={projects} dateRange={monthlyDateRange} regionFilter={regionFilter} onUpdateProject={onUpdateProject} onViewDetails={handleViewDetails} />
      )}

      <ProjectDetailModal
        project={selectedProject}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        onUpdateProject={handleUpdateProjectFromModal}
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
      <CardContent className="space-y-3 min-h-[200px]">
        {children}
      </CardContent>
    </Card>
  );
}

// Draggable Project Card Component
interface DraggableProjectCardProps {
  project: Project;
  onViewDetails?: (project: Project) => void;
}

function DraggableProjectCard({ project, onViewDetails }: DraggableProjectCardProps) {
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
          <ProjectWeeklyCard project={project} onViewDetails={undefined} />
        </div>
      </div>
    </ProjectHoverCard>
  );
}
function ProjectWeeklyCard({ project, onViewDetails }: ProjectWeeklyCardProps) {
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
            <span>Släp: {project.assignedTrailer}</span>
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
    <div className="grid grid-cols-7 gap-4">
      {days.map((day, index) => {
        const dayProjects = getProjectsForDay(day);
        const isToday = day.toDateString() === new Date().toDateString();
        
        return (
          <Card key={index} className={`min-h-[300px] ${isToday ? 'ring-2 ring-primary' : ''}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-center">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
                <div className="text-xs text-muted-foreground">
                  {day.getDate()}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
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

function MonthlyView({ projects, dateRange, regionFilter, onUpdateProject, onViewDetails }: MonthlyViewProps & { onUpdateProject?: (projectId: string, updates: Partial<Project>) => void }) {
  if (!dateRange?.from || !dateRange?.to) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CalendarIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="text-lg">Välj ett datumintervall för att se månadsplanering</p>
      </div>
    );
  }

  // Filter projects within the date range
  const monthlyProjects = projects.filter(project => {
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id || !onUpdateProject) return;
    
    const projectId = active.id as string;
    const newWeekId = over.id as string;
    
    // Extract week number from the drop zone ID
    const weekNumber = parseInt(newWeekId.replace('week-', ''));
    const targetWeek = weeks.find(w => w.weekNumber === weekNumber);
    
    if (!targetWeek) return;
    
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    const oldStartDate = new Date(project.startDate);
    const oldDeadline = new Date(project.deadline);
    const projectDuration = Math.ceil((oldDeadline.getTime() - oldStartDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate new start date based on the target week (start on Monday)
    const newStartDate = new Date(targetWeek.startDate);
    const newDeadline = new Date(newStartDate);
    newDeadline.setDate(newStartDate.getDate() + projectDuration);
    
    // Create activity log entry
    const newActivityEntry = {
      id: `activity-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: 'System', // In a real app, this would be the current user
      action: 'Projekt omplanerat',
      description: `Projekt prioriterades om från vecka ${getWeek(oldStartDate)} (${format(oldStartDate, 'yyyy-MM-dd')}) till vecka ${weekNumber} (${format(newStartDate, 'yyyy-MM-dd')})`,
      category: 'general' as const,
      oldValue: `Vecka ${getWeek(oldStartDate)} (${format(oldStartDate, 'yyyy-MM-dd')})`,
      newValue: `Vecka ${weekNumber} (${format(newStartDate, 'yyyy-MM-dd')})`
    };
    
    // Update project with new dates and activity log
    onUpdateProject(projectId, {
      startDate: format(newStartDate, 'yyyy-MM-dd'),
      deadline: format(newDeadline, 'yyyy-MM-dd'),
      activityLog: [...(project.activityLog || []), newActivityEntry]
    });
  };

  return (
    <DndContext
      onDragEnd={handleDragEnd}
      modifiers={[restrictToWindowEdges]}
    >
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-bold">
            Månadsplanering: {format(dateRange.from, "d MMM yyyy")} - {format(dateRange.to, "d MMM yyyy")}
          </h3>
          <p className="text-muted-foreground mt-2">
            {monthlyProjects.length} projekt funna i datumintervallet
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {weeks.map((week, index) => (
            <MonthlyWeekCard key={index} week={week} onViewDetails={onViewDetails} />
          ))}
        </div>
      </div>
    </DndContext>
  );
}

interface MonthlyWeekCardProps {
  week: {weekNumber: number, year: number, startDate: Date, endDate: Date, projects: Project[]};
  onViewDetails?: (project: Project) => void;
}

function MonthlyWeekCard({ week, onViewDetails }: MonthlyWeekCardProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `week-${week.weekNumber}`,
  });

  return (
    <Card 
      ref={setNodeRef}
      className={cn(
        "shadow-card transition-colors",
        isOver && "ring-2 ring-primary/50 bg-primary/5"
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
      <CardContent className="space-y-3">
        {week.projects.length > 0 ? (
          week.projects.map(project => (
            <MonthlyProjectCard key={project.id} project={project} onViewDetails={onViewDetails} />
          ))
        ) : (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Inga projekt denna vecka
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface MonthlyProjectCardProps {
  project: Project;
  onViewDetails?: (project: Project) => void;
}

function MonthlyProjectCard({ project, onViewDetails }: MonthlyProjectCardProps) {
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
    opacity: isDragging ? 0.5 : 1,
  } : { opacity: isDragging ? 0.5 : 1 };

  return (
    <ProjectHoverCard project={project}>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        className="border rounded p-3 space-y-2 relative"
      >
        {/* Drag handle - larger and more visible */}
        <div 
          {...listeners}
          className="absolute top-1 right-1 w-8 h-8 bg-muted/30 hover:bg-muted/60 rounded-md cursor-grab active:cursor-grabbing z-30 flex items-center justify-center text-sm opacity-60 hover:opacity-100 transition-all border border-muted"
          title="Drag to move project"
        >
          ⋮⋮
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
}