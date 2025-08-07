import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Project } from '@/types/project';
import { ScaffoldingTrailer } from '@/types/scaffolding';
import { Truck, CheckCircle2, Circle } from 'lucide-react';

interface TrailerAssignmentSectionProps {
  project: Project;
  trailers: ScaffoldingTrailer[];
  onUpdateProject: (project: Project) => void;
}

export function TrailerAssignmentSection({ project, trailers, onUpdateProject }: TrailerAssignmentSectionProps) {
  const assignedTrailer = trailers.find(trailer => trailer.id === project.assignedTrailer);
  
  // Only show available trailers
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

  const isCompleted = !!project.assignedTrailer;

  return (
    <div 
      className={`flex items-center space-x-3 p-3 rounded-lg border transition-smooth ${
        isCompleted 
          ? 'bg-success/5 border-success/20' 
          : 'bg-card border-border'
      }`}
    >
      <Checkbox 
        checked={isCompleted}
        disabled={true}
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
      </div>
      
      {isCompleted ? (
        <CheckCircle2 className="w-5 h-5 text-success" />
      ) : (
        <Circle className="w-5 h-5 text-muted-foreground" />
      )}
    </div>
  );
}