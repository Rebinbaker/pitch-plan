import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (customer: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    postal_code: string | null;
    notes: string | null;
  }) => void;
}

export const AddCustomerModal = ({ isOpen, onClose, onAdd }: AddCustomerModalProps) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      city: city.trim() || null,
      postal_code: postalCode.trim() || null,
      notes: notes.trim() || null,
    });
    setName(''); setEmail(''); setPhone(''); setAddress(''); setCity(''); setPostalCode(''); setNotes('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Lägg till ny kund</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Namn *</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Kundens namn" required maxLength={100} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-post</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" maxLength={255} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="070-123 45 67" maxLength={20} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Adress</Label>
            <Input id="address" value={address} onChange={e => setAddress(e.target.value)} placeholder="Gatuadress" maxLength={200} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Stad</Label>
              <Input id="city" value={city} onChange={e => setCity(e.target.value)} placeholder="Stad" maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal_code">Postnummer</Label>
              <Input id="postal_code" value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="123 45" maxLength={10} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Anteckningar</Label>
            <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Övriga anteckningar..." maxLength={1000} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Avbryt</Button>
            <Button type="submit" disabled={!name.trim()}>Lägg till</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
