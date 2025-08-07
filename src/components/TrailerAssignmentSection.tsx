import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, Truck } from 'lucide-react';
import { Project } from '@/types/project';
import { ScaffoldingTrailer } from '@/types/scaffolding';

interface TrailerAssignmentSectionProps {
  project: Project;
  trailers: ScaffoldingTrailer[];
  onUpdateProject: (project: Project) => void;
}

export function TrailerAssignmentSection({ 
  project, 
  trailers, 
  onUpdateProject 
}: TrailerAssignmentSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const assignedTrailer = trailers.find(t => t.id === project.assignedTrailer);
  const availableTrailers = trailers.filter(t => 
    t.status === 'Tillgänglig' || t.id === project.assignedTrailer
  );

  const handleTrailerChange = (trailerId: string | null) => {
    onUpdateProject({
      ...project,
      assignedTrailer: trailerId || undefined
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Tillgänglig': return 'bg-success text-success-foreground';
      case 'I bruk': return 'bg-ongoing text-white';
      case 'Under transport': return 'bg-warning text-warning-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full justify-between p-0 h-auto font-normal hover:bg-transparent"
        >
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            <span className="text-sm font-medium">Assigned Trailer</span>
            {assignedTrailer && (
              <Badge variant="outline" className="text-xs">
                {assignedTrailer.name}
              </Badge>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="space-y-3 pt-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Trailer</label>
          <Select 
            value={project.assignedTrailer || ''} 
            onValueChange={(value) => handleTrailerChange(value === 'none' ? null : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a trailer..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No trailer assigned</SelectItem>
              {availableTrailers.map((trailer) => (
                <SelectItem key={trailer.id} value={trailer.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{trailer.name}</span>
                    <Badge 
                      className={`ml-2 text-xs ${getStatusColor(trailer.status)}`}
                    >
                      {trailer.status}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {assignedTrailer && (
          <div className="bg-muted/50 p-3 rounded-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{assignedTrailer.name}</span>
              <Badge className={getStatusColor(assignedTrailer.status)}>
                {assignedTrailer.status}
              </Badge>
            </div>
            {assignedTrailer.location && (
              <p className="text-sm text-muted-foreground">
                📍 {assignedTrailer.location}
              </p>
            )}
            {assignedTrailer.moverNote && (
              <p className="text-sm text-muted-foreground">
                💬 {assignedTrailer.moverNote}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Last updated: {new Date(assignedTrailer.lastUpdated).toLocaleDateString('sv-SE')}
            </p>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}