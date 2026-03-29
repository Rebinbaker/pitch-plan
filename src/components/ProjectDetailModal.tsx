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

  const formatDisplayDate = (dateValue?: string): string => {
    if (!dateValue) return '-';
    const parsed = new Date(dateValue);
    return Number.isNaN(parsed.getTime()) ? dateValue : parsed.toLocaleDateString('sv-SE');
  };

  const plannedWeek = project.bygg_start_vecka || project.constructionStartWeek || '';
  const plannedStartDate = project.planerad_start_datum || project.startDate;
  const projectedDeadline = project.beräknat_slut_datum || project.deadline;

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'planned': return 'planned';
      case 'ongoing': return 'ongoing';
      case 'completed': return 'completed';
      case 'invoiced': return 'invoiced';
      case 'ånger': return 'destructive' as const;
      default: return 'default';
    }
  };
...
                  <div className="flex items-center gap-3">
                    <CalendarDays className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {project.actualConstructionStart
                          ? formatDisplayDate(project.actualConstructionStart)
                          : `${plannedWeek || '-'} (${formatDisplayDate(plannedStartDate)})`
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
                        {formatDisplayDate(projectedDeadline)}
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
              allProjects={projects} // Pass all projects for Linköping inventory
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