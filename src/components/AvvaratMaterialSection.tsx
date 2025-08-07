import { useState } from 'react';
import { Project, StorageLocation, PlannedAction } from '@/types/project';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ChevronDown, Recycle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AvvaratMaterialSectionProps {
  project: Project;
  onUpdateProject: (updatedProject: Project) => void;
}

export function AvvaratMaterialSection({ project, onUpdateProject }: AvvaratMaterialSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    project.avvaratMaterial?.dateNoted ? new Date(project.avvaratMaterial.dateNoted) : undefined
  );

  const storageLocations: StorageLocation[] = [
    'Hos kund', 'Ställningspark', 'I bil', 'Montörens garage', 'Annat'
  ];

  const plannedActions: PlannedAction[] = [
    'Användas i framtida projekt', 'Transporteras till ställningspark', 'Returneras till leverantör', 'Kasseras', 'Annat'
  ];

  const responsiblePersons = [
    'Anna Lindberg', 'Marcus Holm', 'Johan Svensson', 'Lisa Pettersson'
  ];

  const handleCheckboxChange = (checked: boolean) => {
    const updatedProject = {
      ...project,
      avvaratMaterial: {
        ...project.avvaratMaterial,
        hasLeftoverMaterial: checked,
        // Clear other fields if unchecked
        ...(checked ? {} : {
          materialDescription: undefined,
          storageLocation: undefined,
          customStorageLocation: undefined,
          dateNoted: undefined,
          responsiblePerson: undefined,
          plannedAction: undefined,
          customPlannedAction: undefined,
          comments: undefined,
        })
      }
    };
    if (!checked) {
      setSelectedDate(undefined);
    }
    onUpdateProject(updatedProject);
  };

  const handleFieldChange = (field: string, value: any) => {
    const updatedProject = {
      ...project,
      avvaratMaterial: {
        ...project.avvaratMaterial,
        hasLeftoverMaterial: project.avvaratMaterial?.hasLeftoverMaterial || false,
        [field]: value
      }
    };
    onUpdateProject(updatedProject);
  };

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    handleFieldChange('dateNoted', date?.toISOString());
  };

  const isFormComplete = () => {
    const material = project.avvaratMaterial;
    if (!material?.hasLeftoverMaterial) return true;
    
    return !!(
      material.materialDescription &&
      material.storageLocation &&
      material.dateNoted &&
      material.responsiblePerson &&
      material.plannedAction
    );
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between p-3 h-auto border rounded-lg bg-muted/30 hover:bg-muted/50"
        >
          <div className="flex items-center gap-2">
            <Recycle className="w-4 h-4 text-primary" />
            <span className="font-medium">🔄 Avvarat material</span>
            {project.avvaratMaterial?.hasLeftoverMaterial && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-warning rounded-full" />
                <span className="text-xs text-muted-foreground">Kvar material</span>
              </div>
            )}
          </div>
          <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="space-y-4 pt-4">
        <div className="space-y-4 p-4 border rounded-lg bg-card">
          {/* Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="material-leftover"
              checked={project.avvaratMaterial?.hasLeftoverMaterial || false}
              onCheckedChange={handleCheckboxChange}
            />
            <Label htmlFor="material-leftover" className="text-sm font-medium">
              ☑️ Avvarat material finns
            </Label>
          </div>

          {project.avvaratMaterial?.hasLeftoverMaterial && (
            <div className="space-y-4 pl-6 border-l-2 border-primary/20">
              {/* Material Description */}
              <div className="space-y-2">
                <Label className="text-sm">🏷️ Materialtyp och beskrivning</Label>
                <Input
                  placeholder="t.ex. 2 rullar underlagspapp, 50 takpannor"
                  value={project.avvaratMaterial.materialDescription || ''}
                  onChange={(e) => handleFieldChange('materialDescription', e.target.value)}
                />
              </div>

              {/* Storage Location */}
              <div className="space-y-2">
                <Label className="text-sm">📍 Förvaringsplats</Label>
                <Select
                  value={project.avvaratMaterial.storageLocation || ''}
                  onValueChange={(value) => handleFieldChange('storageLocation', value as StorageLocation)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Välj förvaringsplats" />
                  </SelectTrigger>
                  <SelectContent>
                    {storageLocations.map((location) => (
                      <SelectItem key={location} value={location}>{location}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Storage Location */}
              {project.avvaratMaterial.storageLocation === 'Annat' && (
                <div className="space-y-2">
                  <Label className="text-sm">📍 Ange annan förvaringsplats</Label>
                  <Input
                    placeholder="Beskriv förvaringsplatsen"
                    value={project.avvaratMaterial.customStorageLocation || ''}
                    onChange={(e) => handleFieldChange('customStorageLocation', e.target.value)}
                  />
                </div>
              )}

              {/* Date Picker */}
              <div className="space-y-2">
                <Label className="text-sm">📆 Datum då materialet noterades</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : <span>Välj datum</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateChange}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Responsible Person */}
              <div className="space-y-2">
                <Label className="text-sm">👤 Ansvarig person</Label>
                <Select
                  value={project.avvaratMaterial.responsiblePerson || ''}
                  onValueChange={(value) => handleFieldChange('responsiblePerson', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Välj ansvarig person" />
                  </SelectTrigger>
                  <SelectContent>
                    {responsiblePersons.map((person) => (
                      <SelectItem key={person} value={person}>{person}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Planned Action */}
              <div className="space-y-2">
                <Label className="text-sm">📋 Planerad åtgärd</Label>
                <Select
                  value={project.avvaratMaterial.plannedAction || ''}
                  onValueChange={(value) => handleFieldChange('plannedAction', value as PlannedAction)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Välj planerad åtgärd" />
                  </SelectTrigger>
                  <SelectContent>
                    {plannedActions.map((action) => (
                      <SelectItem key={action} value={action}>{action}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Planned Action */}
              {project.avvaratMaterial.plannedAction === 'Annat' && (
                <div className="space-y-2">
                  <Label className="text-sm">📋 Ange annan åtgärd</Label>
                  <Input
                    placeholder="Beskriv den planerade åtgärden"
                    value={project.avvaratMaterial.customPlannedAction || ''}
                    onChange={(e) => handleFieldChange('customPlannedAction', e.target.value)}
                  />
                </div>
              )}

              {/* Comments */}
              <div className="space-y-2">
                <Label className="text-sm">📝 Kommentar (valfritt)</Label>
                <Textarea
                  placeholder="Extra information om det avvarade materialet"
                  value={project.avvaratMaterial.comments || ''}
                  onChange={(e) => handleFieldChange('comments', e.target.value)}
                />
              </div>

              {/* Validation indicator */}
              {!isFormComplete() && (
                <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <div className="w-2 h-2 bg-warning rounded-full" />
                  <span className="text-sm text-foreground">
                    Fyll i alla obligatoriska fält för att kunna markera projektet som färdigt
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}