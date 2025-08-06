import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChecklistItem, Project } from '@/types/project';
import { CheckCircle2, Circle, AlertTriangle } from 'lucide-react';

interface ProjectChecklistProps {
  checklist: ChecklistItem[];
  onChecklistUpdate: (updatedChecklist: ChecklistItem[]) => void;
  startDate: string;
  isEditable?: boolean;
  project?: Project;
}

export function ProjectChecklist({ 
  checklist, 
  onChecklistUpdate, 
  startDate,
  isEditable = true,
  project
}: ProjectChecklistProps) {
  const completedCount = checklist.filter(item => item.completed).length;
  const totalCount = checklist.length;
  const completionPercentage = Math.round((completedCount / totalCount) * 100);

  // Check if project starts within 48 hours and has missing tasks
  const projectStartDate = new Date(startDate);
  const now = new Date();
  const hoursUntilStart = (projectStartDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  const hasUrgentMissingTasks = hoursUntilStart <= 48 && hoursUntilStart > 0 && completedCount < totalCount;

  // Check if reserved material blocks completion
  const hasIncompleteReservedMaterial = project?.avvaratMaterial?.isReserved && !(
    project.avvaratMaterial.materialType &&
    project.avvaratMaterial.storageLocation &&
    project.avvaratMaterial.dateOfReservation &&
    project.avvaratMaterial.responsiblePerson
  );

  const canMarkAsCompleted = completionPercentage === 100 && !hasIncompleteReservedMaterial;

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
          {checklist.map((item) => (
            <div 
              key={item.id} 
              className={`flex items-center space-x-3 p-3 rounded-lg border transition-smooth ${
                item.completed 
                  ? 'bg-success/5 border-success/20' 
                  : 'bg-card border-border hover:bg-accent/50'
              } ${isEditable ? 'cursor-pointer' : ''}`}
              onClick={() => handleItemToggle(item.id)}
            >
              <Checkbox 
                id={item.id}
                checked={item.completed}
                onCheckedChange={() => handleItemToggle(item.id)}
                disabled={!isEditable}
                className="data-[state=checked]:bg-success data-[state=checked]:border-success"
              />
              
              <div className="flex-1 space-y-1">
                <label 
                  htmlFor={item.id}
                  className={`text-sm font-medium leading-none cursor-pointer ${
                    item.completed 
                      ? 'text-success line-through' 
                      : 'text-card-foreground'
                  }`}
                >
                  {item.label}
                </label>
                {item.completedAt && (
                  <p className="text-xs text-muted-foreground">
                    Completed: {new Date(item.completedAt).toLocaleDateString('sv-SE')}
                  </p>
                )}
              </div>
              
              {item.completed ? (
                <CheckCircle2 className="w-5 h-5 text-success" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
          ))}
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
              disabled={hasIncompleteReservedMaterial}
            >
              Mark All Complete
            </Button>
            
            {hasIncompleteReservedMaterial && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <span className="text-sm text-yellow-700">
                  Complete reserved material section before marking project as completed
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