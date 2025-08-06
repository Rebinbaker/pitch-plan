import { useState } from 'react';
import { Project, MaterialType, StorageLocation } from '@/types/project';
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
    project.avvaratMaterial?.dateOfReservation ? new Date(project.avvaratMaterial.dateOfReservation) : undefined
  );

  const materialTypes: MaterialType[] = [
    'Takpannor', 'Underlagspapp', 'Nockpannor', 'Råspont', 'Vindskivor', 'Reglar', 'Övrigt'
  ];

  const storageLocations: StorageLocation[] = [
    'Lundavägen 20', 'Nålvägen Gusum'
  ];

  const responsiblePersons = [
    'Anna Lindberg', 'Marcus Holm', 'Johan Svensson', 'Lisa Pettersson'
  ];

  const handleCheckboxChange = (checked: boolean) => {
    const updatedProject = {
      ...project,
      avvaratMaterial: {
        ...project.avvaratMaterial,
        isReserved: checked,
        // Clear other fields if unchecked
        ...(checked ? {} : {
          materialType: undefined,
          storageLocation: undefined,
          dateOfReservation: undefined,
          responsiblePerson: undefined,
          quantity: undefined,
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
        isReserved: project.avvaratMaterial?.isReserved || false,
        [field]: value
      }
    };
    onUpdateProject(updatedProject);
  };

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    handleFieldChange('dateOfReservation', date?.toISOString());
  };

  const isFormComplete = () => {
    const material = project.avvaratMaterial;
    if (!material?.isReserved) return true;
    
    return !!(
      material.materialType &&
      material.storageLocation &&
      material.dateOfReservation &&
      material.responsiblePerson
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
            {project.avvaratMaterial?.isReserved && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                <span className="text-xs text-muted-foreground">Reserved</span>
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
              id="material-reserved"
              checked={project.avvaratMaterial?.isReserved || false}
              onCheckedChange={handleCheckboxChange}
            />
            <Label htmlFor="material-reserved" className="text-sm font-medium">
              ✅ Material has been avvarat (reserved)
            </Label>
          </div>

          {project.avvaratMaterial?.isReserved && (
            <div className="space-y-4 pl-6 border-l-2 border-primary/20">
              {/* Material Type */}
              <div className="space-y-2">
                <Label className="text-sm">🏷️ Material type</Label>
                <Select
                  value={project.avvaratMaterial.materialType || ''}
                  onValueChange={(value) => handleFieldChange('materialType', value as MaterialType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select material type" />
                  </SelectTrigger>
                  <SelectContent>
                    {materialTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Storage Location */}
              <div className="space-y-2">
                <Label className="text-sm">📍 Storage location</Label>
                <Select
                  value={project.avvaratMaterial.storageLocation || ''}
                  onValueChange={(value) => handleFieldChange('storageLocation', value as StorageLocation)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select storage location" />
                  </SelectTrigger>
                  <SelectContent>
                    {storageLocations.map((location) => (
                      <SelectItem key={location} value={location}>{location}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Picker */}
              <div className="space-y-2">
                <Label className="text-sm">📆 Date of reservation</Label>
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
                      {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
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
                <Label className="text-sm">👤 Responsible person</Label>
                <Select
                  value={project.avvaratMaterial.responsiblePerson || ''}
                  onValueChange={(value) => handleFieldChange('responsiblePerson', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select responsible person" />
                  </SelectTrigger>
                  <SelectContent>
                    {responsiblePersons.map((person) => (
                      <SelectItem key={person} value={person}>{person}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity/Description */}
              <div className="space-y-2">
                <Label className="text-sm">🔢 Quantity / Description (optional)</Label>
                <Input
                  placeholder="e.g., 50 takpannor, 10 m² underlagspapp"
                  value={project.avvaratMaterial.quantity || ''}
                  onChange={(e) => handleFieldChange('quantity', e.target.value)}
                />
              </div>

              {/* Comments */}
              <div className="space-y-2">
                <Label className="text-sm">📝 Comments (optional)</Label>
                <Textarea
                  placeholder="Additional notes about the reserved material"
                  value={project.avvaratMaterial.comments || ''}
                  onChange={(e) => handleFieldChange('comments', e.target.value)}
                />
              </div>

              {/* Validation indicator */}
              {!isFormComplete() && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                  <span className="text-sm text-yellow-700">
                    Complete all required fields to allow project completion
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