import { useState } from 'react';
import * as React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Project, ActivityLogEntry } from '@/types/project';
import { Hammer, Calendar, ChevronDown, ChevronUp, Camera, Mail, CheckCircle, AlertTriangle, Copy, MessageCircle } from 'lucide-react';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { checkProjectTimelineNotifications } from '@/utils/projectNotifications';

const createActivityLogEntry = (
  action: string,
  description: string,
  category: ActivityLogEntry['category'],
  oldValue?: string,
  newValue?: string
): ActivityLogEntry => ({
  id: Math.random().toString(36).substr(2, 9),
  timestamp: new Date().toISOString(),
  user: 'Aktuell Användare',
  action,
  description,
  category,
  oldValue,
  newValue,
});

interface WorkPhasesSectionProps {
  project: Project;
  onUpdateProject: (project: Project) => void;
  onOpenDetails?: () => void;
  teams?: any[];
  trailers?: any[];
  onUpdateTeam?: (team: any) => void;
  onUpdateTrailer?: (trailer: any) => void;
  onAddNotifications?: (notifications: any[]) => void;
}

export function WorkPhasesSection({ project, onUpdateProject, onOpenDetails, teams = [], trailers = [], onUpdateTeam, onUpdateTrailer, onAddNotifications }: WorkPhasesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedPhases, setCopiedPhases] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const workPhases = project.workPhases || [];
  const completedPhases = workPhases.filter(phase => phase.completed).length;
  const totalPhases = workPhases.length;
  const completionPercentage = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;

  // Debug logging
  console.log('WORKPHASES RENDER: Project:', project.name);
  console.log('WORKPHASES RENDER: workPhases:', workPhases.map(p => ({ 
    label: p.label, 
    requiresDailyInspection: p.requiresDailyInspection,
    type: typeof p.requiresDailyInspection
  })));
  console.log('WORKPHASES RENDER: Will show buttons for phases:', workPhases.filter(p => p.requiresDailyInspection).length);

  // Check if resources need status update on component mount
  React.useEffect(() => {
    if (!onUpdateTeam || !onUpdateTrailer) return;
    
    const hasCompletedPhases = completedPhases > 0;
    const allPhasesCompleted = completionPercentage === 100;
    
    // Set resources as "I bruk/Busy" if project has started but not completed
    if (hasCompletedPhases && !allPhasesCompleted && project.status === 'ongoing') {
      // Check and update team status
      if (project.constructionTeam) {
        const assignedTeam = teams.find(team => team.name === project.constructionTeam);
        if (assignedTeam && assignedTeam.availabilityNextWeek === 'Available') {
          onUpdateTeam({
            ...assignedTeam,
            availabilityNextWeek: 'Busy',
            currentJob: project.name
          });
        }
      }
      
      // Check and update trailer status
      if (project.assignedTrailer) {
        const assignedTrailer = trailers.find(trailer => trailer.id === project.assignedTrailer);
        if (assignedTrailer && assignedTrailer.status === 'Tillgänglig') {
          onUpdateTrailer({
            ...assignedTrailer,
            status: 'I bruk',
            assignedProject: project.name,
            location: project.address
          });
        }
      }
    }
    
    // Set resources as "Available/Tillgänglig" if all phases completed
    if (allPhasesCompleted && project.status === 'completed') {
      if (project.constructionTeam) {
        const assignedTeam = teams.find(team => team.name === project.constructionTeam);
        if (assignedTeam && assignedTeam.availabilityNextWeek !== 'Available') {
          onUpdateTeam({
            ...assignedTeam,
            availabilityNextWeek: 'Available',
            currentJob: 'Planning phase'
          });
        }
      }
      
      if (project.assignedTrailer) {
        const assignedTrailer = trailers.find(trailer => trailer.id === project.assignedTrailer);
        if (assignedTrailer && assignedTrailer.status !== 'Tillgänglig') {
          onUpdateTrailer({
            ...assignedTrailer,
            status: 'Tillgänglig',
            assignedProject: undefined,
            location: 'Lundavägen 20'
          });
        }
      }
    }
  }, [project.id, completedPhases, completionPercentage, project.status, project.constructionTeam, project.assignedTrailer]);

  const handleImagesReceived = (phaseId: string) => {
    const updatedPhases = workPhases.map(phase => {
      if (phase.id === phaseId) {
        const updatedPhase = {
          ...phase,
          imagesReceived: true,
          inspectionConfirmed: phase.completed && true // Only confirmed if already completed
        };
        return updatedPhase;
      }
      return phase;
    });

    // Check if all work phases requiring daily inspection are now confirmed
    const allInspectionPhasesConfirmed = updatedPhases
      .filter(phase => phase.requiresDailyInspection)
      .every(phase => phase.completed && phase.inspectionConfirmed);

    // Auto-complete "Dagliga egenkontroller" checklist item if all inspections are confirmed
    let updatedChecklist = project.checklist;
    if (allInspectionPhasesConfirmed) {
      updatedChecklist = project.checklist?.map(item => 
        item.label === 'Dagliga egenkontroller' 
          ? { ...item, completed: true, completedAt: new Date().toISOString().split('T')[0] }
          : item
      ) || [];
    }

    const updatedProject = {
      ...project,
      workPhases: updatedPhases,
      checklist: updatedChecklist,
      activityLog: [
        ...(project.activityLog || []),
        createActivityLogEntry(
          'Bilder mottagna',
          `Projektledaren bekräftade bilder för "${workPhases.find(p => p.id === phaseId)?.label}"`,
          'workphase'
        ),
        ...(allInspectionPhasesConfirmed ? [createActivityLogEntry(
          'Dagliga egenkontroller slutförda',
          'Alla arbetsmoment med dagliga egenkontroller är bekräftade',
          'checklist'
        )] : [])
      ]
    };

    onUpdateProject(updatedProject);
    
    toast({
      title: "Bilder bekräftade",
      description: allInspectionPhasesConfirmed 
        ? "Alla egenkontroller bekräftade! Dagliga egenkontroller är nu klara."
        : "Arbetsmoment kan nu markeras som klart",
    });
  };

  const copyReminderText = async (phaseLabel: string, phaseId: string) => {
    const reminderText = `🏗️ Daglig egenkontroll - ${project.name}
📍 ${project.address}

Pågående: ${phaseLabel}

⚠️ VIKTIGT: Skicka minst 20 bilder idag!
📸 Fotografera arbetsområdet, säkerhet och kvalitet
📱 Skicka bilderna direkt till projektledaren

Tack! 👷‍♂️`;

    try {
      await navigator.clipboard.writeText(reminderText);
      setCopiedPhases(prev => new Set([...prev, phaseId]));
      
      toast({
        title: "Kopierat!",
        description: "Påminnelsetexten har kopierats till urklipp",
        duration: 2000,
      });
      
      // Reset button after 3 seconds
      setTimeout(() => {
        setCopiedPhases(prev => {
          const newSet = new Set(prev);
          newSet.delete(phaseId);
          return newSet;
        });
      }, 3000);
    } catch (err) {
      toast({
        title: "Fel",
        description: "Kunde inte kopiera till urklipp",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  const openWhatsApp = (phaseLabel: string) => {
    const reminderText = `🏗️ Daglig egenkontroll - ${project.name}
📍 ${project.address}

Pågående: ${phaseLabel}

⚠️ VIKTIGT: Skicka minst 20 bilder idag!
📸 Fotografera arbetsområdet, säkerhet och kvalitet
📱 Skicka bilderna direkt till projektledaren

Tack! 👷‍♂️`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(reminderText)}`;
    window.open(whatsappUrl, '_blank');
  };

  const getPhaseStatusIcon = (phase: any) => {
    if (!phase.requiresDailyInspection) return null;
    
    if (phase.completed && phase.inspectionConfirmed) {
      return (
        <Tooltip>
          <TooltipTrigger>
            <CheckCircle className="w-3 h-3 text-success" />
          </TooltipTrigger>
          <TooltipContent>Klart och bekräftat</TooltipContent>
        </Tooltip>
      );
    }
    
    if (phase.completed && !phase.imagesReceived) {
      return (
        <Tooltip>
          <TooltipTrigger>
            <AlertTriangle className="w-3 h-3 text-destructive" />
          </TooltipTrigger>
          <TooltipContent>Klart men saknar bildbekräftelse</TooltipContent>
        </Tooltip>
      );
    }
    
    if (!phase.completed && phase.imagesReceived) {
      return (
        <Tooltip>
          <TooltipTrigger>
            <CheckCircle className="w-3 h-3 text-success" />
          </TooltipTrigger>
          <TooltipContent>Bilder mottagna</TooltipContent>
        </Tooltip>
      );
    }
    
    if (phase.lastReminderSent) {
      return (
        <Tooltip>
          <TooltipTrigger>
            <Mail className="w-3 h-3 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>Påminnelse skickad</TooltipContent>
        </Tooltip>
      );
    }
    
    return (
      <Tooltip>
        <TooltipTrigger>
          <AlertTriangle className="w-3 h-3 text-warning" />
        </TooltipTrigger>
        <TooltipContent>Bilder inte mottagna</TooltipContent>
      </Tooltip>
    );
  };

  const handlePhaseToggle = (phaseId: string) => {
    console.log('=== handlePhaseToggle called ===');
    console.log('Phase ID:', phaseId);
    console.log('Project ID:', project.id);
    console.log('Current project status:', project.status);
    console.log('WorkPhases length:', workPhases.length);
    console.log('Project workPhases length:', project.workPhases?.length);
    const activityEntries: ActivityLogEntry[] = [];
    
    const updatedPhases = project.workPhases?.map(phase => {
      if (phase.id === phaseId) {
        const wasCompleted = phase.completed;
        const newPhase = {
          ...phase,
          completed: !phase.completed,
          completedAt: !phase.completed ? new Date().toISOString().split('T')[0] : undefined,
          inspectionConfirmed: !phase.completed && phase.requiresDailyInspection 
            ? (phase.imagesReceived || false) // Set confirmed only if images already received
            : (!phase.completed ? false : phase.inspectionConfirmed), // Reset if unchecking
        };
        
        // Log the work phase change
        activityEntries.push(createActivityLogEntry(
          newPhase.completed ? 'Arbetsmoment markerat som klart' : 'Arbetsmoment markerat som ej klart',
          `"${newPhase.label}" ${newPhase.completed ? 'slutfört' : 'återställt'}`,
          'workphase',
          wasCompleted ? 'Klart' : 'Ej klart',
          newPhase.completed ? 'Klart' : 'Ej klart'
        ));
        
        return newPhase;
      }
      return phase;
    });

    // Calculate new completion percentage based on completed work phases
    const completedWorkPhases = updatedPhases.filter(phase => phase.completed).length;
    const newCompletionPercentage = Math.round((completedWorkPhases / updatedPhases.length) * 100);

    // Check if all work phases are completed (100%)
    const allWorkPhasesCompleted = newCompletionPercentage === 100;
    
    // Check if all checklist items are completed
    const allChecklistCompleted = project.checklist?.every(item => item.completed) || false;
    
    // Check if this is the first work phase being completed and status is planned
    const wasFirstPhaseCompleted = completedWorkPhases === 1 && project.status === 'planned';
    
    // Auto-complete project if both work phases and checklist are done
    let updatedProject = {
      ...project,
      workPhases: updatedPhases,
      completionPercentage: newCompletionPercentage,
    };
    
    // Set actualConstructionStart when first work phase is completed
    if (wasFirstPhaseCompleted && !updatedProject.actualConstructionStart) {
      const firstPhase = updatedPhases.find(phase => phase.completed);
      if (firstPhase?.completedAt) {
        console.log('Setting actualConstructionStart to:', firstPhase.completedAt);
        updatedProject = {
          ...updatedProject,
          actualConstructionStart: firstPhase.completedAt,
        };
      }
      }
      
      // Check for late start notification
      const projectNotification = checkProjectTimelineNotifications(updatedProject);
      if (projectNotification && projectNotification.type === 'late_start') {
        // Create a notification for late start  
        const lateStartNotification = {
          id: `late-start-${updatedProject.id}-${Date.now()}`,
          type: 'deadline_warning' as const,
          priority: 'high' as const,
          title: 'Försenad projektstart',
          message: `${projectNotification.message} Brådskande: Kontrollera materialbeställningar och tidplan.`,
          projectId: updatedProject.id,
          projectName: updatedProject.name,
          createdAt: new Date().toISOString(),
          isRead: false,
          actionRequired: true
        };
        
        // Store notification in localStorage for the notification system to pick up
        const existingNotifications = JSON.parse(localStorage.getItem('lovable_notifications') || '[]');
        
        // Check if we already have a late start notification for this project
        const hasExistingLateStartNotification = existingNotifications.some((n: any) => 
          n.projectId === updatedProject.id && n.title === 'Försenad projektstart'
        );
        
        if (!hasExistingLateStartNotification) {
          // Add notification using React state if available
          if (onAddNotifications) {
            onAddNotifications([lateStartNotification]);
          } else {
            // Fallback to localStorage
            const updatedNotifications = [...existingNotifications, lateStartNotification];
            localStorage.setItem('lovable_notifications', JSON.stringify(updatedNotifications));
          }
          
          // Show toast notification
          toast({
            title: "Försenad projektstart upptäckt",
            description: `Projekt "${updatedProject.name}" startade ${projectNotification.daysLate} dag${projectNotification.daysLate > 1 ? 'ar' : ''} senare än planerat.`,
            variant: "destructive",
          });
        }
      }
    
    // Mark resources as "I bruk" when project starts (first work phase completed)
    if (wasFirstPhaseCompleted && onUpdateTeam && onUpdateTrailer) {
      // Mark assigned team as busy
      if (project.constructionTeam) {
        const assignedTeam = teams.find(team => team.name === project.constructionTeam);
        if (assignedTeam && assignedTeam.availabilityNextWeek === 'Available') {
          onUpdateTeam({
            ...assignedTeam,
            availabilityNextWeek: 'Busy',
            currentJob: project.name
          });
        }
      }
      
      // Mark assigned trailer as "I bruk"
      if (project.assignedTrailer) {
        const assignedTrailer = trailers.find(trailer => trailer.id === project.assignedTrailer);
        if (assignedTrailer && assignedTrailer.status === 'Tillgänglig') {
          onUpdateTrailer({
            ...assignedTrailer,
            status: 'I bruk',
            assignedProject: project.name,
            location: project.address
          });
        }
      }
    }

    // Change status from planned to ongoing when first work phase is completed
    if (wasFirstPhaseCompleted) {
      activityEntries.push(createActivityLogEntry(
        'Projektstatus ändrad',
        'Projekt startad - första arbetsmoment slutfört',
        'status',
        'Planerat',
        'Pågående'
      ));
      
      updatedProject = {
        ...updatedProject,
        status: 'ongoing' as const,
      };
    }
    // Auto-complete project if both work phases and checklist are done
    else if (allWorkPhasesCompleted && allChecklistCompleted && project.status !== 'completed') {
      activityEntries.push(createActivityLogEntry(
        'Projektstatus ändrad',
        'Projekt slutfört - alla arbetsmoment och checklistepunkter klara',
        'status',
        project.status.charAt(0).toUpperCase() + project.status.slice(1),
        'Slutfört'
      ));
      
      updatedProject = {
        ...updatedProject,
        status: 'completed' as const,
      };
    }
    
    // Free up resources ONLY when all work phases are completed (100%)
    if (allWorkPhasesCompleted && onUpdateTeam && onUpdateTrailer) {
      // Mark assigned team as available
      if (project.constructionTeam) {
        const assignedTeam = teams.find(team => team.name === project.constructionTeam);
        if (assignedTeam && assignedTeam.availabilityNextWeek !== 'Available') {
          onUpdateTeam({
            ...assignedTeam,
            availabilityNextWeek: 'Available',
            currentJob: 'Planning phase'
          });
        }
      }
      
      // Mark assigned trailer as available
      if (project.assignedTrailer) {
        const assignedTrailer = trailers.find(trailer => trailer.id === project.assignedTrailer);
        if (assignedTrailer && assignedTrailer.status !== 'Tillgänglig') {
          onUpdateTrailer({
            ...assignedTrailer,
            status: 'Tillgänglig',
            assignedProject: undefined,
            location: 'Lundavägen 20',
            moverNote: undefined
          });
        }
      }
    }

    // Add activity log entries to the project
    updatedProject = {
      ...updatedProject,
      activityLog: [...(project.activityLog || []), ...activityEntries],
    };

    console.log('=== Calling onUpdateProject ===');
    console.log('Updated project:', {
      id: updatedProject.id,
      name: updatedProject.name,
      actualConstructionStart: updatedProject.actualConstructionStart,
      firstWorkPhase: updatedProject.workPhases?.[0]
    });
    onUpdateProject(updatedProject);
  };

  if (totalPhases === 0) {
    return (
      <div className="text-center py-2 text-sm text-muted-foreground">
        Inga arbetsmoment har skapats för detta projekt än.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hammer className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Arbetsmoment</span>
          <Badge variant="secondary" className="text-xs">
            {completedPhases}/{totalPhases}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{completionPercentage}%</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-secondary rounded-full h-1.5">
        <div 
          className="bg-gradient-primary h-1.5 rounded-full transition-smooth" 
          style={{ width: `${completionPercentage}%` }}
        />
      </div>

      {/* Always show first 3 work phases */}
      <div className="space-y-2">
        {workPhases.slice(0, 3).map((phase, index) => (
          <div 
            key={phase.id}
            className={`p-3 rounded-lg border ${
              phase.completed 
                ? 'bg-success/5 border-success/20' 
                : 'bg-card border-border'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Checkbox 
                id={phase.id}
                checked={phase.completed}
                onCheckedChange={() => {
                  console.log('=== CHECKBOX CLICKED ===');
                  console.log('Checkbox clicked for phase:', phase.id, phase.label);
                  console.log('Phase object:', phase);
                  console.log('Phase disabled?', phase.requiresDailyInspection && phase.completed && !phase.imagesReceived);
                  console.log('About to call handlePhaseToggle...');
                  handlePhaseToggle(phase.id);
                  console.log('handlePhaseToggle call completed');
                }}
                disabled={phase.requiresDailyInspection && phase.completed && !phase.imagesReceived}
                className="data-[state=checked]:bg-success data-[state=checked]:border-success h-4 w-4"
              />
              <label 
                htmlFor={phase.id}
                className={`flex-1 cursor-pointer text-sm font-medium ${
                  phase.completed 
                    ? 'text-success line-through' 
                    : 'text-card-foreground'
                }`}
              >
                {index + 1}. {phase.label}
              </label>
              
              {/* Status icon */}
              {phase.requiresDailyInspection && getPhaseStatusIcon(phase)}
              
              {phase.completedAt && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(phase.completedAt).toLocaleDateString('sv-SE')}</span>
                </div>
              )}
            </div>
            
            {/* Action buttons for inspection phases - only show status on front page */}
            {phase.requiresDailyInspection && (
              <div className="flex gap-2 mt-2">
                {/* Warning for completed phases without images */}
                {phase.completed && !phase.imagesReceived && (
                  <div className="flex items-center gap-2 text-warning text-xs px-3 py-1 bg-warning/10 border border-warning/20 rounded flex-1 justify-center">
                    <AlertTriangle className="h-3 w-3" />
                    Bilder inte mottagna
                  </div>
                )}
                
                {/* Show confirmation when all is done */}
                {phase.completed && phase.imagesReceived && (
                  <div className="flex items-center gap-2 text-success text-xs px-3 py-1 bg-success/10 rounded flex-1 justify-center">
                    <CheckCircle className="h-3 w-3" />
                    Klart och egenkontroller bekräftat
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Expandable detailed view for remaining phases */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <div className="space-y-2">
            {workPhases.slice(3).map((phase, index) => (
              <div 
                key={phase.id}
                className={`p-3 rounded-lg border ${
                  phase.completed 
                    ? 'bg-success/5 border-success/20' 
                    : 'bg-card border-border'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Checkbox 
                    id={phase.id}
                    checked={phase.completed}
                    onCheckedChange={() => handlePhaseToggle(phase.id)}
                    disabled={phase.requiresDailyInspection && phase.completed && !phase.imagesReceived}
                    className="data-[state=checked]:bg-success data-[state=checked]:border-success h-4 w-4"
                  />
                  <label 
                    htmlFor={phase.id}
                    className={`flex-1 cursor-pointer text-sm font-medium ${
                      phase.completed 
                        ? 'text-success line-through' 
                        : 'text-card-foreground'
                    }`}
                  >
                    {index + 4}. {phase.label}
                  </label>
                  
                  {/* Status icon */}
                  {phase.requiresDailyInspection && getPhaseStatusIcon(phase)}
                  
                  {phase.completedAt && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(phase.completedAt).toLocaleDateString('sv-SE')}</span>
                    </div>
                  )}
                </div>
                
                {/* Action buttons for inspection phases */}
                {phase.requiresDailyInspection && (
                  <div className="flex gap-2 mt-2">
                    {/* Copy reminder button or WhatsApp button for ongoing phases */}
                    {!phase.completed && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={copiedPhases.has(phase.id) ? "default" : "outline"}
                            size="sm"
                            className={`h-7 px-3 text-xs gap-2 flex-1 transition-all ${
                              copiedPhases.has(phase.id) 
                                ? "bg-green-600 hover:bg-green-700 text-white border-green-600" 
                                : ""
                            }`}
                            onClick={() => copiedPhases.has(phase.id) 
                              ? openWhatsApp(phase.label)
                              : copyReminderText(phase.label, phase.id)
                            }
                          >
                            {copiedPhases.has(phase.id) ? (
                              <>
                                <MessageCircle className="h-3 w-3" />
                                Öppna WhatsApp
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                Kopiera påminnelsetext
                              </>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {copiedPhases.has(phase.id) 
                            ? "Öppna WhatsApp för att skicka påminnelse"
                            : "Kopiera påminnelsetext för arbetare"
                          }
                        </TooltipContent>
                      </Tooltip>
                    )}
                    
                    {/* Warning for completed phases without images */}
                    {phase.completed && !phase.imagesReceived && (
                      <div className="flex items-center gap-2 text-warning text-xs px-3 py-1 bg-warning/10 border border-warning/20 rounded flex-1 justify-center">
                        <AlertTriangle className="h-3 w-3" />
                        Bilder inte mottagna
                      </div>
                    )}
                    
                    {/* Show confirmation when all is done */}
                    {phase.completed && phase.imagesReceived && (
                      <div className="flex items-center gap-2 text-success text-xs px-3 py-1 bg-success/10 rounded flex-1 justify-center">
                        <CheckCircle className="h-3 w-3" />
                        Klart och egenkontroller bekräftat
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {workPhases.length > 3 && !isExpanded && (
        <button 
          className="text-xs text-muted-foreground text-center py-1 hover:text-primary transition-colors cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetails?.();
          }}
        >
          +{workPhases.length - 3} fler moment...
        </button>
      )}
    </div>
  );
}