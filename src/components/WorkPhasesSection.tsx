import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Project, WorkPhaseItem } from '@/types/project';
import { Calendar, ChevronDown, ChevronRight, Hammer, CalendarDays, Users, Building } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format, addDays } from 'date-fns';

interface WorkPhasesSectionProps {
  project: Project;
  onUpdateProject: (project: Project) => void;
}

export function WorkPhasesSection({ project, onUpdateProject }: WorkPhasesSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [comments, setComments] = useState<Record<string, string>>({});

  const workPhases = project.workPhases || [];
  
  console.log('WorkPhasesSection rendered for project:', project.name);
  console.log('Work phases:', workPhases);
  console.log('Has onUpdateProject:', !!onUpdateProject);
  const completedPhases = workPhases.filter(phase => phase.completed).length;
  const totalPhases = workPhases.length;
  const completionPercentage = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;
  
  // Calculate estimates (1 day per phase)
  const remainingPhases = totalPhases - completedPhases;
  const estimatedDaysLeft = remainingPhases;
  const startDate = new Date(project.startDate);
  const estimatedCompletionDate = addDays(startDate, totalPhases);
  const teamAvailableDate = estimatedCompletionDate;
  const scaffoldingFreeDate = estimatedCompletionDate;

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

    onUpdateProject({
      ...project,
      workPhases: updatedPhases,
    });
  };

  const handleCommentChange = (phaseId: string, comment: string) => {
    setComments(prev => ({ ...prev, [phaseId]: comment }));
  };

  const handleCommentSave = (phaseId: string) => {
    const comment = comments[phaseId];
    const updatedPhases = workPhases.map(phase => {
      if (phase.id === phaseId) {
        return { ...phase, comment };
      }
      return phase;
    });

    onUpdateProject({
      ...project,
      workPhases: updatedPhases,
    });
  };

  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/50 transition-smooth">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Hammer className="w-5 h-5" />
                Arbetsmoment
                {totalPhases > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {completedPhases}/{totalPhases}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                {totalPhases > 0 && (
                  <span className="text-sm font-medium">{completionPercentage}%</span>
                )}
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
            </div>
            
            {/* Progress Summary - Always visible */}
            {totalPhases > 0 ? (
              <div className="space-y-3 mt-2">
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-gradient-primary h-2 rounded-full transition-smooth" 
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
                
                {/* Quick estimates */}
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Hammer className="w-3 h-3" />
                    <span>{completedPhases} av {totalPhases} moment klara ({completionPercentage}%)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" />
                    <span>Prognos: klart om {estimatedDaysLeft} dagar</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{project.constructionTeam} tillgängliga {format(teamAvailableDate, 'yyyy-MM-dd')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Building className="w-3 h-3" />
                    <span>Ställning frisläpps {format(scaffoldingFreeDate, 'yyyy-MM-dd')}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground mt-2">
                Inga arbetsmoment definierade än
              </div>
            )}
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {workPhases.map((phase, index) => (
                <div 
                  key={phase.id}
                  className={`p-3 rounded-lg border transition-smooth ${
                    phase.completed 
                      ? 'bg-success/5 border-success/20' 
                      : 'bg-card border-border'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox 
                      id={phase.id}
                      checked={phase.completed}
                      onCheckedChange={() => handlePhaseToggle(phase.id)}
                      className="data-[state=checked]:bg-success data-[state=checked]:border-success mt-1"
                    />
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <label 
                          htmlFor={phase.id}
                          className={`text-sm font-medium cursor-pointer ${
                            phase.completed 
                              ? 'text-success line-through' 
                              : 'text-card-foreground'
                          }`}
                        >
                          {index + 1}. {phase.label}
                        </label>
                        {phase.completedAt && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(phase.completedAt).toLocaleDateString('sv-SE')}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Comment section */}
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Kommentar (frivillig)..."
                          value={comments[phase.id] ?? phase.comment ?? ''}
                          onChange={(e) => handleCommentChange(phase.id, e.target.value)}
                          className="text-xs resize-none"
                          rows={2}
                        />
                        {comments[phase.id] !== undefined && comments[phase.id] !== (phase.comment ?? '') && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleCommentSave(phase.id)}
                            className="h-6 text-xs"
                          >
                            Spara kommentar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}