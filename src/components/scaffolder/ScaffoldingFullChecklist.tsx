import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, ListChecks } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export const FULL_CHECKLIST: Array<{ key: string; group: string; label: string }> = [
  { key: 'photos', group: '1. Underlag', label: 'Bilder uppladdade (alla fasader)' },
  { key: 'ai_analysis', group: '1. Underlag', label: 'AI-analys körd och granskad' },
  { key: 'calibration', group: '2. Mätning', label: 'Kalibrerat mot ≥2 referenser' },
  { key: 'measurements', group: '2. Mätning', label: 'Längd + höjd ritade per sida' },
  { key: 'obstacles_marked', group: '2. Mätning', label: 'Hinder / takfot / nivåskillnader markerade' },
  { key: 'sections_defined', group: '3. Sektioner', label: 'Sektioner definierade (sida/gavel/baksida)' },
  { key: 'ground_checked', group: '3. Sektioner', label: 'Markförhållanden noterade per sektion' },
  { key: 'anchoring_checked', group: '3. Sektioner', label: 'Förankringsunderlag valt per sektion' },
  { key: 'material_calculated', group: '4. Material', label: 'Materiallista genererad av regelmotor' },
  { key: 'material_reviewed', group: '4. Material', label: 'Materiallista granskad och justerad' },
  { key: 'material_ordered', group: '4. Material', label: 'PERI-material beställt' },
  { key: 'transport_booked', group: '5. Bygg', label: 'Transport bokad' },
  { key: 'team_assigned', group: '5. Bygg', label: 'Montörer tilldelade' },
  { key: 'built', group: '6. Klart', label: 'Ställning byggd och kontrollerad' },
  { key: 'handover_signed', group: '6. Klart', label: 'Överlämnad och signerad till bygglag' },
];

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'not_analyzed', label: '1. Ej analyserad' },
  { value: 'photos_uploaded', label: '2. Bilder uppladdade' },
  { value: 'measured', label: '3. Mätt' },
  { value: 'sections_defined', label: '4. Sektioner definierade' },
  { value: 'scaffolding_generated', label: '5. Materiallista genererad' },
  { value: 'material_approved', label: '6. Material godkänt' },
  { value: 'transport_booked', label: '7. Transport bokad' },
  { value: 'built', label: '8. Ställning byggd' },
  { value: 'completed', label: '9. Klar / överlämnad' },
];

interface ItemState {
  checked: boolean;
  at?: string;
  by?: string;
  by_name?: string;
  note?: string;
}
type ChecklistState = Record<string, ItemState>;

export function ScaffoldingFullChecklist({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const [state, setState] = useState<ChecklistState>({});
  const [status, setStatus] = useState('not_analyzed');
  const [saving, setSaving] = useState(false);
  const [openNote, setOpenNote] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('scaffolding_jobs')
        .select('checklist_state, project_status')
        .eq('project_id', projectId).maybeSingle();
      setState(((data as any)?.checklist_state as ChecklistState) || {});
      setStatus((data as any)?.project_status || 'not_analyzed');
    })();
  }, [projectId]);

  const toggle = async (key: string, value: boolean) => {
    const next: ChecklistState = {
      ...state,
      [key]: value
        ? { checked: true, at: new Date().toISOString(), by: user?.id, by_name: user?.email || undefined, note: state[key]?.note }
        : { checked: false, note: state[key]?.note },
    };
    setState(next);
    await supabase.from('scaffolding_jobs').update({ checklist_state: next as any }).eq('project_id', projectId);
  };

  const setNote = async (key: string, note: string) => {
    const next: ChecklistState = {
      ...state, [key]: { ...(state[key] || { checked: false }), note },
    };
    setState(next);
    await supabase.from('scaffolding_jobs').update({ checklist_state: next as any }).eq('project_id', projectId);
  };

  const changeStatus = async (s: string) => {
    setSaving(true);
    setStatus(s);
    const { error } = await supabase.from('scaffolding_jobs')
      .update({ project_status: s }).eq('project_id', projectId);
    setSaving(false);
    if (error) toast({ title: 'Fel', description: error.message, variant: 'destructive' });
    else toast({ title: 'Status uppdaterad', description: STATUS_OPTIONS.find((o) => o.value === s)?.label });
  };

  const done = FULL_CHECKLIST.filter((i) => state[i.key]?.checked).length;
  const pct = Math.round((done / FULL_CHECKLIST.length) * 100);

  const groups = Array.from(new Set(FULL_CHECKLIST.map((i) => i.group)));

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-primary" />Projektledarens checklista
          </h3>
          <Badge variant={pct === 100 ? 'default' : 'secondary'}>
            {done}/{FULL_CHECKLIST.length} klara · {pct}%
          </Badge>
        </div>
        <Progress value={pct} />

        <div className="flex items-center gap-2 flex-wrap pt-1">
          <Label className="text-xs">Projektstatus:</Label>
          <Select value={status} onValueChange={changeStatus} disabled={saving}>
            <SelectTrigger className="h-8 w-[260px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3 pt-1">
          {groups.map((g) => (
            <div key={g} className="border rounded p-2 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground">{g}</div>
              {FULL_CHECKLIST.filter((i) => i.group === g).map((item) => {
                const s = state[item.key];
                const open = openNote === item.key;
                return (
                  <div key={item.key} className="space-y-1">
                    <div className="flex items-start gap-2">
                      <Checkbox checked={!!s?.checked} onCheckedChange={(v) => toggle(item.key, !!v)} className="mt-0.5" />
                      <div className="flex-1">
                        <div className="text-sm flex items-center gap-2">
                          {item.label}
                          {s?.checked && <CheckCircle2 className="w-3 h-3 text-green-600" />}
                        </div>
                        {s?.checked && (
                          <div className="text-[10px] text-muted-foreground">
                            {s.by_name && <>av {s.by_name} · </>}
                            {s.at && new Date(s.at).toLocaleString('sv-SE')}
                          </div>
                        )}
                      </div>
                      <Button size="sm" variant="ghost" className="h-7 text-xs"
                        onClick={() => setOpenNote(open ? null : item.key)}>
                        {s?.note ? 'Anteckning ✓' : 'Anteckning'}
                      </Button>
                    </div>
                    {open && (
                      <Textarea rows={2} className="text-xs"
                        value={s?.note || ''} placeholder="Anteckning / kommentar"
                        onChange={(e) => setNote(item.key, e.target.value)} />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
