import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Calculator, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  computeMaterials,
  summarizeMaterials,
  type ScaffoldingSectionInput,
  type PeriCatalogItem,
  type MaterialLine,
} from '@/utils/peri/scaffoldingEngine';

interface Section {
  id: string;
  name: string;
  length_m: number | null;
  height_m: number | null;
  width_m: number | null;
  lift_height_m: number | null;
  work_levels: number | null;
  ground_condition: string | null;
  anchoring: string | null;
  bridging: { span_m?: number } | null;
  notes: string | null;
  has_corner?: boolean;
}

export function ScaffoldingSectionsPanel({ projectId }: { projectId: string }) {
  const [sections, setSections] = useState<Section[]>([]);
  const [catalog, setCatalog] = useState<PeriCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: secs }, { data: cat }] = await Promise.all([
        supabase.from('scaffolding_sections').select('*').eq('project_id', projectId).order('sort_order'),
        supabase.from('peri_catalog').select('artnr,name,unit,rule_mapping').eq('active', true),
      ]);
      setSections((secs as any) || []);
      setCatalog((cat as any) || []);
      setLoading(false);
    })();
  }, [projectId]);

  const addSection = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: proj } = await supabase.from('projects').select('organization_id').eq('id', projectId).maybeSingle();
    if (!user || !proj) return;
    const { data, error } = await supabase.from('scaffolding_sections').insert({
      project_id: projectId,
      organization_id: proj.organization_id,
      name: `Sida ${sections.length + 1}`,
      sort_order: sections.length,
      width_m: 0.67,
      lift_height_m: 2.0,
      work_levels: 1,
    }).select().single();
    if (error) { toast({ title: 'Kunde inte skapa sektion', description: error.message, variant: 'destructive' }); return; }
    setSections((s) => [...s, data as any]);
  };

  const updateSection = (id: string, patch: Partial<Section>) => {
    setSections((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  const saveSection = async (s: Section) => {
    setSaving(true);
    const { error } = await supabase.from('scaffolding_sections').update({
      name: s.name,
      length_m: s.length_m,
      height_m: s.height_m,
      width_m: s.width_m,
      lift_height_m: s.lift_height_m,
      work_levels: s.work_levels,
      ground_condition: s.ground_condition,
      anchoring: s.anchoring,
      bridging: s.bridging || {},
      notes: s.notes,
    }).eq('id', s.id);
    setSaving(false);
    if (error) toast({ title: 'Kunde inte spara', description: error.message, variant: 'destructive' });
    else toast({ title: 'Sektion sparad' });
  };

  const deleteSection = async (id: string) => {
    if (!confirm('Ta bort sektion?')) return;
    const { error } = await supabase.from('scaffolding_sections').delete().eq('id', id);
    if (error) { toast({ title: 'Fel', description: error.message, variant: 'destructive' }); return; }
    setSections((s) => s.filter((x) => x.id !== id));
  };

  const lines: MaterialLine[] = useMemo(() => {
    const input: ScaffoldingSectionInput[] = sections
      .filter((s) => (s.length_m || 0) > 0 && (s.height_m || 0) > 0)
      .map((s) => ({
        id: s.id,
        name: s.name,
        length_m: s.length_m || 0,
        height_m: s.height_m || 0,
        width_m: s.width_m || 0.67,
        lift_height_m: s.lift_height_m || 2.0,
        work_levels: s.work_levels || 1,
        bridging: s.bridging || undefined,
        has_corner: !!s.has_corner,
      }));
    return computeMaterials(input, catalog);
  }, [sections, catalog]);

  const summary = useMemo(() => summarizeMaterials(lines), [lines]);
  const missing = summary.filter((l) => l.warning).length;

  const saveMaterialList = async () => {
    const { error } = await supabase.from('scaffolding_jobs').update({
      material_lines: summary as any,
      project_status: 'scaffolding_generated',
      updated_at: new Date().toISOString(),
    }).eq('project_id', projectId);
    if (error) toast({ title: 'Fel', description: error.message, variant: 'destructive' });
    else toast({ title: 'Materiallista sparad', description: `${summary.length} artiklar` });
  };

  if (loading) return <div className="p-4 text-sm text-muted-foreground">Laddar…</div>;

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Ställningssektioner</h3>
              <p className="text-xs text-muted-foreground">Mät fasaden på bilden ovan och fyll i längd + höjd per sektion. Materiallistan räknas automatiskt.</p>
            </div>
            <Button size="sm" onClick={addSection}><Plus className="w-4 h-4 mr-1" />Ny sektion</Button>
          </div>

          {sections.length === 0 && <p className="text-sm text-muted-foreground">Inga sektioner ännu. Skapa en sektion per fasadsida.</p>}

          <div className="space-y-3">
            {sections.map((s) => (
              <div key={s.id} className="border rounded p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input value={s.name} onChange={(e) => updateSection(s.id, { name: e.target.value })} className="font-medium max-w-xs" />
                  <Button size="icon" variant="ghost" onClick={() => deleteSection(s.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Field label="Längd (m)" value={s.length_m} onChange={(v) => updateSection(s.id, { length_m: v })} />
                  <Field label="Höjd (m)" value={s.height_m} onChange={(v) => updateSection(s.id, { height_m: v })} />
                  <Field label="Bredd (m)" value={s.width_m} onChange={(v) => updateSection(s.id, { width_m: v })} step={0.01} />
                  <Field label="Bomlagshöjd (m)" value={s.lift_height_m} onChange={(v) => updateSection(s.id, { lift_height_m: v })} step={0.1} />
                  <Field label="Arbetsnivåer" value={s.work_levels} onChange={(v) => updateSection(s.id, { work_levels: v })} step={1} />
                  <Field label="Överbryggning spann (m)" value={s.bridging?.span_m ?? null} onChange={(v) => updateSection(s.id, { bridging: { span_m: v || 0 } })} />
                  <div>
                    <Label className="text-xs">Markförhållande</Label>
                    <Input value={s.ground_condition || ''} onChange={(e) => updateSection(s.id, { ground_condition: e.target.value })} placeholder="t.ex. asfalt, gräs" />
                  </div>
                  <div>
                    <Label className="text-xs">Förankring</Label>
                    <Input value={s.anchoring || ''} onChange={(e) => updateSection(s.id, { anchoring: e.target.value })} placeholder="t.ex. tegel, puts" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => saveSection(s)} disabled={saving}>Spara sektion</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {summary.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2"><Calculator className="w-4 h-4 text-primary" />Beräknad materiallista (regelmotor)</h3>
              <div className="flex items-center gap-2">
                {missing > 0 && <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />{missing} saknas i katalog</Badge>}
                <Button size="sm" onClick={saveMaterialList}>Spara materiallista</Button>
              </div>
            </div>
            <div className="border rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2">Art.nr</th>
                    <th className="text-left p-2">Namn</th>
                    <th className="text-right p-2">Antal</th>
                    <th className="text-left p-2">Enhet</th>
                    <th className="text-left p-2">Anm.</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((l, i) => (
                    <tr key={i} className={`border-t ${l.warning ? 'bg-destructive/5' : ''}`}>
                      <td className="p-2 font-mono text-xs">{l.artnr}</td>
                      <td className="p-2">{l.name}</td>
                      <td className="p-2 text-right font-medium">{l.qty}</td>
                      <td className="p-2 text-muted-foreground">{l.unit}</td>
                      <td className="p-2 text-xs text-muted-foreground">{l.warning || l.note || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">Beräknat från {sections.length} sektion(er) enligt PERI UP-standardfack (3,07 / 2,57 / 2,07 / 1,57 / 1,09 / 0,73 m). Granska och justera vid behov.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, value, onChange, step = 0.1 }: { label: string; value: number | null; onChange: (v: number | null) => void; step?: number }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        step={step}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      />
    </div>
  );
}
