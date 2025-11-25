import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Project } from '@/types/project';
import { ScaffoldingTrailer } from '@/types/scaffolding';
import { Truck, CheckCircle2, Circle } from 'lucide-react';

interface TrailerAssignmentSectionProps {
  project: Project;
  trailers: ScaffoldingTrailer[];
  onUpdateProject: (project: Project) => void;
  onUpdateTrailer: (trailer: ScaffoldingTrailer) => void;
}

export function TrailerAssignmentSection({ project, trailers, onUpdateProject, onUpdateTrailer }: TrailerAssignmentSectionProps) {
  const assignedTrailer = trailers.find(trailer => trailer.id === project.assignedTrailer);
  
  // Show available trailers AND the currently assigned trailer (even if it's "I bruk")
  const availableTrailers = trailers.filter(trailer => 
    trailer.status === 'Tillgänglig' || trailer.id === project.assignedTrailer
  );

  const handleTrailerChange = (trailerId: string) => {
    if (trailerId === 'none') {
      onUpdateProject({
        ...project,
        assignedTrailer: undefined,
      });
    } else {
      onUpdateProject({
        ...project,
        assignedTrailer: trailerId,
      });
    }
  };

  // Check if all required fields are filled to mark as completed AND update trailer status
  const isCompleted = !!project.assignedTrailer && !!project.scaffoldingResponsible;

  const handleCheckboxChange = () => {
    if (!isCompleted) {
      // Cannot check if requirements not met
      return;
    }
    
    // If already completed, uncheck it
    if (project.scaffoldingBooked) {
      onUpdateProject({
        ...project,
        scaffoldingBooked: false
      });
      
      // Update trailer status back to available
      if (assignedTrailer) {
        onUpdateTrailer({
          ...assignedTrailer,
          status: 'Tillgänglig',
          assignedProject: undefined,
          lastUpdated: new Date().toISOString()
        });
      }
    } else {
      // Mark as completed and update trailer
      onUpdateProject({
        ...project,
        scaffoldingBooked: true
      });
      
      // Update trailer status to "I bruk" and assign project
      if (assignedTrailer) {
        onUpdateTrailer({
          ...assignedTrailer,
          status: 'I bruk',
          assignedProject: project.name,
          location: project.address || undefined,
          lastUpdated: new Date().toISOString()
        });
      }
    }
  };

  return (
    <div 
      className={`flex items-center space-x-3 p-3 rounded-lg border transition-smooth ${
        project.scaffoldingBooked 
          ? 'bg-success/5 border-success/20' 
          : 'bg-card border-border'
      }`}
    >
      <Checkbox 
        checked={project.scaffoldingBooked || false}
        onCheckedChange={handleCheckboxChange}
        disabled={!isCompleted}
        className="data-[state=checked]:bg-success data-[state=checked]:border-success"
      />
      
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-muted-foreground" />
          <span className={`text-sm font-medium ${
            isCompleted 
              ? 'text-success' 
              : 'text-card-foreground'
          }`}>
            Tilldela släpvagn!
          </span>
        </div>
        
        <Select value={project.assignedTrailer || ''} onValueChange={handleTrailerChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Välj tillgänglig släpvagn..." />
          </SelectTrigger>
          <SelectContent className="bg-background border border-border shadow-lg z-50">
            <SelectItem value="none">Ingen släpvagn vald</SelectItem>
            {availableTrailers.map(trailer => (
              <SelectItem key={trailer.id} value={trailer.id}>
                <div className="flex items-center gap-2">
                  <span>{trailer.name}</span>
                  <Badge variant="secondary" className="text-xs bg-success/20 text-success border-success/30">
                    {trailer.status}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Show selected trailer */}
        {assignedTrailer && (
          <div className="text-xs text-muted-foreground">
            Vald: {assignedTrailer.name}
          </div>
        )}
        
        {/* Ansvarig person input */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Ansvarig person:</label>
          <Input
            value={project.scaffoldingResponsible || ''}
            onChange={(e) => onUpdateProject({
              ...project,
              scaffoldingResponsible: e.target.value
            })}
            placeholder="Ange ansvarig person"
            className="h-8 text-xs"
          />
        </div>
      </div>
      
      {isCompleted ? (
        <CheckCircle2 className="w-5 h-5 text-success" />
      ) : (
        <Circle className="w-5 h-5 text-muted-foreground" />
      )}
    </div>
  );
}