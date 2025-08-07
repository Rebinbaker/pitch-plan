import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Project } from '@/types/project';
import { ScaffoldingTrailer } from '@/types/scaffolding';
import { Truck } from 'lucide-react';

interface TrailerAssignmentSectionProps {
  project: Project;
  trailers: ScaffoldingTrailer[];
  onUpdateProject: (project: Project) => void;
}

export function TrailerAssignmentSection({ project, trailers, onUpdateProject }: TrailerAssignmentSectionProps) {
  const assignedTrailer = trailers.find(trailer => trailer.id === project.assignedTrailer);

  const handleTrailerChange = (trailerId: string) => {
    onUpdateProject({
      ...project,
      assignedTrailer: trailerId,
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Truck className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Tilldelad släpvagn</span>
      </div>
      
      <div className="flex items-center gap-2">
        <Select value={project.assignedTrailer || ''} onValueChange={handleTrailerChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Välj släpvagn..." />
          </SelectTrigger>
          <SelectContent>
            {trailers.map(trailer => (
              <SelectItem key={trailer.id} value={trailer.id}>
                {trailer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {assignedTrailer && (
          <Badge variant="secondary" className="text-xs">
            {assignedTrailer.status}
          </Badge>
        )}
      </div>
    </div>
  );
}