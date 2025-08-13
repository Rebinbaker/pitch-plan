import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChecklistItem, Project, MaterialType, MaterialItem, getMaterialUnit, areAllWorkPhasesConfirmed } from '@/types/project';
import { CheckCircle2, Circle, AlertTriangle, Truck, Users, Plus, X, MessageCircle, Clock, Check, Copy, Lock, Mail, Package, FileText } from 'lucide-react';
import { WarrantyGenerator } from '@/components/warranty/WarrantyGenerator';
import { useToast } from '@/hooks/use-toast';

interface ProjectChecklistProps {
  checklist: ChecklistItem[];
  onChecklistUpdate: (updatedChecklist: ChecklistItem[]) => void;
  startDate: string;
  isEditable?: boolean;
  project?: Project;
  trailers?: any[];
  teams?: any[];
  onUpdateProject?: (project: Project) => void;
  onUpdateTrailer?: (trailer: any) => void; // Add this prop to handle scaffolding updates
}

export function ProjectChecklist({ 
  checklist, 
  onChecklistUpdate, 
  startDate,
  isEditable = true,
  project,
  trailers = [],
  teams = [],
  onUpdateProject,
  onUpdateTrailer // Add this prop
}: ProjectChecklistProps) {
  const { toast } = useToast();
  const [materialAnswer, setMaterialAnswer] = useState<'yes' | 'no' | null>(
    project?.avvaratMaterial?.hasLeftoverMaterial === true ? 'yes' : 
    project?.avvaratMaterial?.hasLeftoverMaterial === false ? 'no' : null
  );

  // Check if all work phases are confirmed (completed + inspection confirmed)
  const allWorkPhasesConfirmed = project ? areAllWorkPhasesConfirmed(project.workPhases || []) : false;

  // Find the index of "Dagliga egenkontroller" to determine which items to lock
  const dailyInspectionIndex = checklist.findIndex(item => item.label === 'Dagliga egenkontroller');

  const isItemLocked = (index: number): boolean => {
    // Lock items from "Dagliga egenkontroller" onwards if work phases are not all confirmed
    if (dailyInspectionIndex >= 0 && index >= dailyInspectionIndex && !allWorkPhasesConfirmed) {
      return true;
    }
    return false;
  };
  
  // WhatsApp state management
  const [whatsappStates, setWhatsappStates] = useState<{[key: string]: {
    status: 'idle' | 'opened' | 'confirmed';
    openedAt?: number;
    customGroupName?: string;
  }}>({});
  
  const [showGroupNameEdit, setShowGroupNameEdit] = useState<{[key: string]: boolean}>({});
  const [timers, setTimers] = useState<{ [key: string]: number }>({});

  // Container booking state management  
  const [containerStates, setContainerStates] = useState<{[key: string]: {
    status: 'idle' | 'opened' | 'confirmed';
    openedAt?: number;
  }}>({});
  
  // Warranty generator state
  const [showWarrantyGenerator, setShowWarrantyGenerator] = useState(false);

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
    project.avvaratMaterial.materials &&
    project.avvaratMaterial.materials.length > 0 &&
    project.avvaratMaterial.materials.every(m => m.materialType && m.squareMeters > 0) &&
    project.avvaratMaterial.storageLocation &&
    project.avvaratMaterial.dateNoted &&
    project.avvaratMaterial.responsiblePerson &&
    project.avvaratMaterial.plannedAction
  );

  const canMarkAsCompleted = completionPercentage === 100 && !hasIncompleteLeftoverMaterial;

  // WhatsApp helper functions
  const generateWhatsAppURL = (project: Project, customName?: string) => {
    const groupName = customName || project.address;
    const groupInstructions = encodeURIComponent(`Hej! Skapa en WhatsApp-grupp med namnet "${groupName}" för projektet ${project.address}. Bjud in alla teammedlemmar.`);
    return `https://wa.me/?text=${groupInstructions}`;
  };

  const openWhatsApp = (itemId: string, project: Project) => {
    const state = whatsappStates[itemId];
    const groupName = state?.customGroupName || project.address;
    const url = generateWhatsAppURL(project, groupName);
    
    // Update state to show WhatsApp has been opened
    setWhatsappStates(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        status: 'opened',
        openedAt: Date.now()
      }
    }));
    
    // Start countdown timer
    setTimers(prev => ({ ...prev, [itemId]: 120 })); // 2 minutes = 120 seconds
    
    const countdownInterval = setInterval(() => {
      setTimers(current => {
        const newTime = (current[itemId] || 0) - 1;
        if (newTime <= 0) {
          clearInterval(countdownInterval);
          // Show reminder when timer reaches 0
          setWhatsappStates(currentStates => {
            if (currentStates[itemId]?.status === 'opened') {
              toast({
                title: "WhatsApp påminnelse",
                description: "Glöm inte att bekräfta att WhatsApp-gruppen är skapad!",
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
    
    window.open(url, '_blank');
  };

  const confirmWhatsAppGroup = (itemId: string) => {
    setWhatsappStates(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        status: 'confirmed'
      }
    }));
    
    // Clear timer when confirmed
    setTimers(prev => ({ ...prev, [itemId]: 0 }));
    
    // Mark checklist item as completed
    handleItemToggle(itemId);
  };

  const resetWhatsAppStatus = (itemId: string) => {
    setWhatsappStates(prev => ({
      ...prev,
      [itemId]: {
        status: 'idle',
        customGroupName: prev[itemId]?.customGroupName
      }
    }));
    
    // Clear timer when reset
    setTimers(prev => ({ ...prev, [itemId]: 0 }));
  };

  const updateGroupName = (itemId: string, groupName: string) => {
    setWhatsappStates(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        customGroupName: groupName
      }
    }));
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

  const isWhatsAppItem = (itemLabel: string) => {
    return itemLabel.toLowerCase().includes('whatsapp') || 
           itemLabel.toLowerCase().includes('whats app') ||
           itemLabel.toLowerCase().includes('chat') ||
           itemLabel.toLowerCase().includes('grupp');
  };

  // Container booking helper functions
  const isContainerBookingItem = (itemLabel: string) => {
    return itemLabel.toLowerCase().includes('boka hemtag av container') || 
           itemLabel.toLowerCase().includes('bokad hemtag av container') ||
           itemLabel.toLowerCase().includes('container hemtag');
  };

  // Container order helper functions
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

  const generateContainerOrderOutlookURL = (project: Project) => {
    const subject = encodeURIComponent(`Boka container - ${project.name}`);
    const body = encodeURIComponent(`Hej vi skulle vilja boka container till ${project.address}

Projektnamn: ${project.name}
Adress: ${project.address}

Tack!`);
    
    return `mailto:?subject=${subject}&body=${body}`;
  };

  const openOutlook = (itemId: string, project: Project) => {
    // First copy the address
    copyToClipboard(project.address);
    
    // Show toast about copied address
    toast({
      title: "Adress kopierad!",
      description: "Projektadressen har kopierats för att hitta rätt mailtråd",
      duration: 3000,
    });
    
    // Update state to show Outlook has been opened
    setContainerStates(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        status: 'opened',
        openedAt: Date.now()
      }
    }));
    
    // Start countdown timer for container booking (same as WhatsApp)
    setTimers(prev => ({ ...prev, [itemId]: 120 })); // 2 minutes = 120 seconds
    
    const countdownInterval = setInterval(() => {
      setTimers(current => {
        const newTime = (current[itemId] || 0) - 1;
        if (newTime <= 0) {
          clearInterval(countdownInterval);
          // Show reminder when timer reaches 0
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
    
    // Try different methods to open email client
    const url = generateOutlookURL(project);
    
    // Method 1: Try to open mailto link
    try {
      window.location.href = url;
    } catch (error) {
      // Method 2: Try using window.open as fallback
      try {
        window.open(url, '_blank');
      } catch (fallbackError) {
        // Method 3: Show manual instructions
        toast({
          title: "Öppna din e-postapp manuellt",
          description: "Kopiera länken och öppna din e-postapp för att skicka mailet",
          duration: 5000,
        });
      }
    }
  };

  const openContainerOrderOutlook = (itemId: string, project: Project) => {
    // First copy the message text
    const messageText = `Hej vi skulle vilja boka container till ${project.address}`;
    copyToClipboard(messageText);
    
    // Show toast about copied text
    toast({
      title: "Text kopierad!",
      description: "Meddelandet har kopierats",
      duration: 3000,
    });
    
    // Update state to show Outlook has been opened
    setContainerStates(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        status: 'opened',
        openedAt: Date.now()
      }
    }));
    
    // Start countdown timer for container order (same as WhatsApp)
    setTimers(prev => ({ ...prev, [itemId]: 120 })); // 2 minutes = 120 seconds
    
    const countdownInterval = setInterval(() => {
      setTimers(current => {
        const newTime = (current[itemId] || 0) - 1;
        if (newTime <= 0) {
          clearInterval(countdownInterval);
          // Show reminder when timer reaches 0
          setContainerStates(currentStates => {
            if (currentStates[itemId]?.status === 'opened') {
              toast({
                title: "Container påminnelse",
                description: "Glöm inte att bekräfta att du har bokat container!",
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
    
    // Try different methods to open email client
    const url = generateContainerOrderOutlookURL(project);
    
    // Method 1: Try to open mailto link
    try {
      window.location.href = url;
    } catch (error) {
      // Method 2: Try using window.open as fallback
      try {
        window.open(url, '_blank');
      } catch (fallbackError) {
        // Method 3: Show manual instructions
        toast({
          title: "Öppna din e-postapp manuellt",
          description: "Kopiera länken och öppna din e-postapp för att skicka mailet",
          duration: 5000,
        });
      }
    }
  };

  const confirmContainerBooking = (itemId: string) => {
    // Clear timer
    setTimers(prev => {
      const newTimers = { ...prev };
      delete newTimers[itemId];
      return newTimers;
    });
    
    setContainerStates(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        status: 'confirmed'
      }
    }));
    
    // Mark checklist item as completed
    handleItemToggle(itemId);
  };

  const resetContainerStatus = (itemId: string) => {
    // Clear timer
    setTimers(prev => {
      const newTimers = { ...prev };
      delete newTimers[itemId];
      return newTimers;
    });
    
    setContainerStates(prev => ({
      ...prev,
      [itemId]: {
        status: 'idle'
      }
    }));
  };

  const addMaterialItem = () => {
    if (!project || !onUpdateProject) return;
    
    const newMaterial: MaterialItem = {
      id: `material-${Date.now()}`,
      materialType: 'Takpannor',
      squareMeters: 0
    };
    
    const currentMaterials = project.avvaratMaterial?.materials || [];
    const updatedProject = {
      ...project,
      avvaratMaterial: {
        ...project.avvaratMaterial,
        hasLeftoverMaterial: materialAnswer === 'yes',
        materials: [...currentMaterials, newMaterial]
      }
    };
    onUpdateProject(updatedProject);
  };

  const removeMaterialItem = (materialId: string) => {
    if (!project || !onUpdateProject) return;
    
    const currentMaterials = project.avvaratMaterial?.materials || [];
    const updatedProject = {
      ...project,
      avvaratMaterial: {
        ...project.avvaratMaterial,
        hasLeftoverMaterial: materialAnswer === 'yes',
        materials: currentMaterials.filter(m => m.id !== materialId)
      }
    };
    onUpdateProject(updatedProject);
  };

  const updateMaterialItem = (materialId: string, field: keyof MaterialItem, value: any) => {
    if (!project || !onUpdateProject) return;
    
    const currentMaterials = project.avvaratMaterial?.materials || [];
    const updatedMaterials = currentMaterials.map(material => 
      material.id === materialId 
        ? { ...material, [field]: value }
        : material
    );
    
    const updatedProject = {
      ...project,
      avvaratMaterial: {
        ...project.avvaratMaterial,
        hasLeftoverMaterial: materialAnswer === 'yes',
        materials: updatedMaterials
      }
    };
    onUpdateProject(updatedProject);
  };

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
    
    // Check if item is locked
    const itemIndex = checklist.findIndex(item => item.id === itemId);
    if (itemIndex >= 0 && isItemLocked(itemIndex)) {
      toast({
        title: "Låst",
        description: "Alla arbetsmoment måste vara färdiga med bekräftade egenkontroller först",
        variant: "destructive",
      });
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
    
    // Handle scaffolding release when "Nedmontering av ställningar" is checked
    const updatedItem = updatedChecklist.find(item => item.id === itemId);
    const isScaffoldingDismantling = updatedItem?.label === 'Nedmontering av ställningar';
    
    if (isScaffoldingDismantling && updatedItem?.completed && project?.assignedTrailer && onUpdateTrailer) {
      // Find the assigned trailer and release it
      const assignedTrailer = trailers.find(trailer => trailer.id === project.assignedTrailer);
      if (assignedTrailer) {
        const updatedTrailer = {
          ...assignedTrailer,
          status: 'Tillgänglig',
          assignedProject: undefined,
          lastUpdated: new Date().toISOString().split('T')[0]
        };
        onUpdateTrailer(updatedTrailer);
        
        // Also clear the trailer assignment from the project
        if (onUpdateProject) {
          const updatedProjectWithoutTrailer = {
            ...project,
            assignedTrailer: undefined,
            checklist: updatedChecklist,
            completionPercentage: newCompletionPercentage,
          };
          onUpdateProject(updatedProjectWithoutTrailer);
        }
        
        // Show success message
        toast({
          title: "Ställningsvagn friggjord",
          description: `${assignedTrailer.name} är nu tillgänglig för nya projekt`,
          duration: 3000,
        });
      }
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
            const isWhatsApp = isWhatsAppItem(item.label);
            const isContainerBooking = isContainerBookingItem(item.label);
            const isContainerOrder = isContainerOrderItem(item.label);
            const hasTrailerAssigned = !!project?.assignedTrailer;
            const isDailyInspections = item.label === 'Dagliga egenkontroller';
            const hasTeamAssigned = !!(project?.constructionTeam && teams.some(team => team.name === project.constructionTeam));
            const itemLocked = isItemLocked(index);
            
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
                      : itemLocked 
                        ? 'bg-muted/30 border-muted cursor-not-allowed opacity-60'
                        : 'bg-card border-border hover:bg-accent/50'
                  } ${isEditable && !isAvvaratMaterial && !itemLocked ? 'cursor-pointer' : ''}`}
                  onClick={() => {
                    if (itemLocked) return; // Locked items disabled for click
                    if (isBookScaffolding || isAvvaratMaterial || isWhatsApp || isContainerBooking || isContainerOrder) return; // These items disabled for manual click
                    if (isDailyInspections && !allWorkPhasesConfirmed) return; // Daily inspections disabled until all work phases confirmed
                    if (isScheduleTeam && !hasTeamAssigned) return; // Team scheduling disabled if no team assigned
                    handleItemToggle(item.id);
                  }}
                >
                  {!isAvvaratMaterial ? (
                    <div className="flex items-center">
                      <Checkbox 
                        id={item.id}
                        checked={!!isItemComplete}
                        onCheckedChange={() => {
                          if (itemLocked) return; // Locked items disabled
                          if (isBookScaffolding || isWhatsApp || isContainerBooking) return; // These items disabled for manual completion
                          if (isDailyInspections && !allWorkPhasesConfirmed) return; // Daily inspections disabled until all work phases confirmed
                          if (isScheduleTeam && !hasTeamAssigned) return; // Team scheduling disabled if no team assigned
                          handleItemToggle(item.id);
                        }}
                        disabled={!isEditable || itemLocked || isBookScaffolding || isWhatsApp || isContainerBooking || (isDailyInspections && !allWorkPhasesConfirmed) || (isScheduleTeam && !hasTeamAssigned)}
                        className="data-[state=checked]:bg-success data-[state=checked]:border-success"
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
                         : isWhatsApp
                           ? (isItemComplete ? "Skapat WhatsApp grupp" : "Skapa WhatsApp grupp")
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
                                // Releasing current trailer
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
                                // Assigning new trailer
                                const selectedTrailer = trailers.find(t => t.id === trailerId);
                                if (selectedTrailer && onUpdateTrailer) {
                                  // Release old trailer if exists
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
                                  
                                  // Update new trailer
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
                                
                                // Mark the scaffolding item as complete if not already completed
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
                         
                         {/* Responsible person field */}
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
                      
                    {/* Enhanced WhatsApp Integration */}
                    {isWhatsApp && project && (
                      <div className="mt-3 p-3 bg-accent/30 rounded-lg border border-accent/50 space-y-3">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-primary" />
                          <span className="text-xs font-medium text-primary">WhatsApp Grupp</span>
                        </div>
                        
                        {/* Group name preview/edit */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Gruppnamn:</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => setShowGroupNameEdit(prev => ({
                                ...prev,
                                [item.id]: !prev[item.id]
                              }))}
                            >
                              {showGroupNameEdit[item.id] ? 'Spara' : 'Ändra'}
                            </Button>
                          </div>
                          
                          {showGroupNameEdit[item.id] ? (
                            <Input
                              className="h-7 text-xs"
                              value={whatsappStates[item.id]?.customGroupName || project.address}
                              onChange={(e) => updateGroupName(item.id, e.target.value)}
                              placeholder="Ange gruppnamn"
                            />
                           ) : (
                             <div className="flex items-center justify-between p-2 bg-background/50 rounded">
                               <span className="text-xs font-medium">
                                 {whatsappStates[item.id]?.customGroupName || project.address}
                               </span>
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 className="h-6 w-6 p-0 ml-2"
                                 onClick={() => copyToClipboard(whatsappStates[item.id]?.customGroupName || project.address)}
                               >
                                 <Copy className="h-3 w-3" />
                               </Button>
                             </div>
                           )}
                        </div>

                        {/* Status and actions */}
                        {(() => {
                          const state = whatsappStates[item.id];
                          const status = state?.status || 'idle';
                          
                          switch (status) {
                            case 'idle':
                              return (
                                <div className="space-y-2">
                                  <p className="text-xs text-muted-foreground">
                                    Klicka för att öppna WhatsApp och skapa en grupp med förslaget namn.
                                  </p>
                                  <Button
                                    size="sm"
                                    onClick={() => openWhatsApp(item.id, project)}
                                    className="w-full h-8 text-xs bg-[#25D366] hover:bg-[#25D366]/80 text-white"
                                  >
                                    <MessageCircle className="w-3 h-3 mr-1" />
                                    Öppna WhatsApp
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
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs text-amber-600">
                                      <Clock className="w-3 h-3" />
                                      <span>WhatsApp öppnad - väntar på bekräftelse</span>
                                    </div>
                                    {timeLeft > 0 && (
                                      <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                        {timeDisplay}
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Har du skapat gruppen? Bekräfta när du är klar.
                                    {timeLeft > 0 && (
                                      <span className="block mt-1 text-amber-600">
                                        Påminnelse om {timeDisplay}
                                      </span>
                                    )}
                                  </p>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => confirmWhatsAppGroup(item.id)}
                                      className="flex-1 h-8 text-xs"
                                    >
                                      <Check className="w-3 h-3 mr-1" />
                                      Grupp skapad
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => resetWhatsAppStatus(item.id)}
                                      className="h-8 text-xs"
                                    >
                                      Börja om
                                    </Button>
                                  </div>
                                </div>
                              );
                            
                            case 'confirmed':
                              return (
                                <div className="flex items-center gap-2 text-xs text-success">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>WhatsApp-grupp skapad och bekräftad</span>
                                </div>
                              );
                            
                            default:
                              return null;
                          }
                        })()}
                      </div>
                    )}

                    {/* Container Booking Integration */}
                    {isContainerBooking && project && (
                      <div className="mt-3 p-3 bg-accent/30 rounded-lg border border-accent/50 space-y-3">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-primary" />
                          <span className="text-xs font-medium text-primary">Container Hemtag</span>
                        </div>
                        
                        {/* Address preview */}
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

                        {/* Status and actions */}
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
                                    onClick={() => {
                                      // Open Outlook web app
                                      window.open('https://outlook.office.com', '_blank');
                                      openOutlook(item.id, project);
                                    }}
                                    className="w-full h-8 text-xs bg-[#0078D4] hover:bg-[#0078D4]/80 text-white"
                                  >
                                    <Mail className="w-3 h-3 mr-1" />
                                    Öppna Outlook
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
                            
                            case 'confirmed':
                              return (
                                <div className="flex items-center gap-2 text-xs text-success">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Container hemtag bokad och bekräftad</span>
                                </div>
                              );
                            
                            default:
                              return null;
                          }
                        })()}
                       </div>
                     )}

                     {/* Enhanced Container Order Integration */}
                     {isContainerOrder && project && (
                       <div className="mt-3 p-3 bg-accent/30 rounded-lg border border-accent/50 space-y-3">
                         <div className="flex items-center gap-2">
                           <Package className="w-4 h-4 text-primary" />
                           <span className="text-xs font-medium text-primary">Container Beställning</span>
                         </div>
                         
                         {/* Message text preview */}
                         <div className="space-y-2">
                           <span className="text-xs text-muted-foreground">Meddelande att skicka:</span>
                           <div className="flex items-center justify-between p-2 bg-background/50 rounded">
                             <span className="text-xs font-medium">
                               Hej vi skulle vilja boka container till {project.address}
                             </span>
                             <Button
                               variant="ghost"
                               size="sm"
                               className="h-6 w-6 p-0 ml-2"
                               onClick={() => copyToClipboard(`Hej vi skulle vilja boka container till ${project.address}`)}
                             >
                               <Copy className="h-3 w-3" />
                             </Button>
                           </div>
                         </div>

                         {/* Status and actions */}
                         {(() => {
                           const state = containerStates[item.id];
                           const status = state?.status || 'idle';
                           
                           switch (status) {
                             case 'idle':
                               return (
                                 <div className="space-y-2">
                                   <p className="text-xs text-muted-foreground">
                                     Klicka för att öppna Outlook och skicka containerbeställning.
                                   </p>
                                   <Button
                                     size="sm"
                                     onClick={() => {
                                       // Open Outlook web app
                                       window.open('https://outlook.office.com', '_blank');
                                       openContainerOrderOutlook(item.id, project);
                                     }}
                                     className="w-full h-8 text-xs bg-[#0078D4] hover:bg-[#0078D4]/80 text-white"
                                   >
                                     <Mail className="w-3 h-3 mr-1" />
                                     Öppna Outlook
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
                                     Har du skickat emailet för container beställning? Bekräfta när du är klar.
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
                             
                             case 'confirmed':
                               return (
                                 <div className="flex items-center gap-2 text-xs text-success">
                                   <CheckCircle2 className="w-3 h-3" />
                                   <span>Container beställning skickad och bekräftad</span>
                                 </div>
                               );
                             
                             default:
                               return null;
                           }
                         })()}
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
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-medium">Material som finns kvar</Label>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={addMaterialItem}
                                className="h-6 w-6 p-0"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            
                            {/* Material items list */}
                            <div className="space-y-3">
                              {(project.avvaratMaterial?.materials || []).map((material, index) => (
                                <div key={material.id} className="space-y-2 p-3 border rounded bg-background">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground">Material {index + 1}</span>
                                    {(project.avvaratMaterial?.materials?.length || 0) > 1 && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => removeMaterialItem(material.id)}
                                        className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <Label className="text-xs">Materialtyp</Label>
                                      <Select
                                        value={material.materialType}
                                        onValueChange={(value) => updateMaterialItem(material.id, 'materialType', value as MaterialType)}
                                      >
                                        <SelectTrigger className="h-7 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-background border border-border shadow-lg z-50">
                                          {materialTypes.map((type) => (
                                            <SelectItem key={type} value={type}>{type}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    
                                     <div className="space-y-1">
                                       <Label className="text-xs">{getMaterialUnit(material.materialType)}</Label>
                                       <Input
                                         className="h-7 text-xs"
                                         type="number"
                                         step="0.1"
                                         min="0"
                                         value={material.squareMeters || ''}
                                         onChange={(e) => updateMaterialItem(material.id, 'squareMeters', parseFloat(e.target.value) || 0)}
                                         placeholder={`Ange ${getMaterialUnit(material.materialType).toLowerCase()}`}
                                       />
                                     </div>
                                  </div>
                                  
                                  {material.materialType === 'Annat' && (
                                    <div className="space-y-1">
                                      <Label className="text-xs">Ange materialtyp</Label>
                                      <Input
                                        className="h-7 text-xs"
                                        placeholder="Beskriv materialtypen"
                                        value={material.customMaterialType || ''}
                                        onChange={(e) => updateMaterialItem(material.id, 'customMaterialType', e.target.value)}
                                      />
                                    </div>
                                  )}
                                </div>
                              ))}
                              
                              {/* If no materials, show add button */}
                              {(!project.avvaratMaterial?.materials || project.avvaratMaterial.materials.length === 0) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={addMaterialItem}
                                  className="w-full h-8 text-xs"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Lägg till material
                                </Button>
                              )}
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
        
        {/* Warranty Generator Section */}
        {project && completionPercentage >= 80 && (
          <div className="mt-6 p-4 bg-success/5 border border-success/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-success flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Garantibevis
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Projektet är nästan klart. Generera garantibevis för kunden.
                </p>
              </div>
              <Button
                onClick={() => setShowWarrantyGenerator(true)}
                variant="outline"
                size="sm"
                className="bg-success/10 border-success/30 text-success hover:bg-success/20"
              >
                <FileText className="w-4 h-4 mr-2" />
                Generera garantibevis
              </Button>
            </div>
          </div>
        )}

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
      
      {/* Warranty Generator Modal */}
      {project && (
        <WarrantyGenerator
          project={project}
          isOpen={showWarrantyGenerator}
          onClose={() => setShowWarrantyGenerator(false)}
          onGenerated={() => {
            toast({
              title: "Garantibevis genererat",
              description: "Garantibeviset har skapats och sparats",
            });
          }}
        />
      )}
    </Card>
  );
}