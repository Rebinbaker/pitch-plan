import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectChecklist } from './ProjectChecklist';
// import { AvvaratMaterialSection } from './AvvaratMaterialSection'; // Component removed
import { Project } from '@/types/project';
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
  Calendar
} from 'lucide-react';
import { downloadProjectReport } from '@/utils/pdfGenerator';
import { useToast } from '@/hooks/use-toast';

interface ProjectDetailModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProject: (updatedProject: Project) => void;
  trailers?: any[];
  teams?: any[];
}

export function ProjectDetailModal({ 
  project, 
  isOpen, 
  onClose, 
  onUpdateProject,
  trailers = [],
  teams = []
}: ProjectDetailModalProps) {
  const { toast } = useToast();

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
    
    const completionPercentage = totalWeight > 0 ? Math.round((totalCompletedWeight / totalWeight) * 100) : 0;
    
    const updatedProject = {
      ...project,
      checklist: updatedChecklist,
      completionPercentage,
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-bold">
                {project.name}
              </DialogTitle>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{project.address}</span>
              </div>
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Översikt</TabsTrigger>
            <TabsTrigger value="checklist">Checklista</TabsTrigger>
            <TabsTrigger value="workphases">Arbetsmoment</TabsTrigger>
            <TabsTrigger value="files">Filer</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Project Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Project Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{project.customerName}</p>
                      <p className="text-sm text-muted-foreground">Customer</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{project.customerPhone}</p>
                      <p className="text-sm text-muted-foreground">Phone</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{project.constructionTeam}</p>
                      <p className="text-sm text-muted-foreground">Construction Team</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Timeline & Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{new Date(project.startDate).toLocaleDateString('sv-SE')}</p>
                      <p className="text-sm text-muted-foreground">Start Date</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <CalendarDays className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{new Date(project.deadline).toLocaleDateString('sv-SE')}</p>
                      <p className="text-sm text-muted-foreground">Deadline</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{project.responsibleSeller}</p>
                      <p className="text-sm text-muted-foreground">Responsible Seller</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Overview */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Project Progress</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Overall Completion</span>
                  <span className="font-medium">{project.completionPercentage}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-4">
                  <div 
                    className="bg-gradient-primary h-4 rounded-full transition-smooth" 
                    style={{ width: `${project.completionPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            {project.notes && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Notes</h3>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm">{project.notes}</p>
                </div>
              </div>
            )}

            {/* Avvarat Material now handled in checklist */}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4" />
                Edit Project
              </Button>
              <Button variant="outline" size="sm">
                <ExternalLink className="w-4 h-4" />
                View Location
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportReport}>
                <Download className="w-4 h-4" />
                📄 Export Project Report
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
                          
                          const newCompletionPercentage = totalWeight > 0 ? Math.round((totalCompletedWeight / totalWeight) * 100) : 0;
                          
                          // Check if all work phases are completed (100%)
                          const allWorkPhasesCompleted = newCompletionPercentage === 100;
                          
                          // Check if all checklist items are completed
                          const allItemsCompleted = newCompletionPercentage === 100;
                          
                          // Check if this is the first work phase being completed and status is planned
                          const completedWorkPhases = updatedPhases?.filter(p => p.completed).length || 0;
                          const wasFirstPhaseCompleted = completedWorkPhases === 1 && project.status === 'planned';
                          
                          // Auto-complete project if both work phases and checklist are done
                          let updatedProject = {
                            ...project,
                            workPhases: updatedPhases,
                            completionPercentage: newCompletionPercentage,
                          };

                          // Change status from planned to ongoing when first work phase is completed
                          if (wasFirstPhaseCompleted) {
                            updatedProject = {
                              ...updatedProject,
                              status: 'ongoing' as const,
                            };
                          }
                          // Auto-complete project if both work phases and checklist are done
                          else if (allItemsCompleted && project.status !== 'completed') {
                            updatedProject = {
                              ...updatedProject,
                              status: 'completed' as const,
                            };
                          }
                          
                          onUpdateProject(updatedProject);
                        }}
                        className="data-[state=checked]:bg-success data-[state=checked]:border-success mt-1"
                      />
                      
                      <div className="flex-1 space-y-2">
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
                          {phase.completedAt && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(phase.completedAt).toLocaleDateString('sv-SE')}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Comment section for detailed view */}
                        <div className="space-y-2">
                          <textarea
                            placeholder="Kommentar (frivillig)..."
                            value={phase.comment || ''}
                            onChange={(e) => {
                              const updatedPhases = project.workPhases?.map(p => {
                                if (p.id === phase.id) {
                                  return { ...p, comment: e.target.value };
                                }
                                return p;
                              });
                              onUpdateProject({
                                ...project,
                                workPhases: updatedPhases,
                              });
                            }}
                            className="w-full text-xs p-2 bg-background border rounded resize-none"
                            rows={2}
                          />
                        </div>
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
                File upload and management functionality will be available here.
              </p>
              <Button variant="outline" className="mt-4">
                Upload Files
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}