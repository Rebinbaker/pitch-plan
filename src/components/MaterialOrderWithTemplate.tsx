import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Copy, Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Project, MaterialOrder, MaterialOrderItem } from "@/types/project";

interface MaterialOrderWithTemplateProps {
  project: Project;
  allProjects: Project[];
  onOrderSaved: (order: MaterialOrder) => void;
  existingOrder?: MaterialOrder;
}

interface TemplateMaterial {
  name: string;
  unit: string;
  hasColor?: boolean;
}

interface FilledMaterial {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  color?: string;
  enabled: boolean;
}

interface ExtraMaterial {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  color?: string;
}

const ROOFING_TEMPLATE: TemplateMaterial[] = [
  { name: "Läkt", unit: "m" },
  { name: "UNDERLAGSPAPP", unit: "m²" },
  { name: "Nock regel 45x95", unit: "m" },
  { name: "NOCKBAND", unit: "st", hasColor: true },
  { name: "Vindskiveplåt", unit: "st", hasColor: true },
  { name: "Fågelband", unit: "m", hasColor: true },
  { name: "Hängränna", unit: "m", hasColor: true },
  { name: "Takavvattning 2,50", unit: "st", hasColor: true },
  { name: "Takavvattning, omvikningskup", unit: "st", hasColor: true },
  { name: "Takavvattning, Rörsvep stenvägg", unit: "st", hasColor: true },
  { name: "Takavvattning, ränngavel", unit: "st", hasColor: true },
  { name: "Takavvattning, rännkrok Lång", unit: "st", hasColor: true },
  { name: "Takavvattning, rörvinkel 70°", unit: "st", hasColor: true },
  { name: "Takavvattning, fotplåt", unit: "st", hasColor: true },
  { name: "Vindskiveskruv Protect 4 4,2 x 25 mm", unit: "pack", hasColor: true },
  { name: "Trekantsläkt", unit: "m" },
  { name: "RÄNNKROKSSKRUV", unit: "pack", hasColor: true },
  { name: "Vit panel 145", unit: "m" },
  { name: "Brunnsutkastare", unit: "st", hasColor: true },
  { name: "Lövavskiljare", unit: "st", hasColor: true },
  { name: "Råspont", unit: "m²" },
  { name: "Maskinspik 34°, 57x3.1 mm, 2000 st", unit: "pack" },
  { name: "Lim för takpannor", unit: "st", hasColor: true },
];

export function MaterialOrderWithTemplate({ 
  project, 
  allProjects, 
  onOrderSaved,
  existingOrder 
}: MaterialOrderWithTemplateProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [materials, setMaterials] = useState<FilledMaterial[]>([]);
  const [extraMaterials, setExtraMaterials] = useState<ExtraMaterial[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (existingOrder) {
      // Load existing order
      const templateMats = ROOFING_TEMPLATE.map((tm, idx) => {
        const existing = existingOrder.items.find(item => 
          item.materialType.toLowerCase() === tm.name.toLowerCase()
        );
        return {
          id: `template-${idx}`,
          name: tm.name,
          quantity: existing?.quantity?.toString() || "",
          unit: tm.unit,
          color: existing?.color,
          enabled: !!existing
        };
      });
      
      const extras = existingOrder.items
        .filter(item => !ROOFING_TEMPLATE.find(tm => 
          tm.name.toLowerCase() === item.materialType.toLowerCase()
        ))
        .map((item, idx) => ({
          id: `extra-${idx}-${Date.now()}`,
          name: item.materialType,
          quantity: item.quantity?.toString() || "",
          unit: item.unit || "st",
          color: item.color
        }));

      setMaterials(templateMats);
      setExtraMaterials(extras);
      setNotes(existingOrder.notes || "");
    } else {
      // Initialize with template
      setMaterials(ROOFING_TEMPLATE.map((tm, idx) => ({
        id: `template-${idx}`,
        name: tm.name,
        quantity: "",
        unit: tm.unit,
        enabled: false
      })));
      setExtraMaterials([]);
      setNotes("");
    }
  }, [existingOrder, isOpen]);

  const updateMaterial = (id: string, field: keyof FilledMaterial, value: any) => {
    setMaterials(materials.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  const addExtraMaterial = () => {
    setExtraMaterials([...extraMaterials, {
      id: `extra-${Date.now()}`,
      name: "",
      quantity: "",
      unit: "st"
    }]);
  };

  const updateExtraMaterial = (id: string, field: keyof ExtraMaterial, value: any) => {
    setExtraMaterials(extraMaterials.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  const removeExtraMaterial = (id: string) => {
    setExtraMaterials(extraMaterials.filter(m => m.id !== id));
  };

  const generateOrderText = () => {
    const activeMaterials = materials.filter(m => m.enabled && m.quantity && parseFloat(m.quantity) > 0);
    const activeExtras = extraMaterials.filter(m => m.name && m.quantity && parseFloat(m.quantity) > 0);
    
    if (activeMaterials.length === 0 && activeExtras.length === 0) return '';

    const address = project.address || 'Ej angiven adress';
    
    const materialLines = [
      ...activeMaterials.map(m => {
        const colorText = m.color ? ` ${m.color}` : '';
        return `${m.name} ${m.quantity}${m.unit}${colorText}`;
      }),
      ...activeExtras.map(m => {
        const colorText = m.color ? ` ${m.color}` : '';
        return `${m.name} ${m.quantity}${m.unit}${colorText}`;
      })
    ].join('\n');

    return `🏗️ ${address}\n${materialLines}${notes ? `\n\n${notes}` : ''}`;
  };

  const copyOrderText = () => {
    const text = generateOrderText();
    if (!text) {
      toast.error("Ingen beställning att kopiera");
      return;
    }
    navigator.clipboard.writeText(text);
    toast.success("Beställningstext kopierad!");
  };

  const openInOutlook = () => {
    const text = generateOrderText();
    if (!text) {
      toast.error("Ingen beställning att skicka");
      return;
    }

    const subject = `Materialbeställning - ${project.name}`;
    const body = encodeURIComponent(text);
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${body}`;
    
    window.location.href = mailtoLink;
    
    setTimeout(() => {
      toast.info("Om Outlook inte öppnas, använd kopiera-knappen istället");
    }, 1000);
  };

  const saveOrder = () => {
    const activeMaterials = materials.filter(m => m.enabled && m.quantity && parseFloat(m.quantity) > 0);
    const activeExtras = extraMaterials.filter(m => m.name && m.quantity && parseFloat(m.quantity) > 0);
    
    if (activeMaterials.length === 0 && activeExtras.length === 0) {
      toast.error("Lägg till minst ett material");
      return;
    }

    const items: MaterialOrderItem[] = [
      ...activeMaterials.map(m => ({
        id: m.id,
        materialType: m.name,
        quantity: parseFloat(m.quantity),
        unit: m.unit,
        color: m.color
      })),
      ...activeExtras.map(m => ({
        id: m.id,
        materialType: m.name,
        quantity: parseFloat(m.quantity),
        unit: m.unit,
        color: m.color
      }))
    ];

    const order: MaterialOrder = {
      id: existingOrder?.id || `order-${Date.now()}`,
      projectId: project.id,
      items,
      notes,
      status: 'ready_to_order',
      projectAddress: project.address || '',
      createdBy: 'current-user',
      updatedAt: new Date().toISOString(),
      createdAt: existingOrder?.createdAt || new Date().toISOString()
    };

    onOrderSaved(order);
    setIsOpen(false);
    toast.success(existingOrder ? "Beställning uppdaterad" : "Beställning sparad");
  };

  const hasColor = (materialName: string) => {
    const template = ROOFING_TEMPLATE.find(tm => tm.name === materialName);
    return template?.hasColor || false;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={existingOrder ? "outline" : "default"} size="sm">
          {existingOrder ? "Redigera beställning" : "Skapa beställning"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingOrder ? "Redigera materialbeställning" : "Skapa materialbeställning"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Standard Materials */}
          <div>
            <h3 className="font-semibold mb-3">Standardmaterial för takläggning</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto border rounded-md p-3">
              {materials.map((material) => (
                <div key={material.id} className="flex items-center gap-2 py-1">
                  <Checkbox
                    checked={material.enabled}
                    onCheckedChange={(checked) => 
                      updateMaterial(material.id, 'enabled', checked)
                    }
                  />
                  <div className="flex-1 grid grid-cols-12 gap-2 items-center">
                    <Label className="col-span-5 text-sm">{material.name}</Label>
                    <Input
                      type="number"
                      placeholder="Antal"
                      value={material.quantity}
                      onChange={(e) => updateMaterial(material.id, 'quantity', e.target.value)}
                      className="col-span-2 h-8"
                      disabled={!material.enabled}
                    />
                    <span className="col-span-1 text-sm text-muted-foreground">{material.unit}</span>
                    {hasColor(material.name) ? (
                      <Select
                        value={material.color}
                        onValueChange={(value) => updateMaterial(material.id, 'color', value)}
                        disabled={!material.enabled}
                      >
                        <SelectTrigger className="col-span-4 h-8">
                          <SelectValue placeholder="Färg" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="svart">Svart</SelectItem>
                          <SelectItem value="vit">Vit</SelectItem>
                          <SelectItem value="grå">Grå</SelectItem>
                          <SelectItem value="brun">Brun</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="col-span-4" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Extra Materials */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Extra material</h3>
              <Button onClick={addExtraMaterial} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                Lägg till
              </Button>
            </div>
            {extraMaterials.length > 0 && (
              <div className="space-y-2 border rounded-md p-3">
                {extraMaterials.map((material) => (
                  <div key={material.id} className="flex items-center gap-2">
                    <Input
                      placeholder="Materialnamn"
                      value={material.name}
                      onChange={(e) => updateExtraMaterial(material.id, 'name', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Antal"
                      value={material.quantity}
                      onChange={(e) => updateExtraMaterial(material.id, 'quantity', e.target.value)}
                      className="w-24"
                    />
                    <Input
                      placeholder="Enhet"
                      value={material.unit}
                      onChange={(e) => updateExtraMaterial(material.id, 'unit', e.target.value)}
                      className="w-20"
                    />
                    <Select
                      value={material.color}
                      onValueChange={(value) => updateExtraMaterial(material.id, 'color', value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Färg (opt)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="svart">Svart</SelectItem>
                        <SelectItem value="vit">Vit</SelectItem>
                        <SelectItem value="grå">Grå</SelectItem>
                        <SelectItem value="brun">Brun</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeExtraMaterial(material.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label>Kommentar</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Övrig information..."
              rows={3}
            />
          </div>

          {/* Preview */}
          {generateOrderText() && (
            <div>
              <Label>Förhandsvisning</Label>
              <div className="bg-muted p-3 rounded-md font-mono text-sm whitespace-pre-wrap">
                {generateOrderText()}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={saveOrder} className="flex-1">
              Spara beställning
            </Button>
            <Button onClick={copyOrderText} variant="outline">
              <Copy className="w-4 h-4" />
            </Button>
            <Button onClick={openInOutlook} variant="outline">
              <Mail className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
