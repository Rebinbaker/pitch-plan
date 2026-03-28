import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Project } from '@/types/project';

interface CustomerInteractionFormProps {
  customerId: string;
  projects: Project[];
  onSubmit: (interaction: {
    customer_id: string;
    interaction_type: string;
    subject: string;
    description: string | null;
    related_project_id: string | null;
  }) => void;
  onCancel: () => void;
}

const interactionTypes = [
  { value: 'phone_call', label: '📞 Telefonsamtal' },
  { value: 'email', label: '📧 E-post' },
  { value: 'meeting', label: '🤝 Möte' },
  { value: 'note', label: '📝 Anteckning' },
  { value: 'complaint', label: '⚠️ Klagomål' },
];

export const CustomerInteractionForm = ({ customerId, projects, onSubmit, onCancel }: CustomerInteractionFormProps) => {
  const [type, setType] = useState('phone_call');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState<string>('none');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;
    onSubmit({
      customer_id: customerId,
      interaction_type: type,
      subject: subject.trim(),
      description: description.trim() || null,
      related_project_id: projectId === 'none' ? null : projectId,
    });
    setSubject(''); setDescription(''); setProjectId('none');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 border rounded-lg bg-muted/30">
      <h4 className="font-medium text-sm">Logga ny interaktion</h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Typ</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {interactionTypes.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Kopplat projekt</Label>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger><SelectValue placeholder="Inget projekt" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Inget projekt</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Ämne *</Label>
        <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ämne för kontakten" required maxLength={200} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Beskrivning</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detaljer..." rows={3} maxLength={2000} />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Avbryt</Button>
        <Button type="submit" size="sm" disabled={!subject.trim()}>Spara</Button>
      </div>
    </form>
  );
};
