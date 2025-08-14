import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Project } from '@/types/project';
import { mockProjects } from '@/data/mockProjects';

interface ProjectAllocationSelectProps {
  currentProjectId: string;
  selectedProjectId?: string;
  onProjectSelect: (projectId: string, projectName: string) => void;
}

export function ProjectAllocationSelect({ 
  currentProjectId, 
  selectedProjectId, 
  onProjectSelect 
}: ProjectAllocationSelectProps) {
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);

  useEffect(() => {
    // Filter projects that are planned and don't have material ordered yet
    const plannedProjects = mockProjects.filter(project => 
      project.id !== currentProjectId && 
      project.status === 'planned' &&
      !project.checklist.find(item => item.label === 'Materialbeställning')?.completed
    );
    setAvailableProjects(plannedProjects);
  }, [currentProjectId]);

  return (
    <Select
      value={selectedProjectId || ''}
      onValueChange={(value) => {
        if (value === 'none') {
          onProjectSelect('', '');
        } else {
          const selectedProject = availableProjects.find(p => p.id === value);
          if (selectedProject) {
            onProjectSelect(selectedProject.id, selectedProject.name);
          }
        }
      }}
    >
      <SelectTrigger className="h-7 text-xs">
        <SelectValue placeholder="Välj projekt..." />
      </SelectTrigger>
      <SelectContent className="bg-background border border-border shadow-lg z-50 max-h-60 overflow-auto">
        <SelectItem value="none">Inget projekt valt</SelectItem>
        {availableProjects.map(project => (
          <SelectItem key={project.id} value={project.id}>
            <div className="flex items-center gap-2 w-full">
              <span className="flex-1 truncate">{project.name}</span>
              <Badge variant="outline" className="text-xs">
                {project.region}
              </Badge>
              <Badge variant="secondary" className="text-xs bg-primary/20 text-primary border-primary/30">
                Planerat
              </Badge>
            </div>
          </SelectItem>
        ))}
        {availableProjects.length === 0 && (
          <SelectItem value="none" disabled>
            Inga tillgängliga projekt
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}