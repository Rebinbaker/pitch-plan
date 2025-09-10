import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Calendar, 
  MapPin, 
  Phone, 
  User, 
  Truck, 
  Edit, 
  CheckCircle,
  Clock,
  FileText
} from 'lucide-react';
import { Project, ProjectStatus } from '@/types/project';
import { MobileEditProjectModal } from './MobileEditProjectModal';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

interface MobileProjectDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onUpdate: (project: Project) => void;
  trailers?: any[];
  teams?: any[];
}

export function MobileProjectDetailModal({ 
  isOpen, 
  onClose, 
  project, 
  onUpdate,
  trailers = [],
  teams = []
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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {project.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <Badge className={`${getStatusColor(project.status)} px-3 py-1`}>
                {getStatusLabel(project.status)}
              </Badge>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsEditModalOpen(true)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Redigera
              </Button>
            </div>

            {/* Project Details */}
            <Card>
              <CardContent className="p-4 space-y-3">
                {project.customerName && (
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">Kund</p>
                      <p className="font-medium">{project.customerName}</p>
                    </div>
                  </div>
                )}

                {project.address && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">Adress</p>
                      <p className="font-medium">{project.address}</p>
                    </div>
                  </div>
                )}

                {project.customerPhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">Telefon</p>
                      <p className="font-medium">{project.customerPhone}</p>
                    </div>
                  </div>
                )}

                {project.constructionStartWeek && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">Byggstart</p>
                      <p className="font-medium">Vecka {project.constructionStartWeek}</p>
                    </div>
                  </div>
                )}

                {project.assignedTrailer && (
                  <div className="flex items-center gap-3">
                    <Truck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">Tilldelad släp</p>
                      <p className="font-medium">{project.assignedTrailer}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Progress indicator for ongoing projects */}
            {project.status === 'ongoing' && project.completionPercentage !== undefined && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Framsteg</span>
                    <span className="font-medium">{project.completionPercentage}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${project.completionPercentage}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
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

              <Button variant="outline" className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                Visa filer
              </Button>
            </div>
          </div>
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