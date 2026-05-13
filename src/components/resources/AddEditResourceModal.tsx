import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RESOURCE_TYPES } from '@/data/resourceTypes';
import { SWEDISH_COUNTIES } from '@/data/swedishCounties';
import { Resource, ResourceInput } from '@/types/resource';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: ResourceInput) => void;
  initial?: Resource | null;
  defaultCounty?: string;
}

export function AddEditResourceModal({ isOpen, onClose, onSave, initial, defaultCounty }: Props) {
  const [form, setForm] = useState<ResourceInput>({
    name: '',
    company: '',
    resourceTypes: [],
    counties: defaultCounty ? [defaultCounty] : [],
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    postalCode: '',
    website: '',
    notes: '',
    isFavorite: false,
    rating: null,
  });

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name,
        company: initial.company || '',
        resourceTypes: initial.resourceTypes,
        counties: initial.counties,
        contactPerson: initial.contactPerson || '',
        phone: initial.phone || '',
        email: initial.email || '',
        address: initial.address || '',
        city: initial.city || '',
        postalCode: initial.postalCode || '',
        website: initial.website || '',
        notes: initial.notes || '',
        isFavorite: initial.isFavorite,
        rating: initial.rating ?? null,
      });
    } else {
      setForm((f) => ({ ...f, counties: defaultCounty ? [defaultCounty] : [] }));
    }
  }, [initial, defaultCounty, isOpen]);

  const toggle = (arrKey: 'resourceTypes' | 'counties', value: string) => {
    setForm((f) => {
      const arr = f[arrKey];
      return { ...f, [arrKey]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
    });
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave(form);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Redigera resurs' : 'Lägg till resurs'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Namn / Företagsnamn *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Företag (om annorlunda)</Label>
              <Input value={form.company || ''} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
          </div>

          <div>
            <Label>Typ av resurs</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {RESOURCE_TYPES.map((t) => {
                const active = form.resourceTypes.includes(t.value);
                const Icon = t.icon;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => toggle('resourceTypes', t.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition ${
                      active ? t.color + ' border-transparent' : 'bg-background border-border hover:bg-muted'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>Län (kan täcka flera)</Label>
            <ScrollArea className="h-40 border rounded-md p-2 mt-1">
              <div className="grid grid-cols-2 gap-1.5">
                {SWEDISH_COUNTIES.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 px-2 py-1 rounded">
                    <Checkbox checked={form.counties.includes(c)} onCheckedChange={() => toggle('counties', c)} />
                    {c}
                  </label>
                ))}
              </div>
            </ScrollArea>
            {form.counties.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {form.counties.map((c) => (
                  <Badge key={c} variant="secondary">{c}</Badge>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Kontaktperson</Label>
              <Input value={form.contactPerson || ''} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>E-post</Label>
              <Input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Hemsida</Label>
              <Input value={form.website || ''} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </div>
            <div>
              <Label>Adress</Label>
              <Input value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <Label>Ort</Label>
              <Input value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <Label>Postnummer</Label>
              <Input value={form.postalCode || ''} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
            </div>
          </div>

          <div>
            <Label>Anteckningar</Label>
            <Textarea rows={3} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Prisnivå, tidigare projekt, omdöme..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Avbryt</Button>
          <Button onClick={handleSave} disabled={!form.name.trim()}>{initial ? 'Spara' : 'Lägg till'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
