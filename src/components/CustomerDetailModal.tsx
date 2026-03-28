import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, Mail, MapPin, Plus, Pencil, Save, X, Trash2 } from 'lucide-react';
import { Customer, CustomerInteraction } from '@/hooks/useCustomers';
import { CustomerInteractionForm } from './CustomerInteractionForm';
import { Project } from '@/types/project';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  interactions: CustomerInteraction[];
  projects: Project[];
  onUpdate: (id: string, updates: Partial<Customer>) => void;
  onDelete: (id: string) => void;
  onAddInteraction: (interaction: Omit<CustomerInteraction, 'id' | 'organization_id' | 'user_id' | 'created_at'>) => void;
  onLoadInteractions: (customerId: string) => void;
}

const typeLabels: Record<string, string> = {
  phone_call: '📞 Telefonsamtal',
  email: '📧 E-post',
  meeting: '🤝 Möte',
  note: '📝 Anteckning',
  complaint: '⚠️ Klagomål',
};

export const CustomerDetailModal = ({
  isOpen, onClose, customer, interactions, projects,
  onUpdate, onDelete, onAddInteraction, onLoadInteractions
}: CustomerDetailModalProps) => {
  const [editing, setEditing] = useState(false);
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [editData, setEditData] = useState(customer);

  useEffect(() => {
    if (isOpen && customer) {
      onLoadInteractions(customer.id);
      setEditData(customer);
    }
  }, [isOpen, customer?.id]);

  const linkedProjects = projects.filter(p =>
    (p as any).customer_id === customer.id ||
    p.customerName === customer.name
  );

  const handleSave = () => {
    onUpdate(customer.id, {
      name: editData.name,
      email: editData.email,
      phone: editData.phone,
      address: editData.address,
      city: editData.city,
      postal_code: editData.postal_code,
      notes: editData.notes,
    });
    setEditing(false);
  };

  const handleInteractionSubmit = (interaction: any) => {
    onAddInteraction(interaction);
    setShowInteractionForm(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">{customer.name}</DialogTitle>
            <div className="flex gap-2">
              {editing ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => { setEditing(false); setEditData(customer); }}><X className="h-4 w-4" /></Button>
                  <Button size="sm" onClick={handleSave}><Save className="h-4 w-4 mr-1" />Spara</Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="destructive" onClick={() => { onDelete(customer.id); onClose(); }}><Trash2 className="h-4 w-4" /></Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Kontaktinfo</TabsTrigger>
            <TabsTrigger value="projects">Projekt ({linkedProjects.length})</TabsTrigger>
            <TabsTrigger value="log">
              Logg ({interactions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            {editing ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Namn</Label>
                  <Input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} maxLength={100} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>E-post</Label>
                    <Input value={editData.email || ''} onChange={e => setEditData({ ...editData, email: e.target.value || null })} maxLength={255} />
                  </div>
                  <div className="space-y-1">
                    <Label>Telefon</Label>
                    <Input value={editData.phone || ''} onChange={e => setEditData({ ...editData, phone: e.target.value || null })} maxLength={20} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Adress</Label>
                  <Input value={editData.address || ''} onChange={e => setEditData({ ...editData, address: e.target.value || null })} maxLength={200} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Stad</Label>
                    <Input value={editData.city || ''} onChange={e => setEditData({ ...editData, city: e.target.value || null })} maxLength={100} />
                  </div>
                  <div className="space-y-1">
                    <Label>Postnummer</Label>
                    <Input value={editData.postal_code || ''} onChange={e => setEditData({ ...editData, postal_code: e.target.value || null })} maxLength={10} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Anteckningar</Label>
                  <Textarea value={editData.notes || ''} onChange={e => setEditData({ ...editData, notes: e.target.value || null })} maxLength={1000} />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {customer.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${customer.phone}`} className="text-primary hover:underline">{customer.phone}</a>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${customer.email}`} className="text-primary hover:underline">{customer.email}</a>
                  </div>
                )}
                {(customer.address || customer.city) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{[customer.address, customer.postal_code, customer.city].filter(Boolean).join(', ')}</span>
                  </div>
                )}
                {customer.notes && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">{customer.notes}</p>
                  </div>
                )}
                {!customer.phone && !customer.email && !customer.address && !customer.notes && (
                  <p className="text-sm text-muted-foreground italic">Ingen kontaktinformation tillagd.</p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="projects" className="mt-4">
            {linkedProjects.length > 0 ? (
              <div className="space-y-2">
                {linkedProjects.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.address}</p>
                    </div>
                    <Badge variant={p.status === 'completed' ? 'default' : 'secondary'}>{p.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Inga kopplade projekt.</p>
            )}
          </TabsContent>

          <TabsContent value="log" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setShowInteractionForm(true)} disabled={showInteractionForm}>
                <Plus className="h-4 w-4 mr-1" />Logga kontakt
              </Button>
            </div>

            {showInteractionForm && (
              <CustomerInteractionForm
                customerId={customer.id}
                projects={projects}
                onSubmit={handleInteractionSubmit}
                onCancel={() => setShowInteractionForm(false)}
              />
            )}

            {interactions.length > 0 ? (
              <div className="space-y-2">
                {interactions.map(i => (
                  <div key={i.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{typeLabels[i.interaction_type] || i.interaction_type}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(i.created_at), 'd MMM yyyy HH:mm', { locale: sv })}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{i.subject}</p>
                    {i.description && <p className="text-sm text-muted-foreground mt-1">{i.description}</p>}
                    {i.related_project_id && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        Projekt: {projects.find(p => p.id === i.related_project_id)?.name || 'Okänt'}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Ingen kontakthistorik ännu.</p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
