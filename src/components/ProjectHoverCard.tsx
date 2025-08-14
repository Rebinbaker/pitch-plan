import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { MapPin, Calendar, Clock, User, Users, Truck, Package, CheckCircle, AlertCircle } from 'lucide-react';
import { Project, ProjectStatus } from '@/types/project';
import { calculateRemainingTime, formatDaysRemaining } from '@/utils/timeCalculations';
import { WeatherDisplay } from './WeatherDisplay';

interface ProjectHoverCardProps {
  project: Project;
  children: React.ReactNode;
}

export function ProjectHoverCard({ project, children }: ProjectHoverCardProps) {
  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'planned': return 'bg-blue-500';
      case 'ongoing': return 'bg-orange-500';
      case 'completed': return 'bg-green-500';
      case 'invoiced': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: ProjectStatus) => {
    switch (status) {
      case 'planned': return 'Planerad';
      case 'ongoing': return 'Pågående';
      case 'completed': return 'Avslutad';
      case 'invoiced': return 'Fakturerad';
      default: return status;
    }
  };

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
      if (completionDate.getDay() !== 0 && completionDate.getDay() !== 6) {
        daysAdded++;
      }
    }
    
    return completionDate.toLocaleDateString('sv-SE');
  };

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent 
        className="w-96 p-0 z-[9999] bg-background border shadow-lg" 
        side="right" 
        align="start" 
        sideOffset={15}
        avoidCollisions={true}
        hideWhenDetached={false}
        collisionBoundary={typeof window !== 'undefined' ? window.document.documentElement : undefined}
        sticky="always"
      >
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg">{project.name}</CardTitle>
              <Badge variant="secondary" className={`${getStatusColor(project.status)} text-white`}>
                {getStatusText(project.status)}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              {project.customerName}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Location and Team */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{project.region}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>{project.constructionTeam}</span>
              </div>
            </div>

            {/* Dates */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>Start: {new Date(project.startDate).toLocaleDateString('sv-SE')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>Deadline: {new Date(project.deadline).toLocaleDateString('sv-SE')}</span>
              </div>
              {project.status === 'ongoing' && (
                <div className="flex items-center gap-2 text-sm text-orange-600 font-medium">
                  <Clock className="w-4 h-4" />
                  <span>Uppskattat klart: {estimatedCompletionDate()}</span>
                </div>
              )}
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Framsteg</span>
                <span className="font-medium">{project.completionPercentage}%</span>
              </div>
              <Progress value={project.completionPercentage} className="h-2" />
            </div>

            {/* Time remaining for ongoing projects */}
            {project.status === 'ongoing' && timeEstimate.workersRemainingDays > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>Tid kvar: {formatDaysRemaining(timeEstimate.workersRemainingDays)}</span>
              </div>
            )}

            {/* Assigned trailer */}
            {project.assignedTrailer && (
              <div className="flex items-center gap-2 text-sm">
                <Truck className="w-4 h-4 text-muted-foreground" />
                <span>Släp: {project.assignedTrailer}</span>
              </div>
            )}

            {/* Avvarat Material */}
            {project.avvaratMaterial?.hasLeftoverMaterial && (
              <div className="flex items-center gap-2 text-sm">
                <Package className="w-4 h-4 text-warning" />
                <span className="text-warning font-medium">Avvarat material</span>
              </div>
            )}

            {/* Checklist progress */}
            {project.checklist && project.checklist.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle className="w-4 h-4 text-muted-foreground" />
                  Checklista
                </div>
                <div className="text-sm text-muted-foreground">
                  {project.checklist.filter(item => item.completed).length} av {project.checklist.length} klara
                </div>
              </div>
            )}

            {/* Work phases */}
            {project.workPhases && project.workPhases.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <AlertCircle className="w-4 h-4 text-muted-foreground" />
                  Arbetsfaser
                </div>
                <div className="text-sm text-muted-foreground">
                  {project.workPhases.filter(phase => phase.completed).length} av {project.workPhases.length} klara
                </div>
              </div>
            )}

            {/* Weather Information */}
            {(project.constructionStartWeek || project.bygg_start_vecka) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  Väder för vecka {project.constructionStartWeek || project.bygg_start_vecka}
                </div>
                <WeatherDisplay 
                  address={project.address}
                  startWeek={project.constructionStartWeek || project.bygg_start_vecka}
                  compact={true}
                  className="border border-border/50 rounded-lg p-2 bg-muted/10"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </HoverCardContent>
    </HoverCard>
  );
}