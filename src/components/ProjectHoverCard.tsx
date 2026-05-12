import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MapPin, Calendar, Clock, User, Users, Truck, Package, CheckCircle, AlertCircle, Hotel } from 'lucide-react';
import { Project, ProjectStatus, getAccommodationCheckOutDate } from '@/types/project';
import { calculateRemainingTime, formatDaysRemaining } from '@/utils/timeCalculations';
import { WeatherDisplay } from './WeatherDisplay';
import { createPortal } from 'react-dom';

interface ProjectHoverCardProps {
  project: Project;
  children: React.ReactNode;
}

export function ProjectHoverCard({ project, children }: ProjectHoverCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0, side: 'right' });
  const triggerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

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

  const calculatePosition = () => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const cardWidth = 384; // w-96 = 384px
    const cardHeight = 600; // estimated height
    const margin = 15;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = rect.right + margin;
    let y = rect.top;
    let side = 'right';

    // Check if card would overflow on the right
    if (x + cardWidth > viewportWidth) {
      x = rect.left - cardWidth - margin;
      side = 'left';
    }

    // Check if card would overflow on the left (when positioned left)
    if (x < 0) {
      x = margin;
      side = 'center';
    }

    // Check vertical overflow
    if (y + cardHeight > viewportHeight) {
      y = viewportHeight - cardHeight - margin;
    }

    // Ensure it doesn't go above viewport
    if (y < margin) {
      y = margin;
    }

    setPosition({ x, y, side });
  };

  const handleMouseEnter = () => {
    clearTimeout(timeoutRef.current);
    calculatePosition();
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 200);
  };

  const handleMouseLeave = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 100);
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    // Only hide if clicking on the background, not on interactive elements
    if (e.target === e.currentTarget) {
      setIsVisible(false);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (isVisible) calculatePosition();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isVisible]);

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

  const hoverCard = isVisible && typeof window !== 'undefined' ? createPortal(
    <div
      ref={cardRef}
      className="fixed z-[9999] w-96 animate-in fade-in-0 zoom-in-95 duration-200"
      style={{
        left: position.x,
        top: position.y,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleBackgroundClick}
    >
      <Card className="border shadow-lg bg-background">
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

          {/* Accommodation booking */}
          {project.accommodationBooking && (() => {
            const checkOut = getAccommodationCheckOutDate(project.accommodationBooking);
            const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
            const daysLeft = Math.ceil((startOfDay(checkOut).getTime() - startOfDay(new Date()).getTime()) / 86400000);
            const colorClass =
              daysLeft <= 1 ? 'text-destructive' : daysLeft <= 3 ? 'text-warning' : 'text-foreground';
            const label =
              daysLeft < 0
                ? `${Math.abs(daysLeft)} dag${Math.abs(daysLeft) !== 1 ? 'ar' : ''} sedan utcheckning`
                : daysLeft === 0
                ? 'Checkar ut idag'
                : `${daysLeft} dag${daysLeft !== 1 ? 'ar' : ''} kvar till utcheckning`;
            return (
              <div className="flex items-start gap-2 text-sm">
                <Hotel className={`w-4 h-4 mt-0.5 ${colorClass}`} />
                <div>
                  <div className="font-medium">{project.accommodationBooking.name}</div>
                  <div className={`text-xs ${colorClass}`}>{label}</div>
                </div>
              </div>
            );
          })()}

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
    </div>,
    document.body
  ) : null;

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
      {hoverCard}
    </>
  );
}