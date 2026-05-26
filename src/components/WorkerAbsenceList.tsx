import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Clock, CheckCircle2, XCircle, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

interface AbsencePeriod {
  id: string;
  left_at: string;
  returned_at: string | null;
  duration_minutes: number | null;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
}

interface Props {
  absences: AbsencePeriod[];
  onUpdated?: () => void;
}

export const WorkerAbsenceList = ({ absences, onUpdated }: Props) => {
  const [editing, setEditing] = useState<AbsencePeriod | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const openMotivate = (a: AbsencePeriod) => {
    setEditing(a);
    setReason(a.reason || '');
  };

  const saveReason = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('worker_absence_periods')
        .update({ reason })
        .eq('id', editing.id);
      if (error) throw error;
      toast({ title: 'Motivering sparad', description: 'Skickad till chef för godkännande.' });
      setEditing(null);
      onUpdated?.();
    } catch (e: any) {
      toast({ title: 'Kunde inte spara', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (absences.length === 0) return null;

  const statusBadge = (s: AbsencePeriod['status']) => {
    if (s === 'approved') return <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Godkänd</Badge>;
    if (s === 'rejected') return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Avvisad</Badge>;
    return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Väntar godkännande</Badge>;
  };

  return (
    <>
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <div className="font-semibold text-sm">Frånvaroperioder ({absences.length})</div>
          </div>
          {absences.map(a => (
            <div key={a.id} className="border rounded p-2 text-sm">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1">
                  <div className="font-medium">
                    {format(new Date(a.left_at), 'HH:mm', { locale: sv })}
                    {' – '}
                    {a.returned_at ? format(new Date(a.returned_at), 'HH:mm', { locale: sv }) : 'pågår…'}
                    {a.duration_minutes != null && (
                      <span className="text-muted-foreground ml-2">({a.duration_minutes} min)</span>
                    )}
                  </div>
                  {a.reason && <div className="text-xs text-muted-foreground mt-1">"{a.reason}"</div>}
                </div>
                {statusBadge(a.status)}
              </div>
              {a.status === 'pending' && (
                <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => openMotivate(a)}>
                  <MessageSquare className="w-3 h-3 mr-1" />
                  {a.reason ? 'Ändra motivering' : 'Motivera frånvaro'}
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivera frånvaro</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Beskriv varför du lämnade arbetsplatsen. Chefen behöver godkänna för att tiden ska räknas in i lönen.
            </p>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Ex: Hämtade material på XL Bygg"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Avbryt</Button>
            <Button onClick={saveReason} disabled={saving || !reason.trim()}>
              {saving ? 'Sparar…' : 'Spara motivering'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
