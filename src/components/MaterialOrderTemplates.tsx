import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MaterialOrderItem } from '@/types/project';
import { Bookmark, Plus } from 'lucide-react';

interface MaterialTemplate {
  id: string;
  name: string;
  description: string;
  items: MaterialOrderItem[];
  category: 'villa' | 'lägenhet' | 'kommersiell';
}

const defaultTemplates: MaterialTemplate[] = [
  {
    id: 'villa-standard',
    name: 'Villa - Standard takläggning',
    description: 'Standardmaterial för villa ca 120 kvm',
    category: 'villa',
    items: [
      { id: '1', materialType: 'Takpannor', quantity: 140, unit: 'kvm', supplier: 'Monier', unitPrice: 85, totalPrice: 11900 },
      { id: '2', materialType: 'Annat', quantity: 140, unit: 'kvm', supplier: 'Icopal', unitPrice: 25, totalPrice: 3500 },
      { id: '3', materialType: 'Isolering', quantity: 150, unit: 'löpmeter', supplier: 'Beijer', unitPrice: 18, totalPrice: 2700 }
    ]
  },
  {
    id: 'lägenhet-renovering',
    name: 'Lägenhet - Takrenovering',
    description: 'Standardmaterial för mindre tak 60-80 kvm',
    category: 'lägenhet',
    items: [
      { id: '1', materialType: 'Takpannor', quantity: 70, unit: 'kvm', supplier: 'Monier', unitPrice: 85, totalPrice: 5950 },
      { id: '2', materialType: 'Annat', quantity: 70, unit: 'kvm', supplier: 'Icopal', unitPrice: 25, totalPrice: 1750 }
    ]
  }
];

interface MaterialOrderTemplatesProps {
  onApplyTemplate: (items: MaterialOrderItem[]) => void;
  onSaveTemplate: (template: Omit<MaterialTemplate, 'id'>) => void;
}

export function MaterialOrderTemplates({ onApplyTemplate, onSaveTemplate }: MaterialOrderTemplatesProps) {
  const [templates] = useState<MaterialTemplate[]>(defaultTemplates);

  const handleApplyTemplate = (template: MaterialTemplate) => {
    onApplyTemplate(template.items.map(item => ({
      ...item,
      id: `${item.id}-${Date.now()}`
    })));
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'villa': return 'bg-blue-100 text-blue-800';
      case 'lägenhet': return 'bg-green-100 text-green-800';
      case 'kommersiell': return 'bg-purple-100 text-purple-800';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bookmark className="w-5 h-5" />
          Materialmallar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <div key={template.id} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">{template.name}</h4>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                </div>
                <Badge className={getCategoryColor(template.category)}>
                  {template.category}
                </Badge>
              </div>
              
              <div className="space-y-1">
                {template.items.slice(0, 3).map((item) => (
                  <div key={item.id} className="text-xs text-muted-foreground">
                    {item.quantity} {item.unit} {item.materialType}
                  </div>
                ))}
                {template.items.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{template.items.length - 3} fler material...
                  </div>
                )}
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleApplyTemplate(template)}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Använd mall
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}