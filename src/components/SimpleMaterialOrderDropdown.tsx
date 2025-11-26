import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Package, Mail, Copy, Plus, X, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Project, MaterialType, getMaterialUnit, MaterialOrder, MaterialOrderItem } from '@/types/project';
import { getLinkopingInventory } from '@/utils/linkopingInventory';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SimpleMaterialOrderDropdownProps {
  project: Project;
  allProjects: Project[];
  onOrderSaved: (materialOrder: MaterialOrder) => void;
}

interface SelectedMaterial {
  id: string;
  materialType: MaterialType;
  customMaterialType?: string;
  quantity: number;
  unit: string;
}

const MATERIAL_TYPES: MaterialType[] = ['Takpannor', 'Underlagsduk', 'Läkt', 'Plåtdetaljer', 'Isolering', 'Annat'];

export function SimpleMaterialOrderDropdown({ project, allProjects, onOrderSaved }: SimpleMaterialOrderDropdownProps) {
  const { toast } = useToast();
  const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterial[]>(
    project.materialOrder?.items.map(item => ({
      id: item.id,
      materialType: item.materialType,
      customMaterialType: item.customMaterialType,
      quantity: item.quantity,
      unit: item.unit
    })) || []
  );
  const [currentMaterialType, setCurrentMaterialType] = useState<string>('');
  const [customMaterialType, setCustomMaterialType] = useState<string>('');
  const [notes, setNotes] = useState<string>(project.materialOrder?.notes || '');
  const [isOpen, setIsOpen] = useState(false);

  // Check for available materials in Linköping
  const linkopingInventory = getLinkopingInventory(allProjects);
  const hasAvailableMaterials = linkopingInventory.length > 0;

  const addMaterial = () => {
    if (!currentMaterialType) return;

    const materialType = currentMaterialType as MaterialType;
    const unit = getMaterialUnit(materialType);

    const existingMaterial = selectedMaterials.find(m => 
      m.materialType === materialType && 
      (!materialType.includes('Annat') || m.customMaterialType === customMaterialType)
    );

    if (existingMaterial) {
      toast({
        title: "Material finns redan",
        description: "Uppdatera kvantiteten istället.",
        variant: "destructive"
      });
      return;
    }

    const newMaterial: SelectedMaterial = {
      id: `${Date.now()}`,
      materialType,
      customMaterialType: materialType === 'Annat' ? customMaterialType : undefined,
      quantity: 1,
      unit
    };

    setSelectedMaterials(prev => [...prev, newMaterial]);
    setCurrentMaterialType('');
    setCustomMaterialType('');
  };

  const removeMaterial = (materialId: string) => {
    setSelectedMaterials(prev => prev.filter(m => m.id !== materialId));
  };

  const updateQuantity = (materialId: string, quantity: number) => {
    if (quantity < 1) {
      removeMaterial(materialId);
      return;
    }
    setSelectedMaterials(prev =>
      prev.map(m => m.id === materialId ? { ...m, quantity } : m)
    );
  };

  const generateOrderText = () => {
    if (selectedMaterials.length === 0) return '';
    
    const materialList = selectedMaterials.map(material => {
      const name = material.materialType === 'Annat' 
        ? material.customMaterialType 
        : material.materialType;
      return `• ${material.quantity} ${material.unit} ${name}`;
    }).join('\n');

    const deliveryWeek = project.bygg_start_vecka || project.constructionStartWeek || 'Ej angivet';

    return `Hej,

Vi behöver beställa följande material till:

Projekt: ${project.name}
Adress: ${project.address || 'Ej angiven'}
Leveransvecka: ${deliveryWeek}

Material:
${materialList}

${notes ? `\nKommentar:\n${notes}\n` : ''}
Kontakta oss för leveransdetaljer.

Med vänliga hälsningar,
Lokala Hantverkarna`;
  };

  const copyOrderText = () => {
    if (selectedMaterials.length === 0) {
      toast({
        title: "Ingen beställning",
        description: "Lägg till material först.",
        variant: "destructive"
      });
      return;
    }

    const orderText = generateOrderText();
    navigator.clipboard.writeText(orderText);
    
    toast({
      title: "Beställningstext kopierad",
      description: "Texten har kopierats till urklipp.",
    });
  };

  const openInOutlook = () => {
    if (selectedMaterials.length === 0) {
      toast({
        title: "Ingen beställning",
        description: "Lägg till material först.",
        variant: "destructive"
      });
      return;
    }

    const emailContent = generateOrderText();
    const subject = `Materialbeställning - ${project.name} - ${project.address}`;
    
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailContent)}`;
    
    try {
      const tempLink = document.createElement('a');
      tempLink.href = mailtoUrl;
      tempLink.target = '_self';
      document.body.appendChild(tempLink);
      tempLink.click();
      
      setTimeout(() => {
        document.body.removeChild(tempLink);
      }, 100);
      
      toast({
        title: "E-postklient öppnas",
        description: "Om inget händer, använd 'Kopiera Text' och klistra in i Outlook manuellt.",
      });
    } catch (error) {
      console.error('Error opening email client:', error);
      navigator.clipboard.writeText(emailContent);
      toast({
        title: "Text kopierad",
        description: "E-postklient kunde inte öppnas. Texten har kopierats till urklipp.",
        variant: "destructive"
      });
    }
  };

  const saveOrder = () => {
    if (selectedMaterials.length === 0) {
      toast({
        title: "Ingen beställning",
        description: "Lägg till material först.",
        variant: "destructive"
      });
      return;
    }

    const materialOrder: MaterialOrder = {
      id: project.materialOrder?.id || `order-${Date.now()}`,
      projectId: project.id,
      projectAddress: project.address || '',
      createdBy: 'current-user', // TODO: Get from auth context
      createdAt: project.materialOrder?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'ready_to_order',
      items: selectedMaterials.map(m => ({
        id: m.id,
        materialType: m.materialType,
        customMaterialType: m.customMaterialType,
        quantity: m.quantity,
        unit: m.unit
      })),
      notes,
      orderText: generateOrderText()
    };

    onOrderSaved(materialOrder);
    setIsOpen(false);

    toast({
      title: "Materialbeställning sparad",
      description: "COO kan nu kopiera och skicka beställningen.",
    });
  };

  const hasExistingOrder = !!project.materialOrder;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Package className="w-4 h-4" />
          {hasExistingOrder ? 'Redigera materialbeställning' : 'Skapa materialbeställning'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Materialbeställning för {project.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Adress: {project.address}
          </div>

          {/* Warning about available materials in Linköping */}
          {hasAvailableMaterials && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Det finns avvarat material tillgängligt i Linköpingsparken som kan användas för detta projekt.
                Kontrollera inventariet innan beställning.
              </AlertDescription>
            </Alert>
          )}

          {/* Add material section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Lägg till material:</label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Select value={currentMaterialType} onValueChange={setCurrentMaterialType}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Välj materialtyp..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIAL_TYPES.map(type => (
                      <SelectItem key={type} value={type}>
                        {type} ({getMaterialUnit(type)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={addMaterial} 
                  disabled={!currentMaterialType || (currentMaterialType === 'Annat' && !customMaterialType)}
                  size="sm"
                  className="gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Lägg till
                </Button>
              </div>
              
              {currentMaterialType === 'Annat' && (
                <Input
                  placeholder="Ange materialtyp..."
                  value={customMaterialType}
                  onChange={(e) => setCustomMaterialType(e.target.value)}
                />
              )}
            </div>
          </div>

          {/* Selected materials list */}
          {selectedMaterials.length > 0 && (
            <div className="space-y-3">
              <label className="text-sm font-medium">Valt material:</label>
              {selectedMaterials.map(material => (
                <Card key={material.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {material.materialType === 'Annat' ? material.customMaterialType : material.materialType}
                        </span>
                        <Badge variant="outline">{material.unit}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => updateQuantity(material.id, material.quantity - 1)}
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          min="1"
                          value={material.quantity}
                          onChange={(e) => updateQuantity(material.id, parseInt(e.target.value) || 1)}
                          className="w-20 text-center"
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => updateQuantity(material.id, material.quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removeMaterial(material.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              
              {/* Notes field */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Kommentar (valfritt):</label>
                <Textarea
                  placeholder="Lägg till eventuella kommentarer eller önskemål..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Email preview */}
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm bg-muted p-3 rounded-md">
                    <strong>Förhandsvisning av beställningstext:</strong>
                    <div className="mt-2 whitespace-pre-line text-xs">
                      {generateOrderText()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {selectedMaterials.length > 0 && (
              <>
                <Button onClick={saveOrder} className="gap-2">
                  <Package className="w-4 h-4" />
                  Spara beställning
                </Button>
                
                <Button variant="outline" onClick={copyOrderText} className="gap-2">
                  <Copy className="w-4 h-4" />
                  Kopiera text
                </Button>
                
                <Button variant="outline" onClick={openInOutlook} className="gap-2">
                  <Mail className="w-4 h-4" />
                  Öppna i Outlook
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
