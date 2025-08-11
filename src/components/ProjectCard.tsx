import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Project } from '@/types/project';
import { CalendarDays, MapPin, Phone, User, Users, FileText, Download, Truck, Calendar, Clock } from 'lucide-react';
import { downloadProjectReport } from '@/utils/pdfGenerator';
import { useToast } from '@/hooks/use-toast';
import { calculateRemainingTime, formatDaysRemaining } from '@/utils/timeCalculations';
// import { AvvaratMaterialSection } from './AvvaratMaterialSection'; // Not needed anymore
import { TrailerAssignmentSection } from './TrailerAssignmentSection';
import { WorkPhasesSection } from './WorkPhasesSection';
import { ScaffoldingTrailer } from '@/types/scaffolding';

interface ProjectCardProps {
  project: Project;
  onViewDetails: (project: Project) => void;
  onUpdateProject?: (project: Project) => void;
  trailers?: ScaffoldingTrailer[];
  teams?: any[];
  onUpdateTeam?: (team: any) => void;
  onUpdateTrailer?: (trailer: any) => void;
}

export function ProjectCard({ project, onViewDetails, onUpdateProject, trailers = [], teams = [], onUpdateTeam, onUpdateTrailer }: ProjectCardProps) {
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
    <Card className="hover:shadow-hover hover:bg-background/90 hover:scale-[1.02] transition-all duration-300 cursor-pointer group" onClick={(e) => { console.log('ProjectCard clicked:', project.name); onViewDetails(project); }}>
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
            <span className="font-medium">{project.completionPercentage}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className="bg-gradient-primary h-2 rounded-full transition-smooth" 
              style={{ width: `${project.completionPercentage}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDaysRemaining(calculateRemainingTime(project).workersRemainingDays)}
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
        </div>
      </CardContent>
    </Card>
  );
}