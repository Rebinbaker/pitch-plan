import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChecklistItem, Project } from '@/types/project';
import { CheckCircle2, Circle, AlertTriangle, Truck } from 'lucide-react';

interface ProjectChecklistProps {
  checklist: ChecklistItem[];
  onChecklistUpdate: (updatedChecklist: ChecklistItem[]) => void;
  startDate: string;
  isEditable?: boolean;
  project?: Project;
  trailers?: any[];
  onUpdateProject?: (project: Project) => void;
}

export function ProjectChecklist({ 
  checklist, 
  onChecklistUpdate, 
  startDate,
  isEditable = true,
  project,
  trailers = [],
  onUpdateProject
}: ProjectChecklistProps) {
  const completedCount = checklist.filter(item => item.completed).length;
  const totalCount = checklist.length;
  const completionPercentage = Math.round((completedCount / totalCount) * 100);

  // Check if project starts within 48 hours and has missing tasks
  const projectStartDate = new Date(startDate);
  const now = new Date();
  const hoursUntilStart = (projectStartDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  const hasUrgentMissingTasks = hoursUntilStart <= 48 && hoursUntilStart > 0 && completedCount < totalCount;

  // Check if leftover material blocks completion
  const hasIncompleteLeftoverMaterial = project?.avvaratMaterial?.hasLeftoverMaterial && !(
    project.avvaratMaterial.materialDescription &&
    project.avvaratMaterial.storageLocation &&
    project.avvaratMaterial.dateNoted &&
    project.avvaratMaterial.responsiblePerson &&
    project.avvaratMaterial.plannedAction
  );

  const canMarkAsCompleted = completionPercentage === 100 && !hasIncompleteLeftoverMaterial;

  const handleItemToggle = (itemId: string) => {
    if (!isEditable) return;
    
    const updatedChecklist = checklist.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          completed: !item.completed,
          completedAt: !item.completed ? new Date().toISOString().split('T')[0] : undefined,
        };
      }
      return item;
    });
    
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
            // Special handling for "Book scaffolding" item
            const isBookScaffolding = item.label === 'Book scaffolding';
            const hasTrailerAssigned = project?.assignedTrailer;
            const isScaffoldingComplete = isBookScaffolding ? (item.completed && hasTrailerAssigned) : item.completed;
            
            return (
              <div key={item.id}>
                {/* Regular checklist item */}
                <div 
                  className={`flex items-center space-x-3 p-3 rounded-lg border transition-smooth ${
                    isScaffoldingComplete 
                      ? 'bg-success/5 border-success/20' 
                      : 'bg-card border-border hover:bg-accent/50'
                  } ${isEditable ? 'cursor-pointer' : ''}`}
                  onClick={() => !isBookScaffolding && handleItemToggle(item.id)}
                >
                  <Checkbox 
                    id={item.id}
                    checked={!!isScaffoldingComplete}
                    onCheckedChange={() => !isBookScaffolding && handleItemToggle(item.id)}
                    disabled={!isEditable || isBookScaffolding}
                    className="data-[state=checked]:bg-success data-[state=checked]:border-success"
                  />
                  
                  <div className="flex-1 space-y-1">
                    <label 
                      htmlFor={item.id}
                      className={`text-sm font-medium leading-none ${!isBookScaffolding ? 'cursor-pointer' : ''} ${
                        isScaffoldingComplete 
                          ? 'text-success line-through' 
                          : 'text-card-foreground'
                      }`}
                    >
                      {item.label}
                    </label>
                    {isScaffoldingComplete && item.completedAt && (
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
                  </div>
                  
                  {isScaffoldingComplete ? (
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