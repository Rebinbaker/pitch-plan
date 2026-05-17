import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Calendar, Truck, Hammer, CheckCircle2, Camera, X, Loader2, MapPin, User, Phone,
  Package, Mail, Users, ClipboardList, ImageIcon, Send, Plus, Trash2, AlertTriangle, ShieldCheck,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import type { Project } from '@/types/project';
import {
  SCAFFOLDING_CHECKLIST, REQUIRED_PHOTOS, ChecklistState,
  progressOfSection, progressOverall,
} from './scaffoldingChecklist';
import { calculateScaffolding, calcToMaterialSpec, ScaffoldingInput } from '@/utils/scaffoldingCalculator';

interface ScaffoldingJob {
  id?: string;
  project_id: string;
  measurement: ScaffoldingInput & { notes?: string };
  material_spec: Array<{ id: string; type: string; quantity: number; unit: string; notes?: string }>;
  order_status: 'draft' | 'sent' | 'confirmed';
  order_sent_at?: string | null;
  order_sent_to?: string | null;
  order_confirmed_at?: string | null;
  order_notes?: string | null;
  transport: any;
  assigned_members: Array<{ user_id?: string; member_id?: string; name: string; start_date?: string; days?: number }>;
  dismantle: any;
  documents: any[];
  activity_log: Array<{ at: string; user_id?: string; action: string; [k: string]: any }>;
  checklist: ChecklistState;
  photos: Record<string, { url: string; at: string; by?: string }>;
  safety_signed_at?: string | null;
  safety_signed_by?: string | null;
  risk_level: 'green' | 'yellow' | 'red';
}

interface Props {
  project: Project | null;
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

const emptyJob = (projectId: string): ScaffoldingJob => ({
  project_id: projectId,
  measurement: { sides: [0], height: 0, gables: 0 },
  material_spec: [],
  order_status: 'draft',
  transport: {},
  assigned_members: [],
  dismantle: {},
  documents: [],
  activity_log: [],
  checklist: {},
  photos: {},
  risk_level: 'green',
});

export function ScaffolderProjectModal({ project, open, onClose, onChanged }: Props) {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [job, setJob] = useState<ScaffoldingJob | null>(null);

  useEffect(() => {
    if (!open || !project) return;
    (async () => {
      setLoading(true);
      try {
        const { data: j } = await supabase
          .from('scaffolding_jobs' as any).select('*').eq('project_id', project.id).maybeSingle();
        const base = emptyJob(project.id);
        setJob({ ...base, ...(j as any || {}) });
      } finally { setLoading(false); }
    })();
  }, [open, project]);

  const saveJob = async (patch: Partial<ScaffoldingJob>) => {
    if (!project || !organizationId) return;
    setSaving(true);
    try {
      const merged = { ...(job ?? emptyJob(project.id)), ...patch } as ScaffoldingJob;
      const { error } = await supabase.from('scaffolding_jobs' as any).upsert({
        project_id: project.id,
        organization_id: organizationId,
        measurement: merged.measurement,
        material_spec: merged.material_spec,
        order_status: merged.order_status,
        order_sent_at: merged.order_sent_at,
        order_sent_to: merged.order_sent_to,
        order_confirmed_at: merged.order_confirmed_at,
        order_notes: merged.order_notes,
        transport: merged.transport,
        assigned_members: merged.assigned_members,
        dismantle: merged.dismantle,
        documents: merged.documents,
        activity_log: merged.activity_log,
        checklist: merged.checklist,
        photos: merged.photos,
        safety_signed_at: merged.safety_signed_at,
        safety_signed_by: merged.safety_signed_by,
        risk_level: merged.risk_level,
      }, { onConflict: 'project_id' });
      if (error) throw error;
      setJob(merged);
      onChanged?.();
    } catch (e: any) {
      toast({ title: 'Kunde inte spara', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const toggleCheck = async (key: string) => {
    if (!job || !user) return;
    const cur = job.checklist[key]?.checked;
    const next: ChecklistState = {
      ...job.checklist,
      [key]: { checked: !cur, at: new Date().toISOString(), by: user.id },
    };
    const log = [...(job.activity_log || []), { at: new Date().toISOString(), user_id: user.id, action: cur ? 'check_off' : 'check_on', key }];
    await saveJob({ checklist: next, activity_log: log });
  };

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6">
            <span className="truncate">{project.name}</span>
            {saving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            {job && <RiskBadge level={job.risk_level} />}
          </DialogTitle>
        </DialogHeader>

        <ProjectInfo project={project} />

        {loading || !job ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <>
            <OverallProgress state={job.checklist} />
            <Tabs defaultValue="checklist" className="mt-4">
              <TabsList className="grid grid-cols-3 md:grid-cols-7 h-auto">
                <TabsTrigger value="checklist" className="text-xs"><ClipboardList className="w-3 h-3 mr-1" />Checklista</TabsTrigger>
                <TabsTrigger value="material" className="text-xs"><Package className="w-3 h-3 mr-1" />Material</TabsTrigger>
                <TabsTrigger value="order" className="text-xs"><Mail className="w-3 h-3 mr-1" />Beställning</TabsTrigger>
                <TabsTrigger value="transport" className="text-xs"><Truck className="w-3 h-3 mr-1" />Transport</TabsTrigger>
                <TabsTrigger value="team" className="text-xs"><Users className="w-3 h-3 mr-1" />Bemanning</TabsTrigger>
                <TabsTrigger value="photos" className="text-xs"><ImageIcon className="w-3 h-3 mr-1" />Foton</TabsTrigger>
                <TabsTrigger value="log" className="text-xs"><Hammer className="w-3 h-3 mr-1" />Logg</TabsTrigger>
              </TabsList>

              <TabsContent value="checklist" className="mt-4 space-y-3">
                {SCAFFOLDING_CHECKLIST.map((section) => (
                  <ChecklistSectionCard
                    key={section.id} section={section} state={job.checklist}
                    onToggle={toggleCheck}
                  />
                ))}
                <RiskCommentSection job={job} onSave={(risk_level, log) => saveJob({ risk_level, activity_log: log })} />
              </TabsContent>

              <TabsContent value="material" className="mt-4">
                <MaterialAutoSection
                  job={job}
                  onSaveMeasurement={(measurement) => saveJob({ measurement })}
                  onApplySpec={(material_spec) => saveJob({ material_spec })}
                />
              </TabsContent>

              <TabsContent value="order" className="mt-4">
                <MaterialOrderSection
                  job={job} projectId={project.id}
                  onSent={async () => {
                    const { data } = await supabase.from('scaffolding_jobs' as any).select('*').eq('project_id', project.id).maybeSingle();
                    if (data) setJob({ ...emptyJob(project.id), ...(data as any) });
                  }}
                  onConfirm={() => saveJob({ order_status: 'confirmed', order_confirmed_at: new Date().toISOString() })}
                />
              </TabsContent>

              <TabsContent value="transport" className="mt-4">
                <TransportSection job={job} onSave={(transport) => saveJob({ transport })} />
              </TabsContent>

              <TabsContent value="team" className="mt-4">
                <AssemblerAssignmentSection project={project} job={job}
                  onSave={(assigned_members) => saveJob({ assigned_members })} />
              </TabsContent>

              <TabsContent value="photos" className="mt-4">
                <PhotoSection job={job} projectId={project.id}
                  onSave={(photos) => saveJob({ photos })}
                  onSignSafety={() => saveJob({ safety_signed_at: new Date().toISOString(), safety_signed_by: user?.id || null })}
                />
              </TabsContent>

              <TabsContent value="log" className="mt-4">
                <ActivityLog job={job} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ============ Subkomponenter ============ */

function RiskBadge({ level }: { level: 'green' | 'yellow' | 'red' }) {
  if (level === 'red') return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />Akut</Badge>;
  if (level === 'yellow') return <Badge className="bg-yellow-500 text-white gap-1"><AlertTriangle className="w-3 h-3" />Risk</Badge>;
  return <Badge className="bg-emerald-600 text-white">OK</Badge>;
}

function ProjectInfo({ project }: { project: Project }) {
  return (
    <Card>
      <CardContent className="p-4 grid sm:grid-cols-2 gap-2 text-sm">
        {project.address && (
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.address)}`}
              target="_blank" rel="noreferrer" className="text-primary hover:underline">
              {project.address}
            </a>
          </div>
        )}
        {project.customerName && <div className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground" />{project.customerName}</div>}
        {project.customerPhone && (
          <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" />
            <a href={`tel:${project.customerPhone}`} className="text-primary">{project.customerPhone}</a>
          </div>
        )}
        {(project.startDate || project.constructionStartWeek) && (
          <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" />
            <span>Start: {project.startDate || project.constructionStartWeek}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OverallProgress({ state }: { state: ChecklistState }) {
  const pct = progressOverall(state);
  return (
    <div className="mt-3 space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Total framdrift</span><span>{pct}%</span>
      </div>
      <Progress value={pct} />
    </div>
  );
}

function ChecklistSectionCard({
  section, state, onToggle,
}: { section: typeof SCAFFOLDING_CHECKLIST[number]; state: ChecklistState; onToggle: (k: string) => void }) {
  const pct = progressOfSection(section, state);
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">{section.title}</h3>
          <Badge variant={pct === 100 ? 'default' : 'secondary'}>{pct}%</Badge>
        </div>
        <Progress value={pct} className="h-1" />
        <div className="space-y-1 pt-2">
          {section.items.map((i) => {
            const c = state[i.key];
            return (
              <label key={i.key} className="flex items-start gap-2 py-1 cursor-pointer hover:bg-muted/40 rounded px-2">
                <Checkbox checked={!!c?.checked} onCheckedChange={() => onToggle(i.key)} className="mt-0.5" />
                <span className={`text-sm flex-1 ${c?.checked ? 'line-through text-muted-foreground' : ''}`}>{i.label}</span>
                {c?.at && <span className="text-xs text-muted-foreground">{format(new Date(c.at), 'd MMM', { locale: sv })}</span>}
              </label>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function RiskCommentSection({
  job, onSave,
}: { job: ScaffoldingJob; onSave: (level: 'green' | 'yellow' | 'red', log: any[]) => void }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <Label>Risknivå</Label>
        <div className="flex gap-2">
          {(['green', 'yellow', 'red'] as const).map((lvl) => (
            <Button key={lvl} size="sm" variant={job.risk_level === lvl ? 'default' : 'outline'}
              onClick={() => onSave(lvl, [...(job.activity_log || []), { at: new Date().toISOString(), action: 'risk_set', level: lvl }])}
              className={job.risk_level === lvl ? (lvl === 'red' ? 'bg-destructive' : lvl === 'yellow' ? 'bg-yellow-500' : 'bg-emerald-600') : ''}>
              {lvl === 'green' ? 'Grön (OK)' : lvl === 'yellow' ? 'Gul (Snart)' : 'Röd (Akut)'}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MaterialAutoSection({
  job, onSaveMeasurement, onApplySpec,
}: {
  job: ScaffoldingJob;
  onSaveMeasurement: (m: ScaffoldingJob['measurement']) => void;
  onApplySpec: (s: ScaffoldingJob['material_spec']) => void;
}) {
  const [m, setM] = useState<ScaffoldingInput & { notes?: string }>({
    sides: job.measurement?.sides?.length ? job.measurement.sides : [0],
    height: job.measurement?.height || 0,
    gables: job.measurement?.gables || 0,
    weatherProtection: job.measurement?.weatherProtection || false,
    specials: job.measurement?.specials || '',
    notes: job.measurement?.notes || '',
  });
  useEffect(() => {
    setM({
      sides: job.measurement?.sides?.length ? job.measurement.sides : [0],
      height: job.measurement?.height || 0,
      gables: job.measurement?.gables || 0,
      weatherProtection: job.measurement?.weatherProtection || false,
      specials: job.measurement?.specials || '',
      notes: job.measurement?.notes || '',
    });
  }, [job.measurement]);

  const calc = calculateScaffolding(m);
  const rows = calcToMaterialSpec(calc, m.gables);

  return (
    <div className="space-y-3">
      <Card><CardContent className="p-4 space-y-3">
        <h3 className="font-semibold">Mått</h3>
        <div className="space-y-2">
          <Label>Husets längder (meter per sida)</Label>
          {m.sides.map((s, i) => (
            <div key={i} className="flex gap-2">
              <Input type="number" value={s || ''} placeholder={`Sida ${i + 1}`}
                onChange={(e) => {
                  const v = [...m.sides]; v[i] = Number(e.target.value) || 0; setM({ ...m, sides: v });
                }} />
              {m.sides.length > 1 && (
                <Button variant="ghost" size="icon" onClick={() => setM({ ...m, sides: m.sides.filter((_, ix) => ix !== i) })}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setM({ ...m, sides: [...m.sides, 0] })}>
            <Plus className="w-4 h-4 mr-1" />Lägg till sida
          </Button>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div><Label>Höjd (m)</Label><Input type="number" value={m.height || ''} onChange={(e) => setM({ ...m, height: Number(e.target.value) || 0 })} /></div>
          <div><Label>Antal gavlar</Label><Input type="number" value={m.gables || ''} onChange={(e) => setM({ ...m, gables: Number(e.target.value) || 0 })} /></div>
          <div className="flex items-end gap-2">
            <Checkbox id="vader" checked={m.weatherProtection} onCheckedChange={(v) => setM({ ...m, weatherProtection: !!v })} />
            <Label htmlFor="vader">Väderskydd</Label>
          </div>
        </div>
        <div><Label>Specialdelar / anteckning</Label><Textarea rows={2} value={m.specials || ''} onChange={(e) => setM({ ...m, specials: e.target.value })} /></div>
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => onSaveMeasurement(m)}>Spara mått</Button>
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Auto-beräknad materiallista</h3>
          <span className="text-xs text-muted-foreground">{calc.totalLength} m · {calc.floors} våning(ar) · {calc.totalArea} m²</span>
        </div>
        <div className="border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr><th className="text-left p-2">Typ</th><th className="text-right p-2">Antal</th><th className="text-left p-2">Enhet</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t"><td className="p-2">{r.type}</td><td className="p-2 text-right font-medium">{r.quantity}</td><td className="p-2 text-muted-foreground">{r.unit}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-2">
          <Button size="sm" onClick={() => { onSaveMeasurement(m); onApplySpec(rows); toast({ title: 'Materialspec uppdaterad' }); }}>
            Använd som materialspecifikation
          </Button>
        </div>
      </CardContent></Card>
    </div>
  );
}

function MaterialOrderSection({
  job, projectId, onSent, onConfirm,
}: { job: ScaffoldingJob; projectId: string; onSent: () => void; onConfirm: () => void }) {
  const [supplierEmail, setSupplierEmail] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [extra, setExtra] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!supplierEmail) { toast({ title: 'Ange leverantörens e-post', variant: 'destructive' }); return; }
    if (!job.material_spec?.length) { toast({ title: 'Materialspec är tom', variant: 'destructive' }); return; }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-scaffolding-order', {
        body: { project_id: projectId, supplier_email: supplierEmail, delivery_date: deliveryDate || undefined, extra_notes: extra || undefined },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: 'Beställning skickad', description: supplierEmail });
      onSent();
    } catch (e: any) {
      toast({ title: 'Kunde inte skicka', description: e.message, variant: 'destructive' });
    } finally { setSending(false); }
  };

  return (
    <Card><CardContent className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant={job.order_status === 'confirmed' ? 'default' : job.order_status === 'sent' ? 'secondary' : 'outline'}>
          {job.order_status === 'confirmed' ? 'Bekräftad' : job.order_status === 'sent' ? 'Skickad' : 'Utkast'}
        </Badge>
        {job.order_sent_at && (
          <span className="text-xs text-muted-foreground">Skickad {format(new Date(job.order_sent_at), 'd MMM HH:mm', { locale: sv })} till {job.order_sent_to}</span>
        )}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><Label>Leverantörens e-post</Label><Input type="email" value={supplierEmail} onChange={(e) => setSupplierEmail(e.target.value)} placeholder="order@leverantor.se" /></div>
        <div><Label>Önskat leveransdatum</Label><Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} /></div>
      </div>
      <div><Label>Övrigt meddelande</Label><Textarea rows={3} value={extra} onChange={(e) => setExtra(e.target.value)} /></div>
      <div className="flex justify-between flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={job.order_status !== 'sent'} onClick={onConfirm}>
          <CheckCircle2 className="w-4 h-4 mr-1" />Markera bekräftad
        </Button>
        <Button size="sm" onClick={send} disabled={sending}>
          {sending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
          {job.order_status === 'sent' ? 'Skicka igen' : 'Skicka beställning'}
        </Button>
      </div>
    </CardContent></Card>
  );
}

function TransportSection({ job, onSave }: { job: ScaffoldingJob; onSave: (t: any) => void }) {
  const [t, setT] = useState(job.transport || {});
  useEffect(() => setT(job.transport || {}), [job.transport]);
  return (
    <Card><CardContent className="p-4 space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div><Label>Transportör / chaufför</Label><Input value={t.carrier ?? ''} onChange={(e) => setT({ ...t, carrier: e.target.value })} /></div>
        <div><Label>Leveransdag</Label><Input type="date" value={t.date ?? ''} onChange={(e) => setT({ ...t, date: e.target.value })} /></div>
        <div><Label>Telefonnummer</Label><Input value={t.phone ?? ''} onChange={(e) => setT({ ...t, phone: e.target.value })} /></div>
        <div><Label>Kontaktperson på plats</Label><Input value={t.contact ?? ''} onChange={(e) => setT({ ...t, contact: e.target.value })} /></div>
        <div className="sm:col-span-2"><Label>Google Maps-länk (avställningsplats)</Label><Input value={t.maps_url ?? ''} onChange={(e) => setT({ ...t, maps_url: e.target.value })} placeholder="https://maps.app.goo.gl/..." /></div>
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" onClick={() => onSave(t)}>Spara</Button>
      </div>
    </CardContent></Card>
  );
}

function AssemblerAssignmentSection({
  project, job, onSave,
}: { project: Project; job: ScaffoldingJob; onSave: (m: ScaffoldingJob['assigned_members']) => void }) {
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; firstName: string; lastName: string; user_id?: string }>>([]);
  const [assigned, setAssigned] = useState(job.assigned_members || []);
  useEffect(() => setAssigned(job.assigned_members || []), [job.assigned_members]);
  useEffect(() => {
    (async () => {
      if (!project.scaffoldingTeamId) return;
      const { data } = await supabase.from('teams').select('members').eq('id', project.scaffoldingTeamId).maybeSingle();
      const members = ((data as any)?.members as any[]) || [];
      setTeamMembers(members.map((m) => ({ id: m.id, firstName: m.firstName || m.first_name || '', lastName: m.lastName || m.last_name || '', user_id: m.user_id })));
    })();
  }, [project.scaffoldingTeamId]);

  const toggle = (m: typeof teamMembers[number]) => {
    const exists = assigned.find((a) => a.member_id === m.id);
    if (exists) setAssigned(assigned.filter((a) => a.member_id !== m.id));
    else setAssigned([...assigned, { member_id: m.id, user_id: m.user_id, name: `${m.firstName} ${m.lastName}`.trim() }]);
  };
  const updField = (member_id: string, patch: any) =>
    setAssigned(assigned.map((a) => (a.member_id === member_id ? { ...a, ...patch } : a)));

  if (!project.scaffoldingTeamId) {
    return <Card><CardContent className="p-4 text-sm text-muted-foreground">Inget ställningsteam kopplat till projektet.</CardContent></Card>;
  }
  if (teamMembers.length === 0) {
    return <Card><CardContent className="p-4 text-sm text-muted-foreground">Inga medlemmar i ditt team.</CardContent></Card>;
  }
  return (
    <Card><CardContent className="p-4 space-y-3">
      <div className="space-y-2">
        {teamMembers.map((m) => {
          const a = assigned.find((x) => x.member_id === m.id);
          return (
            <div key={m.id} className="grid grid-cols-12 gap-2 items-center border rounded p-2">
              <Button size="sm" variant={a ? 'default' : 'outline'} className="col-span-4 justify-start" onClick={() => toggle(m)}>
                {a ? <CheckCircle2 className="w-4 h-4 mr-1" /> : null}{m.firstName} {m.lastName}
              </Button>
              {a && (
                <>
                  <Input className="col-span-4" type="date" value={a.start_date ?? ''} onChange={(e) => updField(m.id, { start_date: e.target.value })} />
                  <Input className="col-span-3" type="number" placeholder="Dagar" value={a.days ?? ''} onChange={(e) => updField(m.id, { days: Number(e.target.value) || undefined })} />
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-end"><Button size="sm" onClick={() => onSave(assigned)}>Spara bemanning</Button></div>
    </CardContent></Card>
  );
}

function PhotoSection({
  job, projectId, onSave, onSignSafety,
}: {
  job: ScaffoldingJob; projectId: string;
  onSave: (p: ScaffoldingJob['photos']) => void;
  onSignSafety: () => void;
}) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState<string | null>(null);
  const [signed, setSigned] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(job.photos || {})) {
        if (v?.url) {
          const { data } = await supabase.storage.from('worker-checkin-photos').createSignedUrl(v.url, 3600);
          if (data?.signedUrl) next[k] = data.signedUrl;
        }
      }
      setSigned(next);
    })();
  }, [job.photos]);

  const upload = async (key: string, file: File) => {
    if (!user) return;
    setUploading(key);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${user.id}/scaffolding/${projectId}/${key}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('worker-checkin-photos').upload(path, file, { contentType: file.type || 'image/jpeg' });
      if (error) throw error;
      const photos = { ...(job.photos || {}), [key]: { url: path, at: new Date().toISOString(), by: user.id } };
      onSave(photos);
      toast({ title: 'Foto sparat' });
    } catch (e: any) {
      toast({ title: 'Uppladdning misslyckades', description: e.message, variant: 'destructive' });
    } finally { setUploading(null); }
  };

  const remove = (key: string) => {
    const next = { ...(job.photos || {}) };
    delete next[key];
    onSave(next);
  };

  const renderGroup = (title: string, items: readonly { key: string; label: string }[]) => (
    <div className="space-y-2">
      <h4 className="font-medium text-sm">{title}</h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {items.map((p) => {
          const has = job.photos?.[p.key];
          return (
            <div key={p.key} className="border rounded p-2 space-y-1">
              <div className="text-xs font-medium">{p.label}</div>
              {has && signed[p.key] ? (
                <div className="relative">
                  <img src={signed[p.key]} alt={p.label} className="w-full h-24 object-cover rounded" />
                  <Button size="icon" variant="secondary" className="absolute top-1 right-1 h-6 w-6" onClick={() => remove(p.key)}><X className="w-3 h-3" /></Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed rounded cursor-pointer hover:bg-muted/40">
                  {uploading === p.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 text-muted-foreground" />}
                  <span className="text-[10px] text-muted-foreground mt-1">Ladda upp</span>
                  <input type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(p.key, f); }} />
                </label>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const allBefore = REQUIRED_PHOTOS.before.every((p) => job.photos?.[p.key]);
  const allAfter = REQUIRED_PHOTOS.after.every((p) => job.photos?.[p.key]);
  const canSign = allBefore && allAfter;

  return (
    <Card><CardContent className="p-4 space-y-4">
      {renderGroup('Före montering', REQUIRED_PHOTOS.before)}
      {renderGroup('Efter montering', REQUIRED_PHOTOS.after)}
      <div className="border-t pt-3 flex items-center justify-between">
        <div className="text-sm">
          {job.safety_signed_at ? (
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <ShieldCheck className="w-4 h-4" />Säkerhetskontroll signerad {format(new Date(job.safety_signed_at), 'd MMM HH:mm', { locale: sv })}
            </span>
          ) : (
            <span className="text-muted-foreground">{canSign ? 'Alla foton uppladdade — du kan signera säkerhetskontrollen.' : 'Ladda upp alla obligatoriska foton för att kunna signera.'}</span>
          )}
        </div>
        <Button size="sm" disabled={!canSign || !!job.safety_signed_at} onClick={onSignSafety}>
          <ShieldCheck className="w-4 h-4 mr-1" />Signera säkerhet
        </Button>
      </div>
    </CardContent></Card>
  );
}

function ActivityLog({ job }: { job: ScaffoldingJob }) {
  const log = [...(job.activity_log || [])].reverse();
  if (log.length === 0) return <Card><CardContent className="p-4 text-sm text-muted-foreground">Inga händelser än.</CardContent></Card>;
  return (
    <Card><CardContent className="p-4 space-y-2 text-sm">
      {log.map((e, i) => (
        <div key={i} className="flex justify-between border-b last:border-0 pb-1">
          <span>{e.action} {e.key ? <span className="text-muted-foreground">· {e.key}</span> : null}</span>
          <span className="text-xs text-muted-foreground">{format(new Date(e.at), 'd MMM HH:mm', { locale: sv })}</span>
        </div>
      ))}
    </CardContent></Card>
  );
}
