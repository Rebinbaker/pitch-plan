import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Truck, Mail, Copy, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Project } from '@/types/project';

interface ContainerOrder {
  id: string;
  name: string;
  description: string;
  size: string;
  type: string;
  supplier: string;
  emailTemplate: string;
}

const CONTAINER_ORDERS: ContainerOrder[] = [
  {
    id: 'container-10m3',
    name: '10 Kubikare',
    description: 'Mindre container för byggavfall',
    size: '10m³',
    type: 'Byggavfall',
    supplier: 'Standard leverantör',
    emailTemplate: `Hej,

Vi behöver beställa en 10 kubikare container för byggavfall till följande projekt:

Projekt: {PROJECT_NAME}
Adress: {PROJECT_ADDRESS}

Leveransdatum: Så snart som möjligt
Container typ: Byggavfall
Storlek: 10 kubikare

Kontakta oss för leveransdetaljer.

Med vänliga hälsningar,
Lokala Hantverkarna`
  },
  {
    id: 'container-20m3',
    name: '20 Kubikare',
    description: 'Standard container för byggavfall',
    size: '20m³',
    type: 'Byggavfall',
    supplier: 'Standard leverantör',
    emailTemplate: `Hej,

Vi behöver beställa en 20 kubikare container för byggavfall till följande projekt:

Projekt: {PROJECT_NAME}
Adress: {PROJECT_ADDRESS}

Leveransdatum: Så snart som möjligt
Container typ: Byggavfall
Storlek: 20 kubikare

Kontakta oss för leveransdetaljer.

Med vänliga hälsningar,
Lokala Hantverkarna`
  }
];

interface ContainerOrderDropdownProps {
  project: Project;
  onOrderSent: () => void;
}

interface SelectedContainer {
  id: string;
  order: ContainerOrder;
  quantity: number;
}

export function ContainerOrderDropdown({ project, onOrderSent }: ContainerOrderDropdownProps) {
  const { toast } = useToast();
  const [selectedContainers, setSelectedContainers] = useState<SelectedContainer[]>([]);
  const [currentSelection, setCurrentSelection] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);

  const addContainer = () => {
    const order = CONTAINER_ORDERS.find(o => o.id === currentSelection);
    if (!order) return;

    const existingContainer = selectedContainers.find(c => c.order.id === order.id);
    if (existingContainer) {
      // Increase quantity if container already exists
      setSelectedContainers(prev => 
        prev.map(c => 
          c.order.id === order.id 
            ? { ...c, quantity: c.quantity + 1 }
            : c
        )
      );
    } else {
      // Add new container
      const newContainer: SelectedContainer = {
        id: `${order.id}-${Date.now()}`,
        order,
        quantity: 1
      };
      setSelectedContainers(prev => [...prev, newContainer]);
    }
    setCurrentSelection('');
  };

  const removeContainer = (containerId: string) => {
    setSelectedContainers(prev => prev.filter(c => c.id !== containerId));
  };

  const updateQuantity = (containerId: string, quantity: number) => {
    if (quantity < 1) {
      removeContainer(containerId);
      return;
    }
    setSelectedContainers(prev =>
      prev.map(c => c.id === containerId ? { ...c, quantity } : c)
    );
  };

  const generateCombinedEmailContent = () => {
    if (selectedContainers.length === 0) return '';
    
    const containerList = selectedContainers.map(container => 
      `- ${container.quantity}x ${container.order.name} (${container.order.description})`
    ).join('\n');

    const totalContainers = selectedContainers.reduce((sum, c) => sum + c.quantity, 0);

    return `Hej,

Vi behöver beställa ${totalContainers} container${totalContainers > 1 ? 's' : ''} för följande projekt:

Projekt: ${project.name}
Adress: ${project.address || 'Ej angiven'}

Container-beställning:
${containerList}

Leveransdatum: Så snart som möjligt

Kontakta oss för leveransdetaljer.

Med vänliga hälsningar,
Lokala Hantverkarna`;
  };

  const copyOrderText = () => {
    if (selectedContainers.length === 0) return;

    const emailContent = generateCombinedEmailContent();
    navigator.clipboard.writeText(emailContent);
    
    toast({
      title: "Beställningstext kopierad",
      description: "Texten har kopierats till urklipp.",
    });
  };

  const openInOutlook = () => {
    if (selectedContainers.length === 0) return;

    const emailContent = generateCombinedEmailContent();
    const totalContainers = selectedContainers.reduce((sum, c) => sum + c.quantity, 0);
    const subject = `Container-beställning - ${totalContainers} container${totalContainers > 1 ? 's' : ''} - ${project.address}`;
    
    // Create mailto URL
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailContent)}`;
    
    try {
      // Create a temporary link and trigger it
      const tempLink = document.createElement('a');
      tempLink.href = mailtoUrl;
      tempLink.target = '_self';
      document.body.appendChild(tempLink);
      tempLink.click();
      
      // Clean up after a short delay
      setTimeout(() => {
        document.body.removeChild(tempLink);
      }, 100);
      
      toast({
        title: "E-postklient öppnas",
        description: "Om inget händer, använd 'Kopiera Text' och klistra in i Outlook manuellt.",
      });
    } catch (error) {
      console.error('Error opening email client:', error);
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(emailContent);
      toast({
        title: "Text kopierad",
        description: "E-postklient kunde inte öppnas. Texten har kopierats till urklipp.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Truck className="w-4 h-4" />
          Beställ Container
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Container-beställning för {project.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Adress: {project.address}
          </div>

          {/* Add container section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Lägg till container:</label>
            <div className="flex gap-2">
              <Select value={currentSelection} onValueChange={setCurrentSelection}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Välj container..." />
                </SelectTrigger>
                <SelectContent>
                  {CONTAINER_ORDERS.map(order => (
                    <SelectItem key={order.id} value={order.id}>
                      <div className="flex flex-col">
                        <span>{order.name}</span>
                        <span className="text-xs text-muted-foreground">{order.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={addContainer} 
                disabled={!currentSelection}
                size="sm"
                className="gap-1"
              >
                <Plus className="w-4 h-4" />
                Lägg till
              </Button>
            </div>
          </div>

          {/* Selected containers list */}
          {selectedContainers.length > 0 && (
            <div className="space-y-3">
              <label className="text-sm font-medium">Valda containers:</label>
              {selectedContainers.map(container => (
                <Card key={container.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{container.order.name}</span>
                        <Badge variant="outline">{container.order.size}</Badge>
                        <Badge variant="secondary">{container.order.type}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {container.order.description}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => updateQuantity(container.id, container.quantity - 1)}
                        >
                          -
                        </Button>
                        <span className="min-w-8 text-center">{container.quantity}</span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => updateQuantity(container.id, container.quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removeContainer(container.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              
              {/* Email preview */}
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm bg-muted p-3 rounded-md">
                    <strong>E-postmall:</strong>
                    <div className="mt-2 whitespace-pre-line text-xs">
                      {generateCombinedEmailContent()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {selectedContainers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={copyOrderText} className="gap-2">
                <Copy className="w-4 h-4" />
                Kopiera Text
              </Button>
              
              <Button variant="outline" onClick={openInOutlook} className="gap-2">
                <Mail className="w-4 h-4" />
                Öppna i Outlook
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}