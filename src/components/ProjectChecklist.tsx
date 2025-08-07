import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChecklistItem, Project, MaterialType } from '@/types/project';
import { CheckCircle2, Circle, AlertTriangle, Truck, Users } from 'lucide-react';

interface ProjectChecklistProps {
  checklist: ChecklistItem[];
  onChecklistUpdate: (updatedChecklist: ChecklistItem[]) => void;
  startDate: string;
  isEditable?: boolean;
  project?: Project;
  trailers?: any[];
  teams?: any[];
  onUpdateProject?: (project: Project) => void;
}

export function ProjectChecklist({ 
  checklist, 
  onChecklistUpdate, 
  startDate,
  isEditable = true,
  project,
  trailers = [],
  teams = [],
  onUpdateProject
}: ProjectChecklistProps) {
  const [materialAnswer, setMaterialAnswer] = useState<'yes' | 'no' | null>(
    project?.avvaratMaterial?.hasLeftoverMaterial === true ? 'yes' : 
    project?.avvaratMaterial?.hasLeftoverMaterial === false ? 'no' : null
  );

  const materialTypes: MaterialType[] = [
    'Takpannor', 'Underlagsduk', 'Läkt', 'Plåtdetaljer', 'Isolering', 'Annat'
  ];
  const completedCount = checklist.filter(item => item.completed).length;
  const totalCount = checklist.length;
  
  // Calculate weighted completion percentage from both checklist and work phases
  const checklistWeight = checklist
    .filter(item => item.completed)
    .reduce((sum, item) => sum + (item.weight || 0), 0);
  const workPhasesWeight = (project?.workPhases || [])
    .filter(phase => phase.completed)
    .reduce((sum, phase) => sum + (phase.weight || 0), 0);
  const totalCompletedWeight = checklistWeight + workPhasesWeight;
  
  const checklistTotalWeight = checklist.reduce((sum, item) => sum + (item.weight || 0), 0);
  const workPhasesTotalWeight = (project?.workPhases || []).reduce((sum, phase) => sum + (phase.weight || 0), 0);
  const totalWeight = checklistTotalWeight + workPhasesTotalWeight;
  
  const completionPercentage = totalWeight > 0 ? Math.round((totalCompletedWeight / totalWeight) * 100) : 0;

  // Check if project starts within 48 hours and has missing tasks
  const projectStartDate = new Date(startDate);
  const now = new Date();
  const hoursUntilStart = (projectStartDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  const hasUrgentMissingTasks = hoursUntilStart <= 48 && hoursUntilStart > 0 && completedCount < totalCount;

  // Check if leftover material blocks completion
  const hasIncompleteLeftoverMaterial = project?.avvaratMaterial?.hasLeftoverMaterial && !(
    project.avvaratMaterial.materialType &&
    project.avvaratMaterial.squareMeters &&
    project.avvaratMaterial.storageLocation &&
    project.avvaratMaterial.dateNoted &&
    project.avvaratMaterial.responsiblePerson &&
    project.avvaratMaterial.plannedAction
  );

  const canMarkAsCompleted = completionPercentage === 100 && !hasIncompleteLeftoverMaterial;

  const handleMaterialFieldChange = (field: string, value: any) => {
    if (!project || !onUpdateProject) return;
    
    const updatedProject = {
      ...project,
      avvaratMaterial: {
        ...project.avvaratMaterial,
        hasLeftoverMaterial: materialAnswer === 'yes',
        [field]: value
      }
    };
    onUpdateProject(updatedProject);
  };

  const handleItemToggle = (itemId: string) => {
    if (!isEditable) return;
    
    const updatedChecklist = checklist.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            completed: !item.completed,
            completedAt: !item.completed ? new Date().toISOString().split('T')[0] : undefined
          }
        : item
    );
    
    // Calculate combined weighted completion percentage
    const checklistWeight = updatedChecklist
      .filter(item => item.completed)
      .reduce((sum, item) => sum + (item.weight || 0), 0);
    const workPhasesWeight = (project?.workPhases || [])
      .filter(phase => phase.completed)
      .reduce((sum, phase) => sum + (phase.weight || 0), 0);
    const totalCompletedWeight = checklistWeight + workPhasesWeight;
    
    const checklistTotalWeight = updatedChecklist.reduce((sum, item) => sum + (item.weight || 0), 0);
    const workPhasesTotalWeight = (project?.workPhases || []).reduce((sum, phase) => sum + (phase.weight || 0), 0);
    const totalWeight = checklistTotalWeight + workPhasesTotalWeight;
    
    const newCompletionPercentage = totalWeight > 0 ? Math.round((totalCompletedWeight / totalWeight) * 100) : 0;
    
    // Check if all items are completed (100%)
    const allItemsCompleted = newCompletionPercentage === 100;
    
    // Check if all work phases are completed (100%)
    const allWorkPhasesCompleted = project?.completionPercentage === 100;
    
    // Auto-complete project if all items (checklist + work phases) are done
    if (allItemsCompleted && project && onUpdateProject && project.status !== 'completed') {
      const updatedProject = {
        ...project,
        status: 'completed' as const,
        checklist: updatedChecklist,
        completionPercentage: newCompletionPercentage,
      };
      onUpdateProject(updatedProject);
    }
    
    onChecklistUpdate(updatedChecklist);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Project Checklist</CardTitle>
          {hasUrgentMissingTasks && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Urgent
            </Badge>
          )}
        </div>
        
        {/* Progress Overview */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {completedCount} of {totalCount} tasks completed
            </span>
            <span className="font-medium">{completionPercentage}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-3">
            <div 
              className="bg-gradient-primary h-3 rounded-full transition-smooth" 
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          
          {hasUrgentMissingTasks && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4" />
              <span>Project starts in {Math.round(hoursUntilStart)} hours - missing tasks!</span>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {checklist.map((item, index) => {
            // Special handling for specific items
            const isBookScaffolding = item.label === 'Ställningshantering';
            const isScheduleTeam = item.label === 'Schedule construction team';
            const isAvvaratMaterial = item.label === 'Avvarat material?';
            const hasTrailerAssigned = !!project?.assignedTrailer;
            const hasTeamAssigned = !!(project?.constructionTeam && teams.some(team => team.name === project.constructionTeam));
            
            // Determine if item is complete based on special conditions
            let isItemComplete = item.completed;
            if (isBookScaffolding) {
              isItemComplete = item.completed && hasTrailerAssigned;
            } else if (isScheduleTeam) {
              isItemComplete = item.completed && hasTeamAssigned;
            } else if (isAvvaratMaterial) {
              isItemComplete = materialAnswer !== null;
            }
            
            return (
              <div key={item.id}>
                {/* Regular checklist item */}
                <div 
                  className={`flex items-center space-x-3 p-3 rounded-lg border transition-smooth ${
                    isItemComplete 
                      ? 'bg-success/5 border-success/20' 
                      : 'bg-card border-border hover:bg-accent/50'
                  } ${isEditable && !isAvvaratMaterial ? 'cursor-pointer' : ''}`}
                  onClick={() => {
                    if (isBookScaffolding || isAvvaratMaterial) return; // Book scaffolding and avvarat material disabled for click
                    if (isScheduleTeam && !hasTeamAssigned) return; // Team scheduling disabled if no team assigned
                    handleItemToggle(item.id);
                  }}
                >
                  {!isAvvaratMaterial ? (
                    <Checkbox 
                      id={item.id}
                      checked={!!isItemComplete}
                      onCheckedChange={() => {
                        if (isBookScaffolding) return; // Book scaffolding disabled
                        if (isScheduleTeam && !hasTeamAssigned) return; // Team scheduling disabled if no team assigned
                        handleItemToggle(item.id);
                      }}
                      disabled={!isEditable || isBookScaffolding || (isScheduleTeam && !hasTeamAssigned)}
                      className="data-[state=checked]:bg-success data-[state=checked]:border-success"
                    />
                  ) : (
                    <div className="w-4 h-4 flex items-center justify-center">
                      {materialAnswer === 'yes' && <CheckCircle2 className="w-4 h-4 text-success" />}
                      {materialAnswer === 'no' && <CheckCircle2 className="w-4 h-4 text-success" />}
                      {materialAnswer === null && <Circle className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  )}
                  
                  <div className="flex-1 space-y-1">
                    <label 
                      htmlFor={item.id}
                      className={`text-sm font-medium leading-none ${
                        (!isBookScaffolding && (!isScheduleTeam || hasTeamAssigned) && !isAvvaratMaterial) ? 'cursor-pointer' : ''
                      } ${
                        isItemComplete 
                          ? 'text-success line-through' 
                          : 'text-card-foreground'
                      }`}
                    >
                      {item.label}
                    </label>
                    {isItemComplete && item.completedAt && (
                      <p className="text-xs text-muted-foreground">
                        Completed: {new Date(item.completedAt).toLocaleDateString('sv-SE')}
                      </p>
                    )}
                    
                    {/* Show trailer dropdown for Book scaffolding */}
                    {isBookScaffolding && trailers.length > 0 && project && onUpdateProject && (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Tilldela släpvagn:</span>
                        </div>
                        <Select 
                          value={project.assignedTrailer || ''} 
                          onValueChange={(trailerId) => {
                            const updatedProject = {
                              ...project,
                              assignedTrailer: trailerId === 'none' ? undefined : trailerId,
                            };
                            onUpdateProject(updatedProject);
                            
                            // Also mark the scaffolding item as complete if trailer is assigned and not already completed
                            if (trailerId !== 'none' && !item.completed) {
                              const updatedChecklist = checklist.map(checkItem => {
                                if (checkItem.id === item.id) {
                                  return {
                                    ...checkItem,
                                    completed: true,
                                    completedAt: new Date().toISOString().split('T')[0],
                                  };
                                }
                                return checkItem;
                              });
                              onChecklistUpdate(updatedChecklist);
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Välj tillgänglig släpvagn..." />
                          </SelectTrigger>
                          <SelectContent className="bg-background border border-border shadow-lg z-50">
                            <SelectItem value="none">Ingen släpvagn vald</SelectItem>
                            {trailers
                              .filter(trailer => trailer.status === 'Tillgänglig' || trailer.id === project.assignedTrailer)
                              .map(trailer => (
                                <SelectItem key={trailer.id} value={trailer.id}>
                                  <div className="flex items-center gap-2">
                                    <span>{trailer.name}</span>
                                    <Badge variant="secondary" className="text-xs bg-success/20 text-success border-success/30">
                                      {trailer.status}
                                    </Badge>
                                  </div>
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {/* Show team dropdown for Schedule construction team */}
                    {isScheduleTeam && teams.length > 0 && project && onUpdateProject && (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Välj byggteam:</span>
                        </div>
                        <Select 
                          value={project.constructionTeam || ''} 
                          onValueChange={(teamName) => {
                            const updatedProject = {
                              ...project,
                              constructionTeam: teamName === 'none' ? '' : teamName,
                            };
                            onUpdateProject(updatedProject);
                            
                            // Also mark the team item as complete if team is assigned and not already completed
                            if (teamName !== 'none' && !item.completed) {
                              const updatedChecklist = checklist.map(checkItem => {
                                if (checkItem.id === item.id) {
                                  return {
                                    ...checkItem,
                                    completed: true,
                                    completedAt: new Date().toISOString().split('T')[0],
                                  };
                                }
                                return checkItem;
                              });
                              onChecklistUpdate(updatedChecklist);
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Välj tillgängligt team..." />
                          </SelectTrigger>
                          <SelectContent className="bg-background border border-border shadow-lg z-50">
                            <SelectItem value="none">Inget team valt</SelectItem>
                            {teams
                              .filter(team => team.availabilityNextWeek === 'Available' || team.name === project.constructionTeam)
                              .map(team => (
                                <SelectItem key={team.id} value={team.name}>
                                  <div className="flex items-center gap-2">
                                    <span>{team.name}</span>
                                    <Badge variant="secondary" className="text-xs bg-success/20 text-success border-success/30">
                                      {team.availabilityNextWeek}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {team.type}
                                    </Badge>
                                  </div>
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {/* Show yes/no buttons for Avvarat material */}
                    {isAvvaratMaterial && project && onUpdateProject && (
                      <div className="mt-2 space-y-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={materialAnswer === 'yes' ? 'default' : 'outline'}
                            onClick={() => {
                              setMaterialAnswer('yes');
                              const updatedProject = {
                                ...project,
                                avvaratMaterial: {
                                  ...project.avvaratMaterial,
                                  hasLeftoverMaterial: true
                                }
                              };
                              onUpdateProject(updatedProject);
                              
                              // Mark checklist item as completed
                              if (!item.completed) {
                                const updatedChecklist = checklist.map(checkItem => {
                                  if (checkItem.id === item.id) {
                                    return {
                                      ...checkItem,
                                      completed: true,
                                      completedAt: new Date().toISOString().split('T')[0],
                                    };
                                  }
                                  return checkItem;
                                });
                                onChecklistUpdate(updatedChecklist);
                              }
                            }}
                          >
                            Ja
                          </Button>
                          <Button
                            size="sm"
                            variant={materialAnswer === 'no' ? 'default' : 'outline'}
                            onClick={() => {
                              setMaterialAnswer('no');
                              const updatedProject = {
                                ...project,
                                avvaratMaterial: {
                                  ...project.avvaratMaterial,
                                  hasLeftoverMaterial: false
                                }
                              };
                              onUpdateProject(updatedProject);
                              
                              // Mark checklist item as completed
                              if (!item.completed) {
                                const updatedChecklist = checklist.map(checkItem => {
                                  if (checkItem.id === item.id) {
                                    return {
                                      ...checkItem,
                                      completed: true,
                                      completedAt: new Date().toISOString().split('T')[0],
                                    };
                                  }
                                  return checkItem;
                                });
                                onChecklistUpdate(updatedChecklist);
                              }
                            }}
                          >
                            Nej
                          </Button>
                        </div>
                        
                        {/* Show material form if Yes is selected */}
                        {materialAnswer === 'yes' && (
                          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                            <div className="space-y-2">
                              <Label className="text-sm">Materialtyp</Label>
                              <Select
                                value={project.avvaratMaterial?.materialType || ''}
                                onValueChange={(value) => handleMaterialFieldChange('materialType', value as MaterialType)}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Välj materialtyp" />
                                </SelectTrigger>
                                <SelectContent className="bg-background border border-border shadow-lg z-50">
                                  {materialTypes.map((type) => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {project.avvaratMaterial?.materialType === 'Annat' && (
                              <div className="space-y-2">
                                <Label className="text-sm">Ange annan materialtyp</Label>
                                <Input
                                  className="h-8 text-xs"
                                  placeholder="Beskriv materialtypen"
                                  value={project.avvaratMaterial.customMaterialType || ''}
                                  onChange={(e) => handleMaterialFieldChange('customMaterialType', e.target.value)}
                                />
                              </div>
                            )}
                            
                            <div className="space-y-2">
                              <Label className="text-sm">Antal kvadratmeter</Label>
                              <Input
                                className="h-8 text-xs"
                                type="number"
                                step="0.1"
                                min="0"
                                placeholder="0.0"
                                value={project.avvaratMaterial?.squareMeters || ''}
                                onChange={(e) => handleMaterialFieldChange('squareMeters', parseFloat(e.target.value) || 0)}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {isItemComplete ? (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {isEditable && (
          <div className="mt-6 flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                const allCompleted = checklist.map(item => ({
                  ...item,
                  completed: true,
                  completedAt: new Date().toISOString().split('T')[0],
                }));
                onChecklistUpdate(allCompleted);
                
                // Check if work phases are also completed and auto-complete project
                const allWorkPhasesCompleted = project?.completionPercentage === 100;
                if (allWorkPhasesCompleted && project && onUpdateProject && project.status !== 'completed') {
                  const updatedProject = {
                    ...project,
                    status: 'completed' as const,
                    checklist: allCompleted,
                  };
                  onUpdateProject(updatedProject);
                }
              }}
              disabled={hasIncompleteLeftoverMaterial}
            >
              Mark All Complete
            </Button>
            
            {hasIncompleteLeftoverMaterial && (
              <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <span className="text-sm text-foreground">
                  Fyll i avvarat material-sektionen före markering som färdig
                </span>
              </div>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                const allIncomplete = checklist.map(item => ({
                  ...item,
                  completed: false,
                  completedAt: undefined,
                }));
                onChecklistUpdate(allIncomplete);
              }}
            >
              Reset All
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}