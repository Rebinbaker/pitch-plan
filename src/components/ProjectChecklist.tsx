import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Circle, AlertTriangle, Truck, Users, Plus, X, Clock, Check, Copy, Lock, Mail, Package, FileText } from 'lucide-react';
import { ChecklistItem, WorkPhaseItem, Project, MaterialOrder, areAllWorkPhasesConfirmed, MaterialItem } from '@/types/project';
import { generateMaterialOrderReminder } from '@/utils/linkopingInventory';
import { MaterialOrderModal } from './MaterialOrderModal';
import { TeamSelectionModal } from './TeamSelectionModal';
import { WarrantyGenerator } from './warranty/WarrantyGenerator';
import { ContainerOrderDropdown } from './ContainerOrderDropdown';

interface ProjectChecklistProps {
  checklist: ChecklistItem[];
  onChecklistUpdate: (updatedChecklist: ChecklistItem[]) => void;
  startDate: string;
  isEditable?: boolean;
  project?: Project;
  allProjects?: Project[];
  trailers?: any[];
  teams?: any[];
  onUpdateProject?: (project: Project) => void;
  onUpdateTrailer?: (trailer: any) => void;
  onFileUploaded?: (file: { name: string; url: string; type: 'warranty'; projectId: string; uploadedBy: string; description?: string; tags: string[] }) => void;
}

export function ProjectChecklist({ 
  checklist, 
  onChecklistUpdate, 
  startDate,
  isEditable = true,
  project,
  allProjects = [],
  trailers = [],
  teams = [],
  onUpdateProject,
  onUpdateTrailer,
  onFileUploaded
}: ProjectChecklistProps) {
  const { toast } = useToast();
  
  const [materialAnswer, setMaterialAnswer] = useState<'yes' | 'no' | null>(() => {
    if (project?.avvaratMaterial?.hasLeftoverMaterial === true) {
      return 'yes';
    } else if (project?.avvaratMaterial?.hasLeftoverMaterial === false) {
      return 'no';
    }
    return null;
  });

  const [materialOrderAnswer, setMaterialOrderAnswer] = useState<'yes' | 'no' | ''>('');
  const [containerStates, setContainerStates] = useState<Record<string, { status: 'idle' | 'opened' | 'confirmed'; openedAt?: number }>>({});
  const [timers, setTimers] = useState<Record<string, number>>({});
  const [showWarrantyGenerator, setShowWarrantyGenerator] = useState(false);
  const [showTeamSelectionModal, setShowTeamSelectionModal] = useState(false);
  const [materialReadyItemId, setMaterialReadyItemId] = useState<string>('');

  // Update materialAnswer when project.avvaratMaterial changes
  useEffect(() => {
    if (project?.avvaratMaterial?.hasLeftoverMaterial === true && materialAnswer !== 'yes') {
      setMaterialAnswer('yes');
    } else if (project?.avvaratMaterial?.hasLeftoverMaterial === false && materialAnswer !== 'no') {
      setMaterialAnswer('no');
    }
  }, [project?.avvaratMaterial?.hasLeftoverMaterial, materialAnswer]);

  // Check if all work phases are confirmed
  const allWorkPhasesConfirmed = project ? areAllWorkPhasesConfirmed(project.workPhases || []) : false;

  // Find the index of "Dagliga egenkontroller" to determine which items to lock
  const dailyInspectionIndex = checklist.findIndex(item => item.label === 'Dagliga egenkontroller');

  const isItemLocked = (index: number): boolean => {
    if (dailyInspectionIndex >= 0 && index >= dailyInspectionIndex && !allWorkPhasesConfirmed) {
      return true;
    }
    return false;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Kopierat!",
        description: "Adressen har kopierats till urklipp",
        duration: 2000,
      });
    } catch (err) {
      toast({
        title: "Fel",
        description: "Kunde inte kopiera till urklipp",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  // Container booking helper functions
  const isContainerBookingItem = (itemLabel: string) => {
    return itemLabel.toLowerCase().includes('boka hemtag av container') || 
           itemLabel.toLowerCase().includes('bokad hemtag av container') ||
           itemLabel.toLowerCase().includes('container hemtag');
  };

  const isContainerOrderItem = (itemLabel: string) => {
    return itemLabel.toLowerCase().includes('containerbeställning') || 
           itemLabel.toLowerCase().includes('boka container') ||
           itemLabel.toLowerCase().includes('bokad container');
  };

  const generateOutlookURL = (project: Project) => {
    const subject = encodeURIComponent(`Boka hemtag av container - ${project.name}`);
    const body = encodeURIComponent(`Hej!

Jag behöver boka hemtag av container för följande projekt:

Projektnamn: ${project.name}
Adress: ${project.address}

Kopiera adressen för att hitta rätt mail tråd för att boka hem container.

Tack!`);
    
    return `mailto:?subject=${subject}&body=${body}`;
  };

  const openOutlook = (itemId: string, project: Project) => {
    copyToClipboard(project.address);
    
    toast({
      title: "Adress kopierad!",
      description: "Projektadressen har kopierats för att hitta rätt mailtråd",
      duration: 3000,
    });
    
    setContainerStates(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        status: 'opened',
        openedAt: Date.now()
      }
    }));
    
    setTimers(prev => ({ ...prev, [itemId]: 120 }));
    
    const countdownInterval = setInterval(() => {
      setTimers(current => {
        const newTime = (current[itemId] || 0) - 1;
        if (newTime <= 0) {
          clearInterval(countdownInterval);
          setContainerStates(currentStates => {
            if (currentStates[itemId]?.status === 'opened') {
              toast({
                title: "Container påminnelse",
                description: "Glöm inte att bekräfta att du har bokat hemtag av container!",
                duration: 5000,
              });
            }
            return currentStates;
          });
          return { ...current, [itemId]: 0 };
        }
        return { ...current, [itemId]: newTime };
      });
    }, 1000);
    
    const url = generateOutlookURL(project);
    
    try {
      window.location.href = url;
    } catch (error) {
      try {
        window.open(url, '_blank');
      } catch (fallbackError) {
        toast({
          title: "Öppna din e-postapp manuellt",
          description: "Kunde inte öppna e-postappen automatiskt",
          variant: "destructive",
          duration: 3000,
        });
      }
    }
  };

  const confirmContainerBooking = (itemId: string) => {
    setContainerStates(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        status: 'confirmed'
      }
    }));
    
    setTimers(prev => ({ ...prev, [itemId]: 0 }));
    
    if (project && onUpdateProject) {
      const updatedProject = {
        ...project,
        checklist: project.checklist.map(item => 
          item.id === itemId 
            ? { 
                ...item, 
                completed: true, 
                completedAt: new Date().toISOString().split('T')[0],
                containerConfirmed: true
              }
            : item
        )
      };
      onUpdateProject(updatedProject);
    }
  };

  const resetContainerStatus = (itemId: string) => {
    setContainerStates(prev => ({
      ...prev,
      [itemId]: {
        status: 'idle'
      }
    }));
    
    setTimers(prev => ({ ...prev, [itemId]: 0 }));
  };

  const handleMaterialOrderSave = (materialOrder: MaterialOrder) => {
    if (!project || !onUpdateProject) return;
    
    const updatedProject = {
      ...project,
      materialOrder
    };
    
    onUpdateProject(updatedProject);
    
    // Auto-complete the material ordering checklist item if order is ready
    if (materialOrder.status === 'ready_to_order' || materialOrder.status === 'ordered') {
      const updatedChecklist = project.checklist.map(item => 
        item.label === 'Materialbeställning' 
          ? { 
              ...item, 
              completed: true, 
              completedAt: new Date().toISOString().split('T')[0]
            }
          : item
      );
      
      const finalProject = {
        ...updatedProject,
        checklist: updatedChecklist
      };
      
      onUpdateProject(finalProject);
    }
  };

  const handleItemToggle = (itemId: string) => {
    if (!isEditable) return;
    
    const itemIndex = checklist.findIndex(item => item.id === itemId);
    if (itemIndex >= 0 && isItemLocked(itemIndex)) {
      toast({
        title: "Låst",
        description: "Alla arbetsmoment måste vara färdiga med bekräftade egenkontroller först",
        variant: "destructive",
      });
      return;
    }

    const item = checklist.find(item => item.id === itemId);
    if (item && item.label === 'Materialbeställning' && !item.completed && teams.length > 0) {
      setMaterialReadyItemId(itemId);
      setShowTeamSelectionModal(true);
      return;
    }
    
    const updatedChecklist = checklist.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            completed: !item.completed,
            completedAt: !item.completed ? new Date().toISOString().split('T')[0] : undefined
          }
        : item
    );
    
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
    
    const newCompletionPercentage = totalWeight > 0 ? 
      (totalCompletedWeight === totalWeight ? 100 : Math.round((totalCompletedWeight / totalWeight) * 100)) : 0;
    
    const allItemsCompleted = newCompletionPercentage === 100;
    
    if (allItemsCompleted && project && onUpdateProject && project.status !== 'completed') {
      const activityEntry = {
        id: `activity-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: 'System',
        action: 'Projekt slutfört - alla arbetsmoment och checklistepunkter klara',
        description: 'status',
        category: 'status' as const,
        oldValue: project.status.charAt(0).toUpperCase() + project.status.slice(1),
        newValue: 'Avslutad'
      };
      
      const updatedProject = {
        ...project,
        status: 'completed' as const,
        checklist: updatedChecklist,
        completionPercentage: newCompletionPercentage,
        activityLog: [...(project.activityLog || []), activityEntry],
      };
      onUpdateProject(updatedProject);
    }
    
    // Handle scaffolding release when "Nedmontering av ställningar" is checked
    const updatedItem = updatedChecklist.find(item => item.id === itemId);
    const isScaffoldingDismantling = updatedItem?.label === 'Nedmontering av ställningar';
    
    if (isScaffoldingDismantling && updatedItem?.completed && project?.assignedTrailer && onUpdateTrailer) {
      const assignedTrailer = trailers.find(trailer => trailer.id === project.assignedTrailer);
      
      if (assignedTrailer) {
        const updatedTrailer = {
          ...assignedTrailer,
          status: 'Tillgänglig',
          assignedProject: undefined,
          lastUpdated: new Date().toISOString().split('T')[0]
        };
        
        onUpdateTrailer(updatedTrailer);
        
        if (onUpdateProject) {
          const updatedProjectWithoutTrailer = {
            ...project,
            assignedTrailer: undefined,
            checklist: updatedChecklist,
            completionPercentage: newCompletionPercentage,
          };
          
          onUpdateProject(updatedProjectWithoutTrailer);
          
          toast({
            title: "Ställningsvagn friggjord",
            description: `${assignedTrailer.name} är nu tillgänglig för nya projekt`,
            duration: 3000,
          });
          
          return;
        }
      }
    }
    
    onChecklistUpdate(updatedChecklist);
  };

  const handleTeamAssigned = async (teamId: string, teamName: string) => {
    if (!project || !onUpdateProject) return;

    const updatedProject = {
      ...project,
      constructionTeam: teamName,
      assignedTeamId: teamId
    };
    onUpdateProject(updatedProject);

    const updatedChecklist = checklist.map(item => 
      item.id === materialReadyItemId 
        ? { 
            ...item, 
            completed: true,
            completedAt: new Date().toISOString().split('T')[0]
          }
        : item
    );
    onChecklistUpdate(updatedChecklist);

    toast({
      title: "Material redo för bygglag",
      description: `${teamName} har tilldelats och kommer att få påminnelse om att fylla i materialistan.`,
    });
  };

  const handleContainerOrderSent = () => {
    const updatedChecklist = checklist.map(item => 
      isContainerOrderItem(item.label)
        ? { 
            ...item, 
            completed: true,
            completedAt: new Date().toISOString().split('T')[0],
            containerOrderSent: true
          }
        : item
    );
    onChecklistUpdate(updatedChecklist);
  };

  // Calculate completion stats
  const completedCount = checklist.filter(item => item.completed).length;
  const totalCount = checklist.length;
  const completionPercentage = Math.round((completedCount / totalCount) * 100);

  // Check for urgent missing tasks
  const projectStartDate = new Date(startDate);
  const now = new Date();
  const hoursUntilStart = (projectStartDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  const hasUrgentMissingTasks = hoursUntilStart <= 48 && completedCount < totalCount;

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
            const isBookScaffolding = item.label === 'Ställningshantering';
            const isScheduleTeam = item.label === 'Schedule construction team';
            const isAvvaratMaterial = item.label === 'Avvarat material?';
            const isContainerBooking = isContainerBookingItem(item.label);
            const isContainerOrder = isContainerOrderItem(item.label);
            const isMaterialOrder = item.label === 'Materialbeställning';
            const hasTrailerAssigned = !!project?.assignedTrailer;
            const isDailyInspections = item.label === 'Dagliga egenkontroller';
            const hasTeamAssigned = !!(project?.constructionTeam && teams.some(team => team.name === project.constructionTeam));
            const itemLocked = isItemLocked(index);
            const isItemComplete = item.completed;

            return (
              <div key={item.id} className="space-y-2 p-3 border border-border rounded-lg">
                <div className="flex items-start gap-3">
                  {(!isBookScaffolding && !isAvvaratMaterial) ? (
                    <div className="flex items-center pt-0.5">
                      <Checkbox
                        id={item.id}
                        checked={isItemComplete}
                        onCheckedChange={() => {
                          if (isBookScaffolding || isAvvaratMaterial || isContainerBooking || isContainerOrder) return;
                          
                          if (isScheduleTeam && !hasTeamAssigned) {
                            if (isBookScaffolding || isContainerBooking) return;
                            handleItemToggle(item.id);
                          } else {
                            handleItemToggle(item.id);
                          }
                        }}
                        disabled={!isEditable || itemLocked || isBookScaffolding || isContainerBooking || (isDailyInspections && !allWorkPhasesConfirmed) || (isScheduleTeam && !hasTeamAssigned)}
                        className={`${isItemComplete ? 'bg-success border-success' : ''}`}
                      />
                      {itemLocked && (
                        <Lock className="w-3 h-3 text-muted-foreground ml-1" />
                      )}
                      {isDailyInspections && !isItemComplete && !allWorkPhasesConfirmed && (
                        <Clock className="w-3 h-3 text-muted-foreground ml-1" />
                      )}
                    </div>
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
                        (!itemLocked && !isBookScaffolding && !isDailyInspections && (!isScheduleTeam || hasTeamAssigned) && !isAvvaratMaterial) ? 'cursor-pointer' : ''
                      } ${
                        isItemComplete 
                          ? 'text-success line-through' 
                          : itemLocked 
                            ? 'text-muted-foreground'
                            : 'text-card-foreground'
                      }`}
                    >
                       {isContainerBooking 
                          ? (isItemComplete ? "Bokad hemtag av container" : "Boka hemtag av container")
                          : isScheduleTeam
                              ? (isItemComplete ? "Bygglag tillsatt" : "Tillsätt bygglag")
                              : isContainerOrder
                                ? (isItemComplete ? "Bokad Container" : "Boka Container")
                                : isBookScaffolding
                                  ? (isItemComplete ? "Ställningsvagn bokad" : "Boka ställningsvagn")
                                  : item.label
                       }
                       {itemLocked && (
                         <span className="ml-2 text-xs text-muted-foreground">
                           (Låst tills alla arbetsmoment bekräftade)
                         </span>
                       )}
                       {isDailyInspections && !isItemComplete && !allWorkPhasesConfirmed && (
                         <span className="ml-2 text-xs text-muted-foreground">
                           (Slutförs automatiskt när alla egenkontroller bekräftade)
                         </span>
                       )}
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
                               if (trailerId === 'none') {
                                 if (project.assignedTrailer && onUpdateTrailer) {
                                   const currentTrailer = trailers.find(t => t.id === project.assignedTrailer);
                                   if (currentTrailer) {
                                     onUpdateTrailer({
                                       ...currentTrailer,
                                       status: 'Tillgänglig',
                                       assignedProject: undefined,
                                       lastUpdated: new Date().toISOString().split('T')[0]
                                     });
                                   }
                                 }
                                 
                                 const updatedProject = {
                                   ...project,
                                   assignedTrailer: undefined,
                                 };
                                 onUpdateProject(updatedProject);
                               } else {
                                 const selectedTrailer = trailers.find(t => t.id === trailerId);
                                 if (selectedTrailer && onUpdateTrailer) {
                                   if (project.assignedTrailer && project.assignedTrailer !== trailerId) {
                                     const oldTrailer = trailers.find(t => t.id === project.assignedTrailer);
                                     if (oldTrailer) {
                                       onUpdateTrailer({
                                         ...oldTrailer,
                                         status: 'Tillgänglig',
                                         assignedProject: undefined,
                                         lastUpdated: new Date().toISOString().split('T')[0]
                                       });
                                     }
                                   }
                                   
                                   onUpdateTrailer({
                                     ...selectedTrailer,
                                     status: 'I bruk',
                                     assignedProject: project.id,
                                     lastUpdated: new Date().toISOString().split('T')[0]
                                   });
                                 }
                                 
                                 const updatedProject = {
                                   ...project,
                                   assignedTrailer: trailerId,
                                 };
                                 onUpdateProject(updatedProject);
                                 
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
                                   
                                   toast({
                                     title: "Ställningsvagn tilldelad",
                                     description: `${selectedTrailer?.name} är nu tilldelad detta projekt`,
                                     duration: 3000,
                                   });
                                 }
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
                          
                          <div className="space-y-1">
                            <Label className="text-xs">Ansvarig person:</Label>
                            <Input
                              className="h-7 text-xs"
                              placeholder="Ange ansvarig person"
                              value={project.scaffoldingResponsible || ''}
                              onChange={(e) => {
                                const updatedProject = {
                                  ...project,
                                  scaffoldingResponsible: e.target.value,
                                };
                                onUpdateProject(updatedProject);
                              }}
                            />
                          </div>
                        </div>
                       )}

                     {/* Container Booking Integration */}
                      {isContainerBooking && project && !item.containerConfirmed && (
                        <div className="mt-3 p-3 bg-accent/30 rounded-lg border border-accent/50 space-y-3">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-primary" />
                            <span className="text-xs font-medium text-primary">Container Hemtag</span>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Adress:</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 ml-2"
                                onClick={() => copyToClipboard(project.address)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            
                            <div className="p-2 bg-background/50 rounded">
                              <span className="text-xs font-medium">{project.address}</span>
                            </div>
                          </div>

                          {(() => {
                            const state = containerStates[item.id];
                            const status = state?.status || 'idle';
                            
                            switch (status) {
                              case 'idle':
                                return (
                                  <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground">
                                      Kopiera adressen för att hitta rätt mail tråd för att boka hem container.
                                    </p>
                                    <Button
                                      size="sm"
                                      onClick={() => openOutlook(item.id, project)}
                                      className="w-full h-8 text-xs bg-[#0078D4] hover:bg-[#0078D4]/80 text-white"
                                    >
                                      <Mail className="w-3 h-3 mr-1" />
                                      Kopiera email-innehåll
                                    </Button>
                                  </div>
                                );
                              
                              case 'opened':
                                const timeLeft = timers[item.id] || 0;
                                const minutes = Math.floor(timeLeft / 60);
                                const seconds = timeLeft % 60;
                                const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                                
                                return (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs text-amber-600">
                                      <Clock className="w-3 h-3" />
                                      <span>Outlook öppnad - väntar på bekräftelse</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      Har du skickat emailet för container hemtag? Bekräfta när du är klar.
                                      {timeLeft > 0 && (
                                        <span className="block mt-1 text-amber-600">
                                          Påminnelse om {timeDisplay}
                                        </span>
                                      )}
                                    </p>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => confirmContainerBooking(item.id)}
                                        className="flex-1 h-8 text-xs"
                                      >
                                        <Check className="w-3 h-3 mr-1" />
                                        Email skickat
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => resetContainerStatus(item.id)}
                                        className="h-8 text-xs"
                                      >
                                        Börja om
                                      </Button>
                                    </div>
                                  </div>
                                );
                              
                              default:
                                return null;
                            }
                          })()}
                        </div>
                      )}

                       {/* Enhanced Container Order Integration with Dropdown */}
                       {isContainerOrder && project && !item.containerOrderConfirmed && (
                        <div className="mt-3 p-3 bg-accent/30 rounded-lg border border-accent/50 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-primary" />
                              <span className="text-xs font-medium text-primary">Container Beställning</span>
                            </div>
                            <ContainerOrderDropdown 
                              project={project} 
                              onOrderSent={handleContainerOrderSent}
                            />
                          </div>
                          
                          <div className="text-xs text-muted-foreground">
                            Välj containertyp och skicka beställning automatiskt via e-post.
                          </div>
                        </div>
                       )}

                          {/* Material Order with Yes/No Selection */}
                         {isMaterialOrder && project && (
                          <div className="mt-3 p-3 bg-info/5 rounded-lg border border-info/20 space-y-3">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-info" />
                              <span className="text-xs font-medium text-info">📦 Materialbeställning</span>
                            </div>
                            
                            {/* Yes/No buttons for material ordering */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Ska material beställas nu?</span>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant={materialOrderAnswer === 'yes' ? 'default' : 'outline'}
                                  onClick={() => setMaterialOrderAnswer('yes')}
                                >
                                  Ja
                                </Button>
                                <Button
                                  size="sm"
                                  variant={materialOrderAnswer === 'no' ? 'default' : 'outline'}
                                  onClick={() => setMaterialOrderAnswer('no')}
                                >
                                  Nej
                                </Button>
                              </div>
                              
                              {materialOrderAnswer === 'no' && (
                                <div className="text-xs text-amber-600 font-medium">
                                  ℹ️ Material lista kan fortfarande skapas - beställning avvaktas närmare byggstart
                                </div>
                              )}
                            </div>

                            {/* Material Order Status */}
                            {project.materialOrder ? (
                             <div className="space-y-2">
                               <div className="p-2 bg-green-50 border border-green-200 rounded">
                                 <div className="text-xs">
                                   <span className="font-medium text-green-700">Status: </span>
                                   <span className="text-green-600">
                                     {project.materialOrder.status === 'draft' && 'Material lista klar men inte beställt'}
                                     {project.materialOrder.status === 'ready_to_order' && 'Klar för beställning'}
                                     {project.materialOrder.status === 'ordered' && 'Beställd'}
                                     {project.materialOrder.status === 'delivered' && 'Levererad'}
                                   </span>
                                 </div>
                                 <div className="text-xs text-green-600 mt-1">
                                   {project.materialOrder.items.length} material(s), 
                                   senast uppdaterad: {new Date(project.materialOrder.updatedAt).toLocaleDateString('sv-SE')}
                                 </div>
                               </div>
                               
                               <MaterialOrderModal
                                 project={project}
                                 allProjects={allProjects}
                                 onSave={handleMaterialOrderSave}
                               />
                             </div>
                           ) : (
                             <div className="space-y-2">
                               {(() => {
                                 const reminder = generateMaterialOrderReminder(allProjects);
                                 
                                 if (reminder.availableMaterials.length > 0) {
                                   return (
                                     <div className="space-y-2">
                                       <div className="p-2 bg-warning/10 border border-warning/30 rounded">
                                         <div className="flex items-start gap-2">
                                           <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                                           <div className="text-xs text-foreground">
                                             <span className="font-bold block text-warning">⚠️ VIKTIGT!</span>
                                             <span className="block mt-1 text-foreground font-medium">
                                               Tillgängligt material från Linköpingsparken: {' '}
                                               {reminder.availableMaterials.map(item => 
                                                 `${item.totalSquareMeters} m² ${item.materialType}`
                                               ).join(', ')}
                                             </span>
                                             <span className="block mt-1 font-bold text-foreground">
                                               Kontrollera detta innan beställning för att undvika onödiga kostnader!
                                             </span>
                                           </div>
                                         </div>
                                       </div>
                                       
                                       <div className="text-xs text-muted-foreground font-medium">
                                         Totalt värde uppskattat: ~{(reminder.totalValue * 50).toLocaleString('sv-SE')} SEK
                                       </div>
                                     </div>
                                   );
                                 } else {
                                   return (
                                     <div className="text-xs text-muted-foreground">
                                       Inget material tillgängligt i Linköpingsparken för detta projekt.
                                     </div>
                                   );
                                 }
                               })()}
                               
                               <MaterialOrderModal
                                 project={project}
                                 allProjects={allProjects}
                                 onSave={handleMaterialOrderSave}
                               />
                             </div>
                           )}
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
                            
                            if (teamName !== 'none' && !item.completed) {
                              updatedProject.checklist = project.checklist.map(checkItem => {
                                if (checkItem.id === item.id) {
                                  return {
                                    ...checkItem,
                                    completed: true,
                                    completedAt: new Date().toISOString().split('T')[0],
                                  };
                                }
                                return checkItem;
                              });
                            }
                            
                            onUpdateProject(updatedProject);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Välj tillgängligt team..." />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border border-border shadow-md z-[100] max-h-60 overflow-auto">
                            <SelectItem value="none" className="hover:bg-accent">
                              Inget team valt
                            </SelectItem>
                            {teams.filter(team => 
                              team.availabilityNextWeek === 'Available' || 
                              team.availabilityNextWeek === 'Tillgänglig' || 
                              team.name === project.constructionTeam
                            )
                              .map(team => (
                                <SelectItem 
                                  key={team.id} 
                                  value={team.name}
                                  className="hover:bg-accent cursor-pointer"
                                >
                                  <div className="flex items-center gap-2 w-full">
                                    <span className="flex-1">{team.name}</span>
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
                      </div>
                    )}
                   </div>
                 </div>
               </div>
             );
           })}
         </div>
         
         {/* Warranty Generator Section */}
         {project && allWorkPhasesConfirmed && (
           <div className="mt-6 p-4 bg-success/5 border border-success/20 rounded-lg">
             <div className="flex items-center justify-between">
               <div>
                 <h4 className="text-sm font-medium text-success">Garantibevis redo</h4>
                 <p className="text-xs text-muted-foreground mt-1">
                   Alla arbetsmoment är klara - generera garantibevis
                 </p>
               </div>
               <Button
                 size="sm"
                 onClick={() => setShowWarrantyGenerator(true)}
                 className="bg-success hover:bg-success/80"
               >
                 <FileText className="w-4 h-4 mr-2" />
                 Skapa garantibevis
               </Button>
             </div>
           </div>
         )}
         
         {/* Bulk actions */}
         {isEditable && (
           <div className="mt-6 pt-4 border-t flex gap-2">
             <Button
               variant="outline"
               size="sm"
               onClick={() => {
                 const allCompleted = checklist.map(item => ({
                   ...item,
                   completed: true,
                   completedAt: new Date().toISOString().split('T')[0]
                 }));
                 onChecklistUpdate(allCompleted);
               }}
             >
               Mark All Complete
             </Button>
             <Button
               variant="ghost"
               size="sm"
               onClick={() => {
                 const allReset = checklist.map(item => ({
                   ...item,
                   completed: false,
                   completedAt: undefined
                 }));
                 onChecklistUpdate(allReset);
               }}
             >
               Reset All
             </Button>
           </div>
         )}
      </CardContent>

      {/* Warranty Generator Modal */}
      {project && (
        <WarrantyGenerator
          isOpen={showWarrantyGenerator}
          onClose={() => setShowWarrantyGenerator(false)}
          project={project}
          onGenerated={() => {}}
        />
      )}

      {/* Team Selection Modal */}
      {project && (
        <TeamSelectionModal
          isOpen={showTeamSelectionModal}
          onClose={() => setShowTeamSelectionModal(false)}
          project={project}
          teams={teams}
          onTeamAssigned={handleTeamAssigned}
        />
      )}
    </Card>
  );
}