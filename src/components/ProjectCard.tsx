import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Project } from '@/types/project';
import { CalendarDays, MapPin, Phone, User, Users, FileText, Download, Truck } from 'lucide-react';
import { downloadProjectReport } from '@/utils/pdfGenerator';
import { useToast } from '@/hooks/use-toast';
import { AvvaratMaterialSection } from './AvvaratMaterialSection';
import { TrailerAssignmentSection } from './TrailerAssignmentSection';
import { WorkPhasesSection } from './WorkPhasesSection';
import { ScaffoldingTrailer } from '@/types/scaffolding';

interface ProjectCardProps {
  project: Project;
  onViewDetails: (project: Project) => void;
  onUpdateProject?: (project: Project) => void;
  trailers?: ScaffoldingTrailer[];
}

export function ProjectCard({ project, onViewDetails, onUpdateProject, trailers = [] }: ProjectCardProps) {
  const { toast } = useToast();

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'planned': return 'planned';
      case 'ongoing': return 'ongoing';
      case 'completed': return 'completed';
      case 'invoiced': return 'invoiced';
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
    <Card className="hover:shadow-hover transition-smooth cursor-pointer group" onClick={() => onViewDetails(project)}>
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
            <Badge variant={getStatusVariant(project.status)}>
              {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
            </Badge>
            {project.rotStatus === 'Yes' && (
              <Badge variant="rot" className="text-xs">ROT</Badge>
            )}
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
            <Users className="w-4 h-4" />
            <span>{project.constructionTeam}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="w-4 h-4" />
            <span>{new Date(project.deadline).toLocaleDateString('sv-SE')}</span>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{project.completionPercentage}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className="bg-gradient-primary h-2 rounded-full transition-smooth" 
              style={{ width: `${project.completionPercentage}%` }}
            />
          </div>
        </div>

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

        {project.notes && (
          <div className="flex gap-2 text-sm text-muted-foreground">
            <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p className="line-clamp-2">{project.notes}</p>
          </div>
        )}

        {/* Work Phases Section */}
        {onUpdateProject && (
          <WorkPhasesSection 
            project={project}
            onUpdateProject={onUpdateProject}
          />
        )}

        {/* Avvarat Material Section */}
        {onUpdateProject && (
          <AvvaratMaterialSection 
            project={project}
            onUpdateProject={onUpdateProject}
          />
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
            View Details
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
        </div>
      </CardContent>
    </Card>
  );
}