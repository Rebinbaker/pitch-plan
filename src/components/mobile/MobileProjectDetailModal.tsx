import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  MapPin, 
  Phone, 
  User, 
  Users,
  Truck, 
  Edit, 
  CheckCircle,
  Clock,
  FileText,
  CalendarDays
} from 'lucide-react';
import { Project, ProjectStatus } from '@/types/project';
import { MobileEditProjectModal } from './MobileEditProjectModal';
import { ProjectChecklist } from '../ProjectChecklist';
import { WorkPhasesSection } from '../WorkPhasesSection';
import { ActivityLogView } from '../ActivityLogView';
import { FilesView } from '../FilesView';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { calculateDeadlineFromWorkDays } from '@/utils/weekCalculations';

interface MobileProjectDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onUpdate: (project: Project) => void;
  trailers?: any[];
  teams?: any[];
  projects?: Project[];
  onFileUploaded?: (file: { name: string; url: string; type: 'warranty'; projectId: string; uploadedBy: string; description?: string; tags: string[] }) => void;
}

export function MobileProjectDetailModal({ 
  isOpen, 
  onClose, 
  project, 
  onUpdate,
  trailers = [],
  teams = [],
  projects = [],
  onFileUploaded
}: MobileProjectDetailModalProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  if (!project) return null;

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'planned': return 'bg-planned text-white';
      case 'ongoing': return 'bg-ongoing text-white';
      case 'completed': return 'bg-completed text-white';
      case 'invoiced': return 'bg-invoiced text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: ProjectStatus) => {
    switch (status) {
      case 'planned': return 'Planerat';
      case 'ongoing': return 'Pågående';
      case 'completed': return 'Avslutat';
      case 'invoiced': return 'Fakturerat';
      default: return status;
    }
  };

  const quickStatusUpdate = (newStatus: ProjectStatus) => {
    onUpdate({ ...project, status: newStatus });
  };

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
    
    const completionPercentage = totalWeight > 0 ? 
      (totalCompletedWeight === totalWeight ? 100 : Math.round((totalCompletedWeight / totalWeight) * 100)) : 0;
    
    const updatedProject = {
      ...project,
      checklist: updatedChecklist,
      completionPercentage,
    };
    
    onUpdate(updatedProject);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <DialogTitle className="text-lg font-semibold">
                  {project.name}
                </DialogTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{project.address}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Badge variant={getStatusVariant(project.status)}>
                  {getStatusLabel(project.status)}
                </Badge>
                {project.rotStatus === 'Yes' && (
                  <Badge variant="rot">ROT</Badge>
                )}
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="overview" className="flex-1 overflow-hidden">
            <TabsList className="grid w-full grid-cols-5 text-xs">
              <TabsTrigger value="overview" className="text-xs">Översikt</TabsTrigger>
              <TabsTrigger value="checklist" className="text-xs">Lista</TabsTrigger>
              <TabsTrigger value="workphases" className="text-xs">Moment</TabsTrigger>
              <TabsTrigger value="files" className="text-xs">Filer</TabsTrigger>
              <TabsTrigger value="activity" className="text-xs">Aktivitet</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="overview" className="space-y-4 p-1">
                {/* Project Information */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Projektdetaljer</h3>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsEditModalOpen(true)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Redigera
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {project.customerName && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{project.customerName}</p>
                          <p className="text-xs text-muted-foreground">Kund</p>
                        </div>
                      </div>
                    )}
                    
                    {project.customerPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{project.customerPhone}</p>
                          <p className="text-xs text-muted-foreground">Telefon</p>
                        </div>
                      </div>
                    )}
                    
                    {project.constructionTeam && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{project.constructionTeam}</p>
                          <p className="text-xs text-muted-foreground">Byggteam</p>
                        </div>
                      </div>
                    )}

                    {project.assignedTrailer && (
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{project.assignedTrailer}</p>
                          <p className="text-xs text-muted-foreground">Tilldelad släp</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {project.actualConstructionStart 
                            ? new Date(project.actualConstructionStart).toLocaleDateString('sv-SE')
                            : `Vecka ${project.constructionStartWeek || ''}`
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {project.actualConstructionStart ? 'Faktisk byggstart' : 'Planerad byggstart'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {project.actualConstructionStart 
                            ? new Date(calculateDeadlineFromWorkDays(project.actualConstructionStart, project.estimatedWorkDays || 7)).toLocaleDateString('sv-SE')
                            : new Date(project.deadline).toLocaleDateString('sv-SE')
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {project.actualConstructionStart ? 'Beräknad deadline' : 'Planerad deadline'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Overview */}
                {project.completionPercentage !== undefined && (
                  <div className="space-y-2">
                    <h3 className="font-medium">Projektframsteg</h3>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Övergripande slutförande</span>
                      <span className="font-medium">{project.completionPercentage}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${project.completionPercentage}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="space-y-2">
                  {project.status === 'planned' && (
                    <Button 
                      onClick={() => quickStatusUpdate('ongoing')}
                      className="w-full"
                      variant="default"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Starta projekt
                    </Button>
                  )}
                  
                  {project.status === 'ongoing' && (
                    <Button 
                      onClick={() => quickStatusUpdate('completed')}
                      className="w-full"
                      variant="default"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Markera som klart
                    </Button>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="checklist" className="p-1 overflow-y-auto">
                <ProjectChecklist 
                  checklist={project.checklist}
                  onChecklistUpdate={handleChecklistUpdate}
                  startDate={project.actualConstructionStart || project.constructionStartWeek || new Date().toISOString()}
                  project={project}
                  allProjects={projects}
                  trailers={trailers}
                  teams={teams}
                  onUpdateProject={onUpdate}
                  onFileUploaded={onFileUploaded}
                />
              </TabsContent>

              <TabsContent value="workphases" className="p-1 overflow-y-auto">
                <WorkPhasesSection 
                  project={project}
                  onUpdateProject={onUpdate}
                  teams={teams}
                  trailers={trailers}
                />
              </TabsContent>

              <TabsContent value="files" className="p-1 overflow-y-auto">
                <div className="text-center py-8">
                  <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-base font-semibold">Filhantering</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Filuppladdning och hanteringsfunktionalitet kommer att finnas tillgänglig här.
                  </p>
                  <Button variant="outline" size="sm">
                    Ladda upp filer
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="activity" className="p-1 overflow-y-auto">
                <ActivityLogView 
                  activityLog={project.activityLog || []}
                />
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      <MobileEditProjectModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        project={project}
        onUpdate={(updatedProject) => {
          onUpdate(updatedProject);
          setIsEditModalOpen(false);
        }}
        teams={teams}
        trailers={trailers}
      />
    </>
  );
}