import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ProjectChecklist } from './ProjectChecklist';
import { ActivityLogView } from './ActivityLogView';
import { AddProjectModal } from './AddProjectModal';
import { Project, ActivityLogEntry } from '@/types/project';
import { 
  CalendarDays, 
  MapPin, 
  Phone, 
  User, 
  Users, 
  FileText, 
  Edit,
  ExternalLink,
  Download,
  Calendar,
  ScrollText,
  Copy,
  Camera,
  CheckCircle,
  AlertTriangle,
  Mail,
  MessageCircle,
  RefreshCw
} from 'lucide-react';
import { downloadProjectReport } from '@/utils/pdfGenerator';
import { useToast } from '@/hooks/use-toast';
import { calculateDeadlineFromWorkDays } from '@/utils/weekCalculations';
import { calculateRemainingTime, formatDaysRemaining } from '@/utils/timeCalculations';

interface ProjectDetailModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProject: (updatedProject: Project) => void;
  trailers?: any[];
  teams?: any[];
  onUpdateTrailer?: (trailer: any) => void;
  projects?: Project[]; // Add projects array to get fresh data
  onFileUploaded?: (file: { name: string; url: string; type: 'warranty'; projectId: string; uploadedBy: string; description?: string; tags: string[] }) => void;
}

export function ProjectDetailModal({ 
  project, 
  isOpen, 
  onClose, 
  onUpdateProject,
  trailers = [],
  teams = [],
  onUpdateTrailer,
  projects = [],
  onFileUploaded
}: ProjectDetailModalProps) {
  const { toast } = useToast();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [copiedPhases, setCopiedPhases] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  if (!project) return null;

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'planned': return 'planned';
      case 'ongoing': return 'ongoing';
      case 'completed': return 'completed';
      case 'invoiced': return 'invoiced';
      default: return 'default';
    }
  };

  const createActivityLogEntry = (
    action: string,
    description: string,
    category: ActivityLogEntry['category'],
    oldValue?: string,
    newValue?: string
  ): ActivityLogEntry => ({
    id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    user: 'Aktuell Användare', // TODO: Replace with actual user
    action,
    description,
    category,
    oldValue,
    newValue,
  });

  const handleChecklistUpdate = (updatedChecklist: any[]) => {
    // Calculate combined weighted completion percentage
    const checklistWeight = updatedChecklist
      .filter(item => item.completed)
      .reduce((sum, item) => sum + (item.weight || 0), 0);
    const workPhasesWeight = (project?.workPhases || [])
      .filter(phase => phase.completed)
      .reduce((sum, phase) => sum + (phase.weight || 0), 0);
    const totalCompletedWeight = checklistWeight + workPhasesWeight;
    
    const checklistTotalWeight = updatedChecklist.reduce((sum, item) => sum + (item.weight || 0), 0);
    const workPhasesTotalWeight = (project?.workPhases || []).reduce((sum, phase) => sum + (phase.weight || 0), 0);
    const totalWeight = checklistTotalWeight + workPhasesTotalWeight;
    
    const completionPercentage = totalWeight > 0 ? 
      (totalCompletedWeight === totalWeight ? 100 : Math.round((totalCompletedWeight / totalWeight) * 100)) : 0;

    // Find differences for activity log
    const activityEntries: ActivityLogEntry[] = [];
    updatedChecklist.forEach((newItem, index) => {
      const oldItem = project.checklist[index];
      if (oldItem && oldItem.completed !== newItem.completed) {
        activityEntries.push(createActivityLogEntry(
          newItem.completed ? 'Checklistepunkt markerad som klar' : 'Checklistepunkt markerad som ej klar',
          `"${newItem.label}" ${newItem.completed ? 'slutförd' : 'återställd'}`,
          'checklist',
          oldItem.completed ? 'Klar' : 'Ej klar',
          newItem.completed ? 'Klar' : 'Ej klar'
        ));
      }
    });
    
    const updatedProject = {
      ...project,
      checklist: updatedChecklist,
      completionPercentage,
      activityLog: [...(project.activityLog || []), ...activityEntries],
    };
    
    onUpdateProject(updatedProject);
  };

  const handleAddActivityLogEntry = (entryData: Omit<ActivityLogEntry, 'id' | 'timestamp'>) => {
    const newEntry = createActivityLogEntry(
      entryData.action,
      entryData.description,
      entryData.category,
      entryData.oldValue,
      entryData.newValue
    );

    const updatedProject = {
      ...project,
      activityLog: [...(project.activityLog || []), newEntry],
    };

    onUpdateProject(updatedProject);
  };

  const handleExportReport = async () => {
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

  const handleImagesReceived = (phaseId: string) => {
    const updatedPhases = project.workPhases?.map(phase => {
      if (phase.id === phaseId) {
        return {
          ...phase,
          imagesReceived: true,
          inspectionConfirmed: phase.completed && true
        };
      }
      return phase;
    });

    const updatedProject = {
      ...project,
      workPhases: updatedPhases,
      activityLog: [
        ...(project.activityLog || []),
        createActivityLogEntry(
          'Bilder mottagna',
          `Projektledaren bekräftade bilder för "${project.workPhases?.find(p => p.id === phaseId)?.label}"`,
          'workphase'
        )
      ]
    };

    onUpdateProject(updatedProject);
    
    toast({
      title: "Bilder bekräftade",
      description: "Arbetsmoment kan nu markeras som klart",
    });
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
          <Camera className="w-3 h-3 text-warning" />
        </TooltipTrigger>
        <TooltipContent>Väntar på bilder</TooltipContent>
      </Tooltip>
    );
  };

  const handleRefreshProject = async () => {
    if (project && projects.length > 0) {
      setIsRefreshing(true);
      setRefreshSuccess(false);
      
      // Simulate a brief delay for loading effect
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const freshProject = projects.find(p => p.id === project.id);
      if (freshProject) {
        onUpdateProject(freshProject);
        setRefreshSuccess(true);
        
        toast({
          title: "Projekt uppdaterat",
          description: "Projektinformation har hämtats från den senaste datan",
        });
        
        // Reset success state after 2 seconds
        setTimeout(() => {
          setRefreshSuccess(false);
        }, 2000);
      }
      
      setIsRefreshing(false);
    }
  };

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <DialogTitle className="text-2xl font-bold">
                  {project.name}
                </DialogTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRefreshProject}
                      disabled={isRefreshing}
                      className={`h-8 w-8 p-0 transition-all duration-300 ${
                        refreshSuccess 
                          ? 'text-green-600 hover:text-green-700' 
                          : 'hover:bg-accent'
                      }`}
                    >
                      <RefreshCw className={`w-4 h-4 transition-transform duration-500 ${
                        isRefreshing ? 'animate-spin' : ''
                      } ${
                        refreshSuccess ? 'text-green-600' : ''
                      }`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {refreshSuccess ? 'Uppdaterat!' : 'Uppdatera projektdata'}
                  </TooltipContent>
                </Tooltip>
              </div>
              <DialogDescription className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{project.address}</span>
              </DialogDescription>
            </div>
            <div className="flex flex-col gap-2">
              <Badge variant={getStatusVariant(project.status)}>
                {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
              </Badge>
              {project.rotStatus === 'Yes' && (
                <Badge variant="rot">ROT</Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Översikt</TabsTrigger>
            <TabsTrigger value="checklist">Checklista</TabsTrigger>
            <TabsTrigger value="workphases">Arbetsmoment</TabsTrigger>
            <TabsTrigger value="files">Filer</TabsTrigger>
            <TabsTrigger value="activity">Aktivitetslogg</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Project Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Projektdetaljer</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{project.customerName}</p>
                      <p className="text-sm text-muted-foreground">Kund</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{project.customerPhone}</p>
                      <p className="text-sm text-muted-foreground">Telefon</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{project.constructionTeam}</p>
                      <p className="text-sm text-muted-foreground">Byggteam</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Tidslinje & Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {project.actualConstructionStart 
                          ? new Date(project.actualConstructionStart).toLocaleDateString('sv-SE')
                          : `${project.constructionStartWeek || ''} (Planerad)`
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {project.actualConstructionStart ? 'Faktisk byggstart' : 'Planerad byggstart'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <CalendarDays className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {project.actualConstructionStart 
                          ? new Date(calculateDeadlineFromWorkDays(project.actualConstructionStart, project.estimatedWorkDays || 7)).toLocaleDateString('sv-SE')
                          : new Date(project.deadline).toLocaleDateString('sv-SE')
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {project.actualConstructionStart ? 'Beräknad deadline' : 'Planerad deadline'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{project.responsibleSeller}</p>
                      <p className="text-sm text-muted-foreground">Ansvarig säljare</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Overview */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Projektframsteg</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Övergripande slutförande</span>
                  <span className="font-medium">{project.completionPercentage}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-4">
                  <div 
                    className="bg-gradient-primary h-4 rounded-full transition-smooth" 
                    style={{ width: `${project.completionPercentage}%` }}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDaysRemaining(calculateRemainingTime(project).workersRemainingDays)}
                </div>
              </div>
            </div>

            {/* Notes */}
            {project.notes && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Anteckningar</h3>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm">{project.notes}</p>
                </div>
              </div>
            )}

            {/* Avvarat Material now handled in checklist */}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)}>
                <Edit className="w-4 h-4" />
                Redigera projekt
              </Button>
              <Button variant="outline" size="sm">
                <ExternalLink className="w-4 h-4" />
                Visa plats
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportReport}>
                <Download className="w-4 h-4" />
                📄 Exportera projektrapport
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="checklist">
            <ProjectChecklist 
              checklist={project.checklist}
              onChecklistUpdate={handleChecklistUpdate}
              startDate={project.startDate}
              project={project}
              trailers={trailers}
              teams={teams}
              onUpdateProject={onUpdateProject}
              onUpdateTrailer={onUpdateTrailer}
              onFileUploaded={onFileUploaded}
            />
          </TabsContent>

          <TabsContent value="workphases">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Arbetsmoment</h3>
                <Badge variant="secondary">
                  {project.workPhases?.filter(p => p.completed).length || 0} av {project.workPhases?.length || 0} klara
                </Badge>
              </div>
              
              <div className="space-y-3">
                {(project.workPhases || []).map((phase, index) => (
                  <div 
                    key={phase.id}
                    className={`p-4 rounded-lg border transition-smooth ${
                      phase.completed 
                        ? 'bg-success/5 border-success/20' 
                        : 'bg-card border-border'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        id={`modal-${phase.id}`}
                        checked={phase.completed}
                        onCheckedChange={() => {
                          const updatedPhases = project.workPhases?.map(p => {
                            if (p.id === phase.id) {
                              return {
                                ...p,
                                completed: !p.completed,
                                completedAt: !p.completed ? new Date().toISOString().split('T')[0] : undefined,
                              };
                            }
                            return p;
                          });
                          
                          // Calculate combined weighted completion percentage
                          const checklistWeight = (project.checklist || [])
                            .filter(item => item.completed)
                            .reduce((sum, item) => sum + (item.weight || 0), 0);
                          const workPhasesWeight = updatedPhases
                            ?.filter(p => p.completed)
                            .reduce((sum, p) => sum + (p.weight || 0), 0) || 0;
                          const totalCompletedWeight = checklistWeight + workPhasesWeight;
                          
                          const checklistTotalWeight = (project.checklist || []).reduce((sum, item) => sum + (item.weight || 0), 0);
                          const workPhasesTotalWeight = updatedPhases
                            ?.reduce((sum, p) => sum + (p.weight || 0), 0) || 1;
                          const totalWeight = checklistTotalWeight + workPhasesTotalWeight;
                          
                          const newCompletionPercentage = totalWeight > 0 ? 
                            (totalCompletedWeight === totalWeight ? 100 : Math.round((totalCompletedWeight / totalWeight) * 100)) : 0;
                          
                          // Check if all work phases are completed (100%)
                          const allWorkPhasesCompleted = newCompletionPercentage === 100;
                          
                          // Check if all checklist items are completed
                          const allItemsCompleted = newCompletionPercentage === 100;
                          
                          // Check if this is the first work phase being completed and status is planned
                          const completedWorkPhases = updatedPhases?.filter(p => p.completed).length || 0;
                          const wasFirstPhaseCompleted = completedWorkPhases === 1 && project.status === 'planned';
                          
                          // Create activity log entry
                          const activityEntry = createActivityLogEntry(
                            !phase.completed ? 'Arbetsmoment markerat som klart' : 'Arbetsmoment markerat som ej klart',
                            `"${phase.label}" ${!phase.completed ? 'slutfört' : 'återställt'}`,
                            'workphase',
                            phase.completed ? 'Klart' : 'Ej klart',
                            !phase.completed ? 'Klart' : 'Ej klart'
                          );

                          // Auto-complete project if both work phases and checklist are done
                          let updatedProject = {
                            ...project,
                            workPhases: updatedPhases,
                            completionPercentage: newCompletionPercentage,
                            activityLog: [...(project.activityLog || []), activityEntry],
                          };

                          // Change status from planned to ongoing when first work phase is completed
                          if (wasFirstPhaseCompleted) {
                            const statusEntry = createActivityLogEntry(
                              'Projektstatus ändrad',
                              'Projekt övergick från planerad till pågående',
                              'status',
                              'Planerad',
                              'Pågående'
                            );
                            updatedProject = {
                              ...updatedProject,
                              status: 'ongoing' as const,
                              activityLog: [...updatedProject.activityLog, statusEntry],
                            };
                          }
                          // Auto-complete project if both work phases and checklist are done
                          else if (allItemsCompleted && project.status !== 'completed') {
                            const statusEntry = createActivityLogEntry(
                              'Projekt slutfört',
                              'Alla arbetsmoment och checklistepunkter är klara',
                              'status',
                              project.status.charAt(0).toUpperCase() + project.status.slice(1),
                              'Slutfört'
                            );
                            updatedProject = {
                              ...updatedProject,
                              status: 'completed' as const,
                              activityLog: [...updatedProject.activityLog, statusEntry],
                            };
                          }
                          
                          onUpdateProject(updatedProject);
                        }}
                        className="data-[state=checked]:bg-success data-[state=checked]:border-success mt-1"
                      />
                      
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <label 
                            htmlFor={`modal-${phase.id}`}
                            className={`text-sm font-medium cursor-pointer ${
                              phase.completed 
                                ? 'text-success line-through' 
                                : 'text-card-foreground'
                            }`}
                          >
                            {index + 1}. {phase.label}
                          </label>
                          <div className="flex items-center gap-2">
                            {/* Status icon */}
                            {phase.requiresDailyInspection && getPhaseStatusIcon(phase)}
                            
                            {phase.completedAt && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                <span>{new Date(phase.completedAt).toLocaleDateString('sv-SE')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Action buttons for inspection phases */}
                        {phase.requiresDailyInspection && (
                          <div className="flex gap-2">
                            {/* Copy reminder button or WhatsApp button for ongoing phases */}
                            {!phase.completed && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant={copiedPhases.has(phase.id) ? "default" : "outline"}
                                    size="sm"
                                    className={`h-8 px-3 text-xs gap-2 flex-1 transition-all ${
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
                            
                            {/* Images received button for completed phases */}
                            {phase.completed && !phase.imagesReceived && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-3 text-xs gap-2 border-success text-success hover:bg-success/10 flex-1"
                                    onClick={() => handleImagesReceived(phase.id)}
                                  >
                                    <Camera className="h-3 w-3" />
                                    Markera bilder mottagna
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Bekräfta att bilder har mottagits från arbetare</TooltipContent>
                              </Tooltip>
                            )}
                            
                            {/* Show confirmation when all is done */}
                            {phase.completed && phase.imagesReceived && (
                              <div className="flex items-center gap-2 text-success text-xs px-3 py-2 bg-success/10 rounded flex-1 justify-center">
                                <CheckCircle className="h-3 w-3" />
                                Klart och egenkontroller bekräftat
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="files" className="space-y-4">
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Filhantering</h3>
              <p className="text-muted-foreground">
                Filuppladdning och hanteringsfunktionalitet kommer att finnas tillgänglig här.
              </p>
              <Button variant="outline" className="mt-4">
                Ladda upp filer
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="activity">
            <ActivityLogView 
              activityLog={project.activityLog || []}
              onAddEntry={handleAddActivityLogEntry}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
      
      {/* Edit Project Modal */}
      <AddProjectModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onAddProject={() => {}} // Not used for editing
        project={project}
        teams={teams}
        onUpdateProject={(updatedProject) => {
          onUpdateProject(updatedProject);
          setIsEditModalOpen(false);
        }}
      />
    </Dialog>
    </TooltipProvider>
  );
}