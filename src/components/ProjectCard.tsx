import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Project } from '@/types/project';
import { CalendarDays, MapPin, Phone, User, Users, FileText, Download, Truck, Calendar, Clock, Trash2, AlertTriangle } from 'lucide-react';
import { WeatherDisplay } from './WeatherDisplay';
import { downloadProjectReport } from '@/utils/pdfGenerator';
import { useToast } from '@/hooks/use-toast';
import { calculateRemainingTime, formatDaysRemaining } from '@/utils/timeCalculations';
import { analyzeProjectRisk } from '@/utils/riskAnalysis';
import { TrailerAssignmentSection } from './TrailerAssignmentSection';
import { WorkPhasesSection } from './WorkPhasesSection';
import { ScaffoldingTrailer } from '@/types/scaffolding';

interface ProjectCardProps {
  project: Project;
  onViewDetails: (project: Project) => void;
  onUpdateProject?: (project: Project) => void;
  onDeleteProject?: (projectId: string) => void;
  trailers?: ScaffoldingTrailer[];
  teams?: any[];
  onUpdateTeam?: (team: any) => void;
  onUpdateTrailer?: (trailer: any) => void;
  onAddNotifications?: (notifications: any[]) => void;
  isAdmin?: boolean;
}

export function ProjectCard({ project, onViewDetails, onUpdateProject, onDeleteProject, trailers = [], teams = [], onUpdateTeam, onUpdateTrailer, onAddNotifications, isAdmin }: ProjectCardProps) {
  const { toast } = useToast();
  const risk = useMemo(() => analyzeProjectRisk(project), [project]);

  // Auto-complete project if it's 100% but still showing as ongoing
  React.useEffect(() => {
    if (onUpdateProject) {
      // Calculate real-time completion
      const checklistWeight = (project.checklist || [])
        .filter(item => item.completed)
        .reduce((sum, item) => sum + (item.weight || 0), 0);
      const workPhasesWeight = (project.workPhases || [])
        .filter(phase => phase.completed)
        .reduce((sum, phase) => sum + (phase.weight || 0), 0);
      const totalCompletedWeight = checklistWeight + workPhasesWeight;
      
      const checklistTotalWeight = (project.checklist || []).reduce((sum, item) => sum + (item.weight || 0), 0);
      const workPhasesTotalWeight = (project.workPhases || []).reduce((sum, phase) => sum + (phase.weight || 0), 0);
      const totalWeight = checklistTotalWeight + workPhasesTotalWeight;
      
      const realTimeCompletion = totalWeight > 0 ? 
        (totalCompletedWeight === totalWeight ? 100 : Math.round((totalCompletedWeight / totalWeight) * 100)) : 0;
      
      // Auto-complete if 100% and not already completed
      if (realTimeCompletion === 100 && project.status !== 'completed') {
        console.log('AUTO-COMPLETING PROJECT:', project.name, 'from status:', project.status);
        
        const activityEntry = {
          id: `activity-${Date.now()}`,
          timestamp: new Date().toISOString(),
          user: 'System',
          action: 'Projekt slutfört - alla arbetsmoment och checklistepunkter klara',
          description: 'status',
          category: 'status' as const,
          oldValue: project.status.charAt(0).toUpperCase() + project.status.slice(1),
          newValue: 'Avslutad'
        };
        
        const updatedProject = {
          ...project,
          status: 'completed' as const,
          completionPercentage: 100,
          activityLog: [...(project.activityLog || []), activityEntry],
        };
        
        onUpdateProject(updatedProject);
      }
    }
  }, [project, onUpdateProject]);

  // Auto-transition to 'ongoing' as soon as any work phase is completed
  React.useEffect(() => {
    if (!onUpdateProject) return;
    if (project.status !== 'planned' && project.status !== 'redo') return;

    const anyPhaseDone = (project.workPhases || []).some(p => p.completed);
    if (anyPhaseDone) {
      const activityEntry = {
        id: `activity-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: 'System',
        action: 'Projekt startat - första arbetsmomentet avbockat',
        description: 'status',
        category: 'status' as const,
        oldValue: project.status === 'redo' ? 'Redo' : 'Planerad',
        newValue: 'Pågående',
      };
      onUpdateProject({
        ...project,
        status: 'ongoing',
        activityLog: [...(project.activityLog || []), activityEntry],
      });
      return;
    }
  }, [project, onUpdateProject]);

  // Auto-transition between 'planned' and 'redo' based on pre-construction readiness
  React.useEffect(() => {
    if (!onUpdateProject) return;
    if (project.status !== 'planned' && project.status !== 'redo') return;

    const items = project.checklist || [];
    const welcome = items.find(i => i.label === 'Välkomstsamtal');
    const container = items.find(i => i.label === 'Containerbeställning');
    const scaffolding = items.find(i => i.label === 'Ställningshantering');
    const material = items.find(i => i.label === 'Materialbeställning');

    const welcomeDone = !!welcome?.completed;
    const containerDone = !!container?.completed || !!container?.containerOrderConfirmed;
    const scaffoldingDone = scaffolding?.scaffoldingStatus === 'built_ready';
    const materialDone =
      project.materialOrder?.status === 'ordered' ||
      project.materialOrder?.status === 'delivered' ||
      !!material?.completed;

    const allReady = welcomeDone && containerDone && scaffoldingDone && materialDone;

    if (allReady && project.status === 'planned') {
      const activityEntry = {
        id: `activity-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: 'System',
        action: 'Projekt redo - välkomstsamtal, container, ställning och material klara',
        description: 'status',
        category: 'status' as const,
        oldValue: 'Planerad',
        newValue: 'Redo',
      };
      onUpdateProject({
        ...project,
        status: 'redo',
        activityLog: [...(project.activityLog || []), activityEntry],
      });
    } else if (!allReady && project.status === 'redo') {
      const activityEntry = {
        id: `activity-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: 'System',
        action: 'Projekt åter planerat - förutsättningar för Redo uppfylls inte längre',
        description: 'status',
        category: 'status' as const,
        oldValue: 'Redo',
        newValue: 'Planerad',
      };
      onUpdateProject({
        ...project,
        status: 'planned',
        activityLog: [...(project.activityLog || []), activityEntry],
      });
    }
  }, [project, onUpdateProject]);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'planned': return 'planned';
      case 'redo': return 'redo';
      case 'ongoing': return 'ongoing';
      case 'completed': return 'completed';
      case 'invoiced': return 'invoiced';
      case 'ånger': return 'destructive' as const;
      default: return 'default';
    }
  };

  const handleExportReport = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const result = await downloadProjectReport(project, []);
      if (result.success) {
        toast({
          title: "Report Generated",
          description: `PDF report downloaded: ${result.fileName}`,
        });
      } else {
        toast({
          title: "Export Failed",
          description: result.error || "Failed to generate PDF report",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className={`hover:shadow-hover hover:bg-background/90 hover:scale-[1.02] transition-all duration-300 cursor-pointer group ${risk.level === 'delayed' ? 'ring-2 ring-destructive/50 shadow-[0_0_15px_-3px_hsl(var(--destructive)/0.3)]' : risk.level === 'high' ? 'ring-2 ring-destructive/30' : risk.level === 'warning' ? 'ring-1 ring-yellow-500/30' : ''}`} onClick={(e) => { console.log('ProjectCard clicked:', project.name); onViewDetails(project); }}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-card-foreground group-hover:text-primary transition-smooth">
              {project.name}
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{project.address}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {(() => {
              console.log(`PROJECT CARD DEBUG: ${project.name}`, {
                status: project.status,
                completionPercentage: project.completionPercentage,
                checklistCompleted: project.checklist?.filter(item => item.completed).length || 0,
                checklistTotal: project.checklist?.length || 0,
                workPhasesCompleted: project.workPhases?.filter(phase => phase.completed).length || 0,
                workPhasesTotal: project.workPhases?.length || 0
              });
              return null;
            })()}
            <div className="flex items-center gap-2 flex-wrap">
              {risk.level === 'delayed' && (
                <Badge variant="destructive" className="animate-pulse gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Försenad {risk.daysDelayed > 0 && `(${risk.daysDelayed} dagar)`}
                </Badge>
              )}
              {risk.level === 'high' && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Hög risk
                </Badge>
              )}
              {risk.level === 'warning' && (
                <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white gap-1 border-0">
                  <AlertTriangle className="w-3 h-3" />
                  Riskzon
                </Badge>
              )}
              <Badge variant={getStatusVariant(project.status)}>
                {project.status === 'completed' ? 'Avslutad' : 
                 project.status === 'ånger' ? 'Ånger' :
                 project.status === 'redo' ? 'Redo' :
                 project.status.charAt(0).toUpperCase() + project.status.slice(1)}
              </Badge>
              {project.rotStatus === 'Yes' && (
                <Badge variant="rot" className="text-xs">ROT</Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="w-4 h-4" />
            <span>{project.customerName}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="w-4 h-4" />
            <span>{project.customerPhone}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              {(() => {
                console.log(`Project ${project.name} actualConstructionStart:`, project.actualConstructionStart);
                console.log(`Project ${project.name} constructionStartWeek:`, project.constructionStartWeek);
                return project.actualConstructionStart 
                  ? `Byggstart: ${new Date(project.actualConstructionStart).toLocaleDateString('sv-SE')}`
                  : `Planerad byggstart: ${project.constructionStartWeek}`;
              })()}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>
              {project.actualConstructionStart && project.deadline
                ? `Deadline: ${new Date(project.deadline).toLocaleDateString('sv-SE')}`
                : `Arbetstid: ${project.estimatedWorkDays} dagar`
              }
            </span>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            {(() => {
              // Calculate real-time completion percentage
              const checklistWeight = (project.checklist || [])
                .filter(item => item.completed)
                .reduce((sum, item) => sum + (item.weight || 0), 0);
              const workPhasesWeight = (project.workPhases || [])
                .filter(phase => phase.completed)
                .reduce((sum, phase) => sum + (phase.weight || 0), 0);
              const totalCompletedWeight = checklistWeight + workPhasesWeight;
              
              const checklistTotalWeight = (project.checklist || []).reduce((sum, item) => sum + (item.weight || 0), 0);
              const workPhasesTotalWeight = (project.workPhases || []).reduce((sum, phase) => sum + (phase.weight || 0), 0);
              const totalWeight = checklistTotalWeight + workPhasesTotalWeight;
              
              const realTimeCompletion = totalWeight > 0 ? 
                (totalCompletedWeight === totalWeight ? 100 : Math.round((totalCompletedWeight / totalWeight) * 100)) : 0;
              
              console.log(`REAL-TIME COMPLETION DEBUG: ${project.name}`, {
                storedCompletion: project.completionPercentage,
                realTimeCompletion,
                checklistWeight,
                workPhasesWeight,
                totalCompletedWeight,
                totalWeight,
                checklistCompleted: (project.checklist || []).filter(item => item.completed).length,
                workPhasesCompleted: (project.workPhases || []).filter(phase => phase.completed).length
              });
              
              return <span className="font-medium">{realTimeCompletion}%</span>;
            })()}
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            {(() => {
              // Use real-time calculation for progress bar too
              const checklistWeight = (project.checklist || [])
                .filter(item => item.completed)
                .reduce((sum, item) => sum + (item.weight || 0), 0);
              const workPhasesWeight = (project.workPhases || [])
                .filter(phase => phase.completed)
                .reduce((sum, phase) => sum + (phase.weight || 0), 0);
              const totalCompletedWeight = checklistWeight + workPhasesWeight;
              
              const checklistTotalWeight = (project.checklist || []).reduce((sum, item) => sum + (item.weight || 0), 0);
              const workPhasesTotalWeight = (project.workPhases || []).reduce((sum, phase) => sum + (phase.weight || 0), 0);
              const totalWeight = checklistTotalWeight + workPhasesTotalWeight;
              
              const realTimeCompletion = totalWeight > 0 ? 
                (totalCompletedWeight === totalWeight ? 100 : Math.round((totalCompletedWeight / totalWeight) * 100)) : 0;
              
              return (
                <div 
                  className="bg-gradient-primary h-2 rounded-full transition-smooth" 
                  style={{ width: `${realTimeCompletion}%` }}
                />
              );
            })()}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDaysRemaining(calculateRemainingTime(project).workersRemainingDays)}
          </div>
        </div>

        {/* Weather Display */}
        {(() => {
          const shouldShowWeather = !!(project.bygg_start_vecka || project.constructionStartWeek);
          console.log(`WEATHER RENDER DEBUG: Project ${project.name}`, {
            bygg_start_vecka: project.bygg_start_vecka,
            constructionStartWeek: project.constructionStartWeek,
            shouldShowWeather,
            address: project.address
          });
          
          return shouldShowWeather && (
            <WeatherDisplay 
              address={project.address}
              startWeek={project.bygg_start_vecka || project.constructionStartWeek}
              compact={true}
              className="border border-border/50 rounded-lg p-3 bg-muted/30"
            />
          );
        })()}

        {/* Assignment Status - Show trailer and team assignments */}
        {onUpdateProject && (
          <div className="space-y-2">
            {(project.assignedTrailer || project.constructionTeam) && (
              <div className="grid grid-cols-1 gap-2 text-xs">
                {/* Show assigned trailer */}
                {project.assignedTrailer && (
                  <div className="flex items-center gap-2 p-2 bg-accent/20 rounded border">
                    <Truck className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Släpvagn:</span>
                    <span className="font-medium text-card-foreground">
                      {trailers.find(t => t.id === project.assignedTrailer)?.name || project.assignedTrailer}
                    </span>
                    <Badge variant="secondary" className="text-xs bg-success/20 text-success border-success/30">
                      Tilldelad
                    </Badge>
                  </div>
                )}

                {/* Show assigned team */}
                {project.constructionTeam && (
                  <div className="flex items-center gap-2 p-2 bg-accent/20 rounded border">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Team:</span>
                    <span className="font-medium text-card-foreground">
                      {project.constructionTeam}
                    </span>
                    <Badge variant="secondary" className="text-xs bg-success/20 text-success border-success/30">
                      Schemalagt
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Avvarat Material Status */}
        {project.avvaratMaterial?.hasLeftoverMaterial === true && (
          <div className="flex items-center gap-2 p-2 bg-warning/10 rounded border border-warning/20">
            <div className="w-2 h-2 bg-warning rounded-full" />
            <span className="text-sm font-medium text-warning">Avvarat material: Ja</span>
            {project.avvaratMaterial.materials && project.avvaratMaterial.materials.length > 0 && (
              <span className="text-xs text-muted-foreground">
                ({project.avvaratMaterial.materials.map(m => 
                  `${m.materialType === 'Annat' ? m.customMaterialType : m.materialType}: ${m.squareMeters}m²`
                ).join(', ')})
              </span>
            )}
          </div>
        )}
        
        {project.avvaratMaterial?.hasLeftoverMaterial === false && (
          <div className="flex items-center gap-2 p-2 bg-success/10 rounded border border-success/20">
            <div className="w-2 h-2 bg-success rounded-full" />
            <span className="text-sm font-medium text-success">Avvarat material: Nej</span>
          </div>
        )}

        {project.notes && (
          <div className="flex gap-2 text-sm text-muted-foreground">
            <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p className="line-clamp-2">{project.notes}</p>
          </div>
        )}

        {/* Work Phases Section */}
        {onUpdateProject && (
          <TooltipProvider>
            <WorkPhasesSection 
              project={project}
              onUpdateProject={onUpdateProject}
              onOpenDetails={() => onViewDetails(project)}
              teams={teams}
              trailers={trailers}
              onUpdateTeam={onUpdateTeam}
              onUpdateTrailer={onUpdateTrailer}
              onAddNotifications={onAddNotifications}
            />
          </TooltipProvider>
        )}

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(project);
            }}
          >
            Visa detaljer
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportReport}
            className="flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            📄
          </Button>
          {isAdmin && onDeleteProject && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Radera projekt</AlertDialogTitle>
                  <AlertDialogDescription>
                    Är du säker på att du vill radera <strong>{project.name}</strong>? Denna åtgärd kan inte ångras och all projektdata kommer att försvinna permanent.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteProject(project.id);
                    }}
                  >
                    Radera permanent
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}