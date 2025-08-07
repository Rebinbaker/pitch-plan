import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Project } from '@/types/project';
import { Hammer, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';

interface WorkPhasesSectionProps {
  project: Project;
  onUpdateProject: (project: Project) => void;
  onOpenDetails?: () => void;
}

export function WorkPhasesSection({ project, onUpdateProject, onOpenDetails }: WorkPhasesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const workPhases = project.workPhases || [];
  const completedPhases = workPhases.filter(phase => phase.completed).length;
  const totalPhases = workPhases.length;
  const completionPercentage = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;

  const handlePhaseToggle = (phaseId: string) => {
    const updatedPhases = workPhases.map(phase => {
      if (phase.id === phaseId) {
        return {
          ...phase,
          completed: !phase.completed,
          completedAt: !phase.completed ? new Date().toISOString().split('T')[0] : undefined,
        };
      }
      return phase;
    });

    // Calculate new completion percentage based on completed work phases (10% per phase)
    const completedWorkPhases = updatedPhases.filter(phase => phase.completed).length;
    const newCompletionPercentage = Math.round((completedWorkPhases / updatedPhases.length) * 100);

    // Check if all work phases are completed (100%)
    const allWorkPhasesCompleted = newCompletionPercentage === 100;
    
    // Check if all checklist items are completed
    const allChecklistCompleted = project.checklist?.every(item => item.completed) || false;
    
    // Auto-complete project if both work phases and checklist are done
    let updatedProject = {
      ...project,
      workPhases: updatedPhases,
      completionPercentage: newCompletionPercentage,
    };

    if (allWorkPhasesCompleted && allChecklistCompleted && project.status !== 'completed') {
      updatedProject = {
        ...updatedProject,
        status: 'completed' as const,
      };
    }

    onUpdateProject(updatedProject);
  };

  if (totalPhases === 0) {
    return (
      <div className="text-center py-2 text-sm text-muted-foreground">
        Inga arbetsmoment har skapats för detta projekt än.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hammer className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Arbetsmoment</span>
          <Badge variant="secondary" className="text-xs">
            {completedPhases}/{totalPhases}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{completionPercentage}%</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-secondary rounded-full h-1.5">
        <div 
          className="bg-gradient-primary h-1.5 rounded-full transition-smooth" 
          style={{ width: `${completionPercentage}%` }}
        />
      </div>

      {/* Always show first 3 work phases */}
      <div className="space-y-2">
        {workPhases.slice(0, 3).map((phase, index) => (
          <div 
            key={phase.id}
            className={`flex items-center gap-2 p-2 rounded text-xs ${
              phase.completed 
                ? 'bg-success/5 border border-success/20' 
                : 'bg-card border border-border'
            }`}
          >
            <Checkbox 
              id={phase.id}
              checked={phase.completed}
              onCheckedChange={() => handlePhaseToggle(phase.id)}
              className="data-[state=checked]:bg-success data-[state=checked]:border-success h-3 w-3"
            />
            <label 
              htmlFor={phase.id}
              className={`flex-1 cursor-pointer ${
                phase.completed 
                  ? 'text-success line-through' 
                  : 'text-card-foreground'
              }`}
            >
              {index + 1}. {phase.label}
            </label>
            {phase.completedAt && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-2 h-2" />
                <span>{new Date(phase.completedAt).toLocaleDateString('sv-SE')}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Expandable detailed view for remaining phases */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <div className="space-y-2">
            {workPhases.slice(3).map((phase, index) => (
              <div 
                key={phase.id}
                className={`flex items-center gap-2 p-2 rounded text-xs ${
                  phase.completed 
                    ? 'bg-success/5 border border-success/20' 
                    : 'bg-card border border-border'
                }`}
              >
                <Checkbox 
                  id={phase.id}
                  checked={phase.completed}
                  onCheckedChange={() => handlePhaseToggle(phase.id)}
                  className="data-[state=checked]:bg-success data-[state=checked]:border-success h-3 w-3"
                />
                <label 
                  htmlFor={phase.id}
                  className={`flex-1 cursor-pointer ${
                    phase.completed 
                      ? 'text-success line-through' 
                      : 'text-card-foreground'
                  }`}
                >
                  {index + 4}. {phase.label}
                </label>
                {phase.completedAt && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-2 h-2" />
                    <span>{new Date(phase.completedAt).toLocaleDateString('sv-SE')}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {workPhases.length > 3 && !isExpanded && (
        <button 
          className="text-xs text-muted-foreground text-center py-1 hover:text-primary transition-colors cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetails?.();
          }}
        >
          +{workPhases.length - 3} fler moment...
        </button>
      )}
    </div>
  );
}