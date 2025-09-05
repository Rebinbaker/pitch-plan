import { useState } from 'react';
import { Calendar, MapPin, Phone, User, Truck, MoreVertical, Edit, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Project, ProjectStatus } from '@/types/project';
import { MobileEditProjectModal } from './MobileEditProjectModal';

interface MobileProjectCardProps {
  project: Project;
  onUpdate: (project: Project) => void;
  trailers?: any[];
  teams?: any[];
}

export function MobileProjectCard({ project, onUpdate, trailers = [], teams = [] }: MobileProjectCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'planned': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'ongoing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'invoiced': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
      <Card className="border border-border/50 hover:border-primary/30 transition-colors">
        <CardContent className="p-4">
          {/* Header with status and actions */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-base leading-tight mb-1">
                {project.name}
              </h3>
              <Badge className={`text-xs ${getStatusColor(project.status)}`}>
                {getStatusLabel(project.status)}
              </Badge>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Redigera
                </DropdownMenuItem>
                {project.status === 'planned' && (
                  <DropdownMenuItem onClick={() => quickStatusUpdate('ongoing')}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Starta projekt
                  </DropdownMenuItem>
                )}
                {project.status === 'ongoing' && (
                  <DropdownMenuItem onClick={() => quickStatusUpdate('completed')}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Markera klart
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Key Info */}
          <div className="space-y-2">
            {project.customerName && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{project.customerName}</span>
              </div>
            )}
            
            {project.address && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{project.address}</span>
              </div>
            )}
            
            {project.customerPhone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{project.customerPhone}</span>
              </div>
            )}

            {project.constructionStartWeek && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span>Vecka {project.constructionStartWeek}</span>
              </div>
            )}

            {project.assignedTrailer && (
              <div className="flex items-center gap-2 text-sm">
                <Truck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{project.assignedTrailer}</span>
              </div>
            )}
          </div>

          {/* Progress indicator for ongoing projects */}
          {project.status === 'ongoing' && project.completionPercentage !== undefined && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Framsteg</span>
                <span className="font-medium">{project.completionPercentage}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div 
                  className="bg-primary h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${project.completionPercentage}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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