import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MaterialOrder, MaterialOrderItem, MaterialType, Project, getMaterialUnit, MaterialItem } from '@/types/project';
import { Plus, Trash2, Package, Copy, Mail, Save, Send, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MaterialOrderFormProps {
  project: Project;
  allProjects: Project[];
  onSave: (materialOrder: MaterialOrder) => void;
  onClose: () => void;
}

export function MaterialOrderForm({ project, allProjects, onSave, onClose }: MaterialOrderFormProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<MaterialOrderItem[]>(
    project.materialOrder?.items || [
      {
        id: `item-${Date.now()}`,
        materialType: 'Takpannor',
        quantity: 0,
        unit: getMaterialUnit('Takpannor')
      }
    ]
  );
  const [notes, setNotes] = useState(project.materialOrder?.notes || '');
  const [status, setStatus] = useState(project.materialOrder?.status || 'draft');
  const [showSalvagedDialog, setShowSalvagedDialog] = useState(false);
  const [appliedSalvaged, setAppliedSalvaged] = useState<MaterialItem[]>(
    project.materialOrder?.appliedSalvagedMaterial || []
  );

  // Get available salvaged materials from Linköpingsparken
  const availableSalvagedMaterials = allProjects
    .filter(p => p.avvaratMaterial?.hasLeftoverMaterial && 
                 p.avvaratMaterial?.materials && 
                 !p.avvaratMaterial?.allocatedToProjectId)
    .flatMap(p => p.avvaratMaterial!.materials!.map(m => ({
      ...m,
      sourceProject: p.name,
      sourceProjectId: p.id
    })));

  const addItem = () => {
    const newItem: MaterialOrderItem = {
      id: `item-${Date.now()}`,
      materialType: 'Takpannor',
      quantity: 0,
      unit: getMaterialUnit('Takpannor')
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof MaterialOrderItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // Update unit when material type changes
        if (field === 'materialType') {
          updated.unit = getMaterialUnit(value as MaterialType);
        }
        return updated;
      }
      return item;
    }));
  };

  const handleSalvagedMaterialToggle = (material: MaterialItem & { sourceProject: string; sourceProjectId: string }, checked: boolean) => {
    if (checked) {
      setAppliedSalvaged([...appliedSalvaged, material]);
    } else {
      setAppliedSalvaged(appliedSalvaged.filter(m => m.id !== material.id));
    }
  };

  const applySalvagedMaterials = () => {
    // Reduce quantities in material order based on applied salvaged materials
    const updatedItems = items.map(item => {
      const salvaged = appliedSalvaged.find(s => {
        const salvagedType = s.materialType === 'Annat' && s.customMaterialType 
          ? s.customMaterialType 
          : s.materialType;
        const itemType = item.materialType === 'Annat' && item.customMaterialType 
          ? item.customMaterialType 
          : item.materialType;
        return salvagedType === itemType;
      });

      if (salvaged) {
        const newQuantity = Math.max(0, item.quantity - salvaged.squareMeters);
        return { ...item, quantity: newQuantity };
      }
      return item;
    });

    setItems(updatedItems);
    setShowSalvagedDialog(false);
    
    toast({
      title: "Avvarat material tillämpat",
      description: `${appliedSalvaged.length} material har dragits av från beställningen.`,
    });
  };

  const generateOrderText = () => {
    const filteredItems = items.filter(item => item.quantity > 0);
    
    if (filteredItems.length === 0) {
      toast({
        title: "Ingen beställning att generera",
        description: "Lägg till material med kvantitet > 0 först.",
        variant: "destructive"
      });
      return '';
    }

    let orderText = `Hej,\n\nVi skulle vilja beställa följande material till ${project.address}:\n\n`;
    
    filteredItems.forEach(item => {
      const materialName = item.materialType === 'Annat' && item.customMaterialType 
        ? item.customMaterialType 
        : item.materialType;
      orderText += `• ${item.quantity} ${item.unit} ${materialName}`;
      if (item.notes) {
        orderText += ` (${item.notes})`;
      }
      orderText += '\n';
    });

    if (appliedSalvaged.length > 0) {
      orderText += '\nFöljande material har vi tagit från vårt lager i Linköpingsparken:\n';
      appliedSalvaged.forEach(material => {
        const materialName = material.materialType === 'Annat' && material.customMaterialType 
          ? material.customMaterialType 
          : material.materialType;
        orderText += `• ${material.squareMeters} ${getMaterialUnit(material.materialType)} ${materialName}\n`;
      });
    }

    if (notes) {
      orderText += `\nÖvriga kommentarer:\n${notes}\n`;
    }

    orderText += '\nMed vänliga hälsningar,\nLokala Hantverkarna';

    return orderText;
  };

  const copyOrderText = () => {
    const orderText = generateOrderText();
    if (orderText) {
      navigator.clipboard.writeText(orderText);
      toast({
        title: "Beställningstext kopierad",
        description: "Texten har kopierats till urklipp.",
      });
    }
  };

  const openInOutlook = () => {
    const orderText = generateOrderText();
    if (orderText) {
      const subject = `Materialbeställning - ${project.address}`;
      const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(orderText)}`;
      window.open(mailtoUrl);
    }
  };

  const saveOrder = (newStatus?: typeof status) => {
    const materialOrder: MaterialOrder = {
      id: project.materialOrder?.id || `order-${Date.now()}`,
      projectId: project.id,
      projectAddress: project.address,
      createdBy: 'current-user', // TODO: Get from auth context
      createdAt: project.materialOrder?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: newStatus || status,
      items: items.filter(item => item.quantity > 0),
      notes,
      orderText: generateOrderText(),
      appliedSalvagedMaterial: appliedSalvaged
    };

    onSave(materialOrder);
    
    if (newStatus === 'ready_to_order') {
      toast({
        title: "Materialbeställning klar",
        description: "Beställningen är markerad som klar att skicka.",
      });
    } else {
      toast({
        title: "Materialbeställning sparad",
        description: "Dina ändringar har sparats som utkast.",
      });
    }
  };

  const totalEstimatedCost = items.reduce((sum, item) => sum + (item.estimatedCost || 0), 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Materialbeställning - {project.name}
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            Adress: {project.address}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <Label>Status:</Label>
            <Badge variant={status === 'draft' ? 'secondary' : status === 'ready_to_order' ? 'default' : 'outline'}>
              {status === 'draft' && 'Utkast'}
              {status === 'ready_to_order' && 'Klar för beställning'}
              {status === 'ordered' && 'Beställd'}
              {status === 'delivered' && 'Levererad'}
            </Badge>
          </div>

          {/* Salvaged Material Alert */}
          {availableSalvagedMaterials.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Det finns material tillgängligt i Linköpingsparken. 
                <Button 
                  variant="link" 
                  className="p-0 ml-1 h-auto"
                  onClick={() => setShowSalvagedDialog(true)}
                >
                  Klicka här för att använda det
                </Button>
                .
              </AlertDescription>
            </Alert>
          )}

          {/* Applied Salvaged Materials */}
          {appliedSalvaged.length > 0 && (
            <Card className="bg-green-50 border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Använt material från Linköpingsparken
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {appliedSalvaged.map(material => {
                    const materialName = material.materialType === 'Annat' && material.customMaterialType 
                      ? material.customMaterialType 
                      : material.materialType;
                    return (
                      <div key={material.id} className="text-sm">
                        • {material.squareMeters} {getMaterialUnit(material.materialType)} {materialName}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Material Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Material att beställa</Label>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1" />
                Lägg till material
              </Button>
            </div>

            {items.map(item => (
              <Card key={item.id} className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor={`material-${item.id}`}>Materialtyp</Label>
                    <Select
                      value={item.materialType}
                      onValueChange={(value) => updateItem(item.id, 'materialType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Takpannor">Takpannor</SelectItem>
                        <SelectItem value="Underlagsduk">Underlagsduk</SelectItem>
                        <SelectItem value="Läkt">Läkt</SelectItem>
                        <SelectItem value="Plåtdetaljer">Plåtdetaljer</SelectItem>
                        <SelectItem value="Isolering">Isolering</SelectItem>
                        <SelectItem value="Annat">Annat</SelectItem>
                      </SelectContent>
                    </Select>
                    {item.materialType === 'Annat' && (
                      <Input
                        placeholder="Ange materialtyp"
                        value={item.customMaterialType || ''}
                        onChange={(e) => updateItem(item.id, 'customMaterialType', e.target.value)}
                        className="mt-2"
                      />
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`quantity-${item.id}`}>Kvantitet</Label>
                    <div className="flex gap-2">
                      <Input
                        id={`quantity-${item.id}`}
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                        min="0"
                        step="0.1"
                      />
                      <div className="flex items-center px-3 py-2 bg-muted rounded-md text-sm">
                        {item.unit}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor={`cost-${item.id}`}>Uppskattat pris (SEK)</Label>
                    <Input
                      id={`cost-${item.id}`}
                      type="number"
                      value={item.estimatedCost || ''}
                      onChange={(e) => updateItem(item.id, 'estimatedCost', Number(e.target.value))}
                      min="0"
                      placeholder="0"
                    />
                  </div>

                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4">
                  <Label htmlFor={`notes-${item.id}`}>Kommentarer</Label>
                  <Input
                    id={`notes-${item.id}`}
                    value={item.notes || ''}
                    onChange={(e) => updateItem(item.id, 'notes', e.target.value)}
                    placeholder="T.ex. färg, modell, leverantör..."
                  />
                </div>
              </Card>
            ))}
          </div>

          {/* Total Cost */}
          {totalEstimatedCost > 0 && (
            <div className="text-right">
              <div className="text-lg font-semibold">
                Totalt uppskattat värde: {totalEstimatedCost.toLocaleString('sv-SE')} SEK
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label htmlFor="order-notes">Övriga kommentarer</Label>
            <Textarea
              id="order-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Lägg till kommentarer för beställningen..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => saveOrder()}>
              <Save className="w-4 h-4 mr-2" />
              Spara utkast
            </Button>
            
            <Button onClick={() => saveOrder('ready_to_order')}>
              <Send className="w-4 h-4 mr-2" />
              Markera som klar för beställning
            </Button>

            <Button variant="outline" onClick={copyOrderText}>
              <Copy className="w-4 h-4 mr-2" />
              Kopiera beställningstext
            </Button>

            <Button variant="outline" onClick={openInOutlook}>
              <Mail className="w-4 h-4 mr-2" />
              Öppna i Outlook
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Salvaged Material Dialog */}
      <Dialog open={showSalvagedDialog} onOpenChange={setShowSalvagedDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Använd material från Linköpingsparken</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {availableSalvagedMaterials.map(material => {
              const materialName = material.materialType === 'Annat' && material.customMaterialType 
                ? material.customMaterialType 
                : material.materialType;
              const isSelected = appliedSalvaged.some(s => s.id === material.id);
              
              return (
                <div key={material.id} className="flex items-center space-x-3 p-3 border rounded">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => handleSalvagedMaterialToggle(material, checked as boolean)}
                  />
                  <div className="flex-1">
                    <div className="font-medium">
                      {material.squareMeters} {getMaterialUnit(material.materialType)} {materialName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Från projekt: {material.sourceProject}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowSalvagedDialog(false)}>
              Avbryt
            </Button>
            <Button onClick={applySalvagedMaterials}>
              Tillämpa valt material
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}