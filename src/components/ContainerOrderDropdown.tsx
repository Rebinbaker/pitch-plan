import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Truck, Mail, Copy, Check } from 'lucide-react';
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
    id: 'container-20m3',
    name: '20m³ Container',
    description: 'Standard byggavfall container',
    size: '20m³',
    type: 'Byggavfall',
    supplier: 'Standard leverantör',
    emailTemplate: `Hej,

Vi behöver beställa en 20m³ container för byggavfall till följande projekt:

Projekt: {PROJECT_NAME}
Adress: {PROJECT_ADDRESS}

Leveransdatum: Så snart som möjligt
Container typ: Byggavfall
Storlek: 20m³

Kontakta oss för leveransdetaljer.

Med vänliga hälsningar,
Lokala Hantverkarna`
  },
  {
    id: 'container-30m3',
    name: '30m³ Container',
    description: 'Stor byggavfall container',
    size: '30m³',
    type: 'Byggavfall',
    supplier: 'Standard leverantör',
    emailTemplate: `Hej,

Vi behöver beställa en 30m³ container för byggavfall till följande projekt:

Projekt: {PROJECT_NAME}
Adress: {PROJECT_ADDRESS}

Leveransdatum: Så snart som möjligt
Container typ: Byggavfall
Storlek: 30m³

Kontakta oss för leveransdetaljer.

Med vänliga hälsningar,
Lokala Hantverkarna`
  },
  {
    id: 'container-bauschutt',
    name: 'Bauschutt Container',
    description: 'För tegel, betong och sten',
    size: '20m³',
    type: 'Bauschutt',
    supplier: 'Standard leverantör',
    emailTemplate: `Hej,

Vi behöver beställa en Bauschutt container till följande projekt:

Projekt: {PROJECT_NAME}
Adress: {PROJECT_ADDRESS}

Leveransdatum: Så snart som möjligt
Container typ: Bauschutt (tegel, betong, sten)
Storlek: 20m³

Kontakta oss för leveransdetaljer.

Med vänliga hälsningar,
Lokala Hantverkarna`
  },
  {
    id: 'container-tra',
    name: 'Trä Container',
    description: 'För rent träavfall',
    size: '20m³',
    type: 'Träavfall',
    supplier: 'Standard leverantör',
    emailTemplate: `Hej,

Vi behöver beställa en container för träavfall till följande projekt:

Projekt: {PROJECT_NAME}
Adress: {PROJECT_ADDRESS}

Leveransdatum: Så snart som möjligt
Container typ: Träavfall (rent trä)
Storlek: 20m³

Kontakta oss för leveransdetaljer.

Med vänliga hälsningar,
Lokala Hantverkarna`
  },
  {
    id: 'container-metall',
    name: 'Metall Container',
    description: 'För metallskrot',
    size: '20m³',
    type: 'Metallskrot',
    supplier: 'Standard leverantör',
    emailTemplate: `Hej,

Vi behöver beställa en container för metallskrot till följande projekt:

Projekt: {PROJECT_NAME}
Adress: {PROJECT_ADDRESS}

Leveransdatum: Så snart som möjligt
Container typ: Metallskrot
Storlek: 20m³

Kontakta oss för leveransdetaljer.

Med vänliga hälsningar,
Lokala Hantverkarna`
  }
];

interface ContainerOrderDropdownProps {
  project: Project;
  onOrderSent: () => void;
}

export function ContainerOrderDropdown({ project, onOrderSent }: ContainerOrderDropdownProps) {
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [orderSent, setOrderSent] = useState(false);

  const handleOrderSelect = (orderId: string) => {
    setSelectedOrder(orderId);
  };

  const getSelectedOrderDetails = () => {
    return CONTAINER_ORDERS.find(order => order.id === selectedOrder);
  };

  const generateEmailContent = (order: ContainerOrder) => {
    return order.emailTemplate
      .replace('{PROJECT_NAME}', project.name)
      .replace('{PROJECT_ADDRESS}', project.address || 'Ej angiven');
  };

  const copyOrderText = () => {
    const order = getSelectedOrderDetails();
    if (!order) return;

    const emailContent = generateEmailContent(order);
    navigator.clipboard.writeText(emailContent);
    
    toast({
      title: "Beställningstext kopierad",
      description: "Texten har kopierats till urklipp.",
    });
  };

  const sendOrderEmail = async () => {
    const order = getSelectedOrderDetails();
    if (!order) return;

    setIsSending(true);

    try {
      const emailContent = generateEmailContent(order);
      
      const { error } = await supabase.functions.invoke('send-container-order', {
        body: {
          projectName: project.name,
          projectAddress: project.address,
          containerType: order.name,
          containerDescription: order.description,
          emailContent: emailContent
        }
      });

      if (error) {
        throw error;
      }

      setOrderSent(true);
      onOrderSent();
      
      toast({
        title: "Container-beställning skickad!",
        description: `${order.name} har beställts för ${project.address}`,
      });

      // Auto-close dialog after success
      setTimeout(() => {
        setIsOpen(false);
        setOrderSent(false);
        setSelectedOrder('');
      }, 2000);

    } catch (error) {
      console.error('Error sending container order:', error);
      toast({
        title: "Fel vid beställning",
        description: "Kunde inte skicka container-beställningen. Försök igen.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const openInOutlook = () => {
    const order = getSelectedOrderDetails();
    if (!order) return;

    const emailContent = generateEmailContent(order);
    const subject = `Container-beställning - ${order.name} - ${project.address}`;
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailContent)}`;
    
    try {
      window.location.href = mailtoUrl;
    } catch (error) {
      window.open(mailtoUrl, '_blank');
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

          <div className="space-y-2">
            <label className="text-sm font-medium">Välj containertyp:</label>
            <Select value={selectedOrder} onValueChange={handleOrderSelect}>
              <SelectTrigger>
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
          </div>

          {selectedOrder && (
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{getSelectedOrderDetails()?.size}</Badge>
                    <Badge variant="secondary">{getSelectedOrderDetails()?.type}</Badge>
                  </div>
                  
                  <div className="text-sm">
                    <strong>Beskrivning:</strong> {getSelectedOrderDetails()?.description}
                  </div>
                  
                  <div className="text-sm bg-muted p-3 rounded-md">
                    <strong>E-postmall:</strong>
                    <div className="mt-2 whitespace-pre-line text-xs">
                      {generateEmailContent(getSelectedOrderDetails()!)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedOrder && (
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={sendOrderEmail} 
                disabled={isSending || orderSent}
                className="gap-2"
              >
                {orderSent ? (
                  <>
                    <Check className="w-4 h-4" />
                    Skickad!
                  </>
                ) : isSending ? (
                  'Skickar...'
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Skicka E-post
                  </>
                )}
              </Button>
              
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