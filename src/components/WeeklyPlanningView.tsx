import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, MapPin, User, Truck, Users } from 'lucide-react';
import { Project, ProjectStatus, Region } from '@/types/project';
import { calculateRemainingTime, formatDaysRemaining } from '@/utils/timeCalculations';

interface WeeklyPlanningViewProps {
  projects: Project[];
}

export function WeeklyPlanningView({ projects }: WeeklyPlanningViewProps) {
  const [regionFilter, setRegionFilter] = useState<Region | 'all'>('all');
  const [viewMode, setViewMode] = useState<'calendar' | 'board'>('board');

  // Calculate dates for this week
  const today = new Date();
  const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 1));
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  // Filter projects for this week
  const thisWeekProjects = projects.filter(project => {
    const startDate = new Date(project.startDate);
    const deadline = new Date(project.deadline);
    const isThisWeek = (startDate >= startOfWeek && startDate <= endOfWeek) ||
                      (deadline >= startOfWeek && deadline <= endOfWeek) ||
                      (startDate <= startOfWeek && deadline >= endOfWeek);
    
    const matchesRegion = regionFilter === 'all' || project.region === regionFilter;
    return isThisWeek && matchesRegion;
  });

  // Categorize projects
  const startingThisWeek = thisWeekProjects.filter(project => {
    const startDate = new Date(project.startDate);
    return startDate >= startOfWeek && startDate <= endOfWeek;
  });

  const ongoingProjects = thisWeekProjects.filter(project => project.status === 'ongoing');
  
  const completingThisWeek = thisWeekProjects.filter(project => {
    const deadline = new Date(project.deadline);
    return deadline >= startOfWeek && deadline <= endOfWeek && 
           (project.status === 'ongoing' || project.status === 'completed');
  });

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Weekly Planning</h2>
          <p className="text-muted-foreground">
            Week of {startOfWeek.toLocaleDateString()} - {endOfWeek.toLocaleDateString()}
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
          
          <Select value={viewMode} onValueChange={(value: 'calendar' | 'board') => setViewMode(value)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="board">Kortvy</SelectItem>
              <SelectItem value="calendar">Kalendervy</SelectItem>
            </SelectContent>
          </Select>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Starting This Week */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600">
                <Calendar className="w-5 h-5" />
                Starting This Week ({startingThisWeek.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {startingThisWeek.map(project => (
                <ProjectWeeklyCard key={project.id} project={project} />
              ))}
              {startingThisWeek.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  No projects starting this week
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ongoing Projects */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <Clock className="w-5 h-5" />
                Ongoing Projects ({ongoingProjects.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ongoingProjects.map(project => (
                <ProjectWeeklyCard key={project.id} project={project} />
              ))}
              {ongoingProjects.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  No ongoing projects
                </div>
              )}
            </CardContent>
          </Card>

          {/* Completing This Week */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <Calendar className="w-5 h-5" />
                Due This Week ({completingThisWeek.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {completingThisWeek.map(project => (
                <ProjectWeeklyCard key={project.id} project={project} />
              ))}
              {completingThisWeek.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  No projects due this week
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <CalendarView projects={thisWeekProjects} startOfWeek={startOfWeek} />
      )}
    </div>
  );
}

interface ProjectWeeklyCardProps {
  project: Project;
}

function ProjectWeeklyCard({ project }: ProjectWeeklyCardProps) {
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
    <Card className="shadow-card">
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
}

function CalendarView({ projects, startOfWeek }: CalendarViewProps) {
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
                <div key={project.id} className="p-2 bg-muted rounded text-xs">
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