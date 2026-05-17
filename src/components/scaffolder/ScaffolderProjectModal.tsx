import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Calendar, Truck, Hammer, CheckCircle2, Camera, X, Loader2, MapPin, User, Phone,
  Ruler, Package, Mail, Users, Wrench, FileText, Plus, Trash2, Send,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import type { Project } from '@/types/project';

interface ScaffoldingJob {
  id?: string;
  project_id: string;
  measurement: {
    meters?: number;
    floors?: number;
    height?: number;
    sides?: string;
    notes?: string;
    completed_at?: string;
    photo_url?: string;
  };
  material_spec: Array<{ id: string; type: string; quantity: number; unit: string; notes?: string }>;
  order_status: 'draft' | 'sent' | 'confirmed';
  order_sent_at?: string | null;
  order_sent_to?: string | null;
  order_confirmed_at?: string | null;
  order_notes?: string | null;
  transport: {
    carrier?: string;
    date?: string;
    contact?: string;
    vehicle?: string;
    booked_at?: string;
    photo_url?: string;
  };
  assigned_members: Array<{ user_id?: string; member_id?: string; name: string; start_date?: string; days?: number }>;
  dismantle: {
    planned_date?: string;
    responsible?: string;
    done_at?: string;
    photo_url?: string;
    note?: string;
  };
  documents: Array<{ url: string; name: string; type?: string; uploaded_at: string; uploaded_by?: string }>;
  activity_log: Array<{ at: string; user_id?: string; action: string; [k: string]: any }>;
}

interface Confirmation {
  booked_at: string | null;
  booked_note: string | null;
  transport_booked_at: string | null;
  transport_booked_note: string | null;
  assembled_at: string | null;
  assembled_note: string | null;
  assembled_photo_url: string | null;
}

interface Props {
  project: Project | null;
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

const emptyJob = (projectId: string): ScaffoldingJob => ({
  project_id: projectId,
  measurement: {},
  material_spec: [],
  order_status: 'draft',
  transport: {},
  assigned_members: [],
  dismantle: {},
  documents: [],
  activity_log: [],
});

export function ScaffolderProjectModal({ project, open, onClose, onChanged }: Props) {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [job, setJob] = useState<ScaffoldingJob | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  useEffect(() => {
    if (!open || !project) return;
    (async () => {
      setLoading(true);
      try {
        const [{ data: j }, { data: c }] = await Promise.all([
          supabase.from('scaffolding_jobs' as any).select('*').eq('project_id', project.id).maybeSingle(),
          supabase.from('scaffolding_confirmations' as any).select('*').eq('project_id', project.id).maybeSingle(),
        ]);
        setJob(((j as any) ?? emptyJob(project.id)) as ScaffoldingJob);
        setConfirmation((c as any) || null);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, project]);

  const saveJob = async (patch: Partial<ScaffoldingJob>) => {
    if (!project || !organizationId) return;
    setSaving(true);
    try {
      const merged = { ...(job ?? emptyJob(project.id)), ...patch } as ScaffoldingJob;
      const { error } = await supabase
        .from('scaffolding_jobs' as any)
        .upsert(
          {
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
          },
          { onConflict: 'project_id' },
        );
      if (error) throw error;
      setJob(merged);
      onChanged?.();
    } catch (e: any) {
      toast({ title: 'Kunde inte spara', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const reloadConfirmation = async () => {
    if (!project) return;
    const { data } = await supabase.from('scaffolding_confirmations' as any).select('*').eq('project_id', project.id).maybeSingle();
    setConfirmation((data as any) || null);
  };

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6">
            <span className="truncate">{project.name}</span>
            {saving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </DialogTitle>
        </DialogHeader>

        <ProjectInfo project={project} />

        {loading || !job ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <Tabs defaultValue="measurement" className="mt-4">
            <TabsList className="grid grid-cols-4 md:grid-cols-7 h-auto">
              <TabsTrigger value="measurement" className="text-xs"><Ruler className="w-3 h-3 mr-1" />Mätning</TabsTrigger>
              <TabsTrigger value="material" className="text-xs"><Package className="w-3 h-3 mr-1" />Material</TabsTrigger>
              <TabsTrigger value="order" className="text-xs"><Mail className="w-3 h-3 mr-1" />Beställning</TabsTrigger>
              <TabsTrigger value="transport" className="text-xs"><Truck className="w-3 h-3 mr-1" />Transport</TabsTrigger>
              <TabsTrigger value="team" className="text-xs"><Users className="w-3 h-3 mr-1" />Montörer</TabsTrigger>
              <TabsTrigger value="assembly" className="text-xs"><Hammer className="w-3 h-3 mr-1" />Montering</TabsTrigger>
              <TabsTrigger value="dismantle" className="text-xs"><Wrench className="w-3 h-3 mr-1" />Nedmontering</TabsTrigger>
            </TabsList>

            <TabsContent value="measurement" className="mt-4">
              <MeasurementSection job={job} onSave={(measurement) => saveJob({ measurement })} />
            </TabsContent>
            <TabsContent value="material" className="mt-4">
              <MaterialSpecSection job={job} onSave={(material_spec) => saveJob({ material_spec })} />
            </TabsContent>
            <TabsContent value="order" className="mt-4">
              <MaterialOrderSection
                job={job} projectId={project.id}
                onSent={async () => {
                  const { data } = await supabase.from('scaffolding_jobs' as any).select('*').eq('project_id', project.id).maybeSingle();
                  if (data) setJob(data as any);
                }}
                onConfirm={() => saveJob({ order_status: 'confirmed', order_confirmed_at: new Date().toISOString() })}
              />
            </TabsContent>
            <TabsContent value="transport" className="mt-4">
              <TransportSection job={job} onSave={(transport) => saveJob({ transport })} />
            </TabsContent>
            <TabsContent value="team" className="mt-4">
              <AssemblerAssignmentSection
                project={project} job={job}
                onSave={(assigned_members) => saveJob({ assigned_members })}
              />
            </TabsContent>
            <TabsContent value="assembly" className="mt-4">
              <AssemblySection
                project={project} confirmation={confirmation} onChanged={reloadConfirmation}
              />
            </TabsContent>
            <TabsContent value="dismantle" className="mt-4">
              <DismantleSection job={job} onSave={(dismantle) => saveJob({ dismantle })} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ============= Project Info ============= */
function ProjectInfo({ project }: { project: Project }) {
  return (
    <Card>
      <CardContent className="p-4 grid sm:grid-cols-2 gap-2 text-sm">
        {project.address && (
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.address)}`}
              target="_blank" rel="noreferrer" className="text-primary hover:underline"
            >
              {project.address}
            </a>
          </div>
        )}
        {project.customerName && (
          <div className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground" /><span>{project.customerName}</span></div>
        )}
        {project.customerPhone && (
          <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" />
            <a href={`tel:${project.customerPhone}`} className="text-primary">{project.customerPhone}</a>
          </div>
        )}
        {(project.planerad_start_datum || project.startDate) && (
          <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" />
            <span>Start: {project.planerad_start_datum || project.startDate}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ============= Measurement ============= */
function MeasurementSection({ job, onSave }: { job: ScaffoldingJob; onSave: (m: ScaffoldingJob['measurement']) => void }) {
  const [m, setM] = useState(job.measurement || {});
  useEffect(() => setM(job.measurement || {}), [job.measurement]);

  const sections = m.meters && m.height ? Math.ceil((m.meters * m.height) / 6) : null; // crude

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>Löpmeter ställning</Label>
            <Input type="number" value={m.meters ?? ''} onChange={(e) => setM({ ...m, meters: Number(e.target.value) || undefined })} />
          </div>
          <div><Label>Höjd (m)</Label>
            <Input type="number" value={m.height ?? ''} onChange={(e) => setM({ ...m, height: Number(e.target.value) || undefined })} />
          </div>
          <div><Label>Antal våningar</Label>
            <Input type="number" value={m.floors ?? ''} onChange={(e) => setM({ ...m, floors: Number(e.target.value) || undefined })} />
          </div>
          <div><Label>Sidor (t.ex. N, Ö, S)</Label>
            <Input value={m.sides ?? ''} onChange={(e) => setM({ ...m, sides: e.target.value })} />
          </div>
        </div>
        <div><Label>Anteckningar (utskjutande tak, balkonger, etc.)</Label>
          <Textarea rows={3} value={m.notes ?? ''} onChange={(e) => setM({ ...m, notes: e.target.value })} />
        </div>
        {sections != null && (
          <div className="text-sm text-muted-foreground">≈ {sections} sektioner (uppskattning)</div>
        )}
        <div className="flex items-center justify-between">
          {m.completed_at ? (
            <Badge className="bg-primary"><CheckCircle2 className="w-3 h-3 mr-1" />Mätt {format(new Date(m.completed_at), 'd MMM HH:mm', { locale: sv })}</Badge>
          ) : <span className="text-xs text-muted-foreground">Inte markerad som klar</span>}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onSave(m)}>Spara</Button>
            <Button size="sm" onClick={() => onSave({ ...m, completed_at: new Date().toISOString() })}>
              <CheckCircle2 className="w-4 h-4 mr-1" />Markera mätt
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============= Material Spec ============= */
const DEFAULT_SPEC_ROWS: ScaffoldingJob['material_spec'] = [
  { id: 'r1', type: 'Ram 2.0 m', quantity: 0, unit: 'st' },
  { id: 'r2', type: 'Plank 3.0 m', quantity: 0, unit: 'st' },
  { id: 'r3', type: 'Räcke', quantity: 0, unit: 'st' },
  { id: 'r4', type: 'Fotlist', quantity: 0, unit: 'st' },
  { id: 'r5', type: 'Konsol', quantity: 0, unit: 'st' },
  { id: 'r6', type: 'Fästöra', quantity: 0, unit: 'st' },
];

function MaterialSpecSection({ job, onSave }: { job: ScaffoldingJob; onSave: (s: ScaffoldingJob['material_spec']) => void }) {
  const [rows, setRows] = useState(job.material_spec?.length ? job.material_spec : DEFAULT_SPEC_ROWS);
  useEffect(() => setRows(job.material_spec?.length ? job.material_spec : DEFAULT_SPEC_ROWS), [job.material_spec]);

  const upd = (id: string, patch: any) => setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const del = (id: string) => setRows(rows.filter((r) => r.id !== id));
  const add = () => setRows([...rows, { id: crypto.randomUUID(), type: '', quantity: 0, unit: 'st' }]);

  return (
    <Card><CardContent className="p-4 space-y-3">
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="grid grid-cols-12 gap-2 items-center">
            <Input className="col-span-5" placeholder="Typ" value={r.type} onChange={(e) => upd(r.id, { type: e.target.value })} />
            <Input className="col-span-2" type="number" placeholder="Antal" value={r.quantity || ''} onChange={(e) => upd(r.id, { quantity: Number(e.target.value) || 0 })} />
            <Input className="col-span-2" placeholder="Enhet" value={r.unit} onChange={(e) => upd(r.id, { unit: e.target.value })} />
            <Input className="col-span-2" placeholder="Kommentar" value={r.notes ?? ''} onChange={(e) => upd(r.id, { notes: e.target.value })} />
            <Button variant="ghost" size="icon" className="col-span-1" onClick={() => del(r.id)}><Trash2 className="w-4 h-4" /></Button>
          </div>
        ))}
      </div>
      <div className="flex justify-between">
        <Button variant="outline" size="sm" onClick={add}><Plus className="w-4 h-4 mr-1" />Lägg till rad</Button>
        <Button size="sm" onClick={() => onSave(rows)}>Spara specifikation</Button>
      </div>
    </CardContent></Card>
  );
}

/* ============= Material Order ============= */
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
        <div><Label>Leverantörens e-post</Label>
          <Input type="email" value={supplierEmail} onChange={(e) => setSupplierEmail(e.target.value)} placeholder="order@leverantor.se" />
        </div>
        <div><Label>Önskat leveransdatum</Label>
          <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
        </div>
      </div>
      <div><Label>Övrigt meddelande</Label>
        <Textarea rows={3} value={extra} onChange={(e) => setExtra(e.target.value)} />
      </div>
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

/* ============= Transport ============= */
function TransportSection({ job, onSave }: { job: ScaffoldingJob; onSave: (t: ScaffoldingJob['transport']) => void }) {
  const [t, setT] = useState(job.transport || {});
  useEffect(() => setT(job.transport || {}), [job.transport]);

  return (
    <Card><CardContent className="p-4 space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div><Label>Transportör</Label><Input value={t.carrier ?? ''} onChange={(e) => setT({ ...t, carrier: e.target.value })} /></div>
        <div><Label>Leveransdag</Label><Input type="date" value={t.date ?? ''} onChange={(e) => setT({ ...t, date: e.target.value })} /></div>
        <div><Label>Kontaktperson</Label><Input value={t.contact ?? ''} onChange={(e) => setT({ ...t, contact: e.target.value })} /></div>
        <div><Label>Bilstorlek / typ</Label><Input value={t.vehicle ?? ''} onChange={(e) => setT({ ...t, vehicle: e.target.value })} /></div>
      </div>
      <div className="flex justify-between items-center">
        {t.booked_at ? (
          <Badge className="bg-primary"><CheckCircle2 className="w-3 h-3 mr-1" />Bokad {format(new Date(t.booked_at), 'd MMM HH:mm', { locale: sv })}</Badge>
        ) : <span className="text-xs text-muted-foreground">Inte bokad</span>}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onSave(t)}>Spara</Button>
          <Button size="sm" onClick={() => onSave({ ...t, booked_at: new Date().toISOString() })}>Bekräfta bokning</Button>
        </div>
      </div>
    </CardContent></Card>
  );
}

/* ============= Assembler Assignment ============= */
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
  const updField = (member_id: string, patch: any) => setAssigned(assigned.map((a) => (a.member_id === member_id ? { ...a, ...patch } : a)));

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
              <Button
                size="sm" variant={a ? 'default' : 'outline'} className="col-span-4 justify-start"
                onClick={() => toggle(m)}
              >
                {a ? <CheckCircle2 className="w-4 h-4 mr-1" /> : null}
                {m.firstName} {m.lastName}
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
      <div className="flex justify-end">
        <Button size="sm" onClick={() => onSave(assigned)}>Spara tilldelning</Button>
      </div>
    </CardContent></Card>
  );
}

/* ============= Assembly (existing 3-step flow, reduced) ============= */
function AssemblySection({
  project, confirmation, onChanged,
}: { project: Project; confirmation: Confirmation | null; onChanged: () => void }) {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const STEPS = [
    { key: 'booked' as const, label: 'Ställningar bokade', icon: Calendar, needsPhoto: false },
    { key: 'transport' as const, label: 'Transport bokad', icon: Truck, needsPhoto: false },
    { key: 'assembled' as const, label: 'Ställningar uppmonterade', icon: Hammer, needsPhoto: true },
  ];
  const [active, setActive] = useState<typeof STEPS[number]['key'] | null>(null);
  const [note, setNote] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const stepDone = (k: string) => {
    if (!confirmation) return null;
    if (k === 'booked') return confirmation.booked_at;
    if (k === 'transport') return confirmation.transport_booked_at;
    return confirmation.assembled_at;
  };

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!active || !user || !organizationId) return;
    const meta = STEPS.find((s) => s.key === active)!;
    if (meta.needsPhoto && !photoFile) {
      toast({ title: 'Foto krävs', variant: 'destructive' }); return;
    }
    setWorking(true);
    try {
      let photoUrl: string | undefined;
      if (photoFile) {
        const ext = (photoFile.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${user.id}/scaffolding/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('worker-checkin-photos').upload(path, photoFile, { contentType: photoFile.type || 'image/jpeg' });
        if (upErr) throw upErr;
        photoUrl = path;
      }
      const now = new Date().toISOString();
      const patch: any = { updated_at: now };
      if (active === 'booked') { patch.booked_at = now; patch.booked_by = user.id; patch.booked_note = note || null; }
      else if (active === 'transport') { patch.transport_booked_at = now; patch.transport_booked_by = user.id; patch.transport_booked_note = note || null; }
      else { patch.assembled_at = now; patch.assembled_by = user.id; patch.assembled_note = note || null; patch.assembled_photo_url = photoUrl; }

      if (confirmation) {
        await supabase.from('scaffolding_confirmations' as any).update(patch).eq('project_id', project.id);
      } else {
        await supabase.from('scaffolding_confirmations' as any).insert({ project_id: project.id, organization_id: organizationId, ...patch });
      }
      toast({ title: 'Bekräftat', description: meta.label });
      setActive(null); setNote(''); setPhotoFile(null);
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
      onChanged();
    } catch (e: any) {
      toast({ title: 'Kunde inte spara', description: e.message, variant: 'destructive' });
    } finally { setWorking(false); }
  };

  return (
    <div className="space-y-3">
      {STEPS.map((step) => {
        const done = stepDone(step.key);
        const Icon = step.icon;
        const isActive = active === step.key;
        return (
          <Card key={step.key} className={done ? 'border-primary/40 bg-primary/5' : ''}>
            <CardContent className="p-3 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 rounded-full p-2 ${done ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-medium">{step.label}</div>
                    {done && (
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-primary" />
                        Bekräftat {format(new Date(done), 'd MMM HH:mm', { locale: sv })}
                      </div>
                    )}
                  </div>
                </div>
                {!done && !isActive && (
                  <Button size="sm" onClick={() => setActive(step.key)}>Bekräfta</Button>
                )}
              </div>
              {isActive && !done && (
                <div className="space-y-2 pl-11">
                  {step.needsPhoto && (
                    <>
                      <div className="rounded-lg border bg-muted/30 p-2 flex items-center justify-center min-h-[120px]">
                        {photoPreview ? (
                          <div className="relative w-full">
                            <img src={photoPreview} alt="" className="w-full max-h-[200px] object-contain rounded" />
                            <Button size="icon" variant="secondary" className="absolute top-2 right-2 h-7 w-7"
                              onClick={() => { setPhotoFile(null); if (photoPreview) URL.revokeObjectURL(photoPreview); setPhotoPreview(null); }}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : <span className="text-xs text-muted-foreground py-4">Foto krävs</span>}
                      </div>
                      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhoto} />
                      <Button variant="outline" size="sm" className="w-full" onClick={() => inputRef.current?.click()}>
                        <Camera className="w-4 h-4 mr-2" />{photoPreview ? 'Ta nytt foto' : 'Ta foto'}
                      </Button>
                    </>
                  )}
                  <Textarea placeholder="Anteckning (valfritt)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => { setActive(null); setNote(''); setPhotoFile(null); setPhotoPreview(null); }} disabled={working}>Avbryt</Button>
                    <Button size="sm" onClick={submit} disabled={working}>
                      {working ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                      Bekräfta
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/* ============= Dismantle ============= */
function DismantleSection({ job, onSave }: { job: ScaffoldingJob; onSave: (d: ScaffoldingJob['dismantle']) => void }) {
  const [d, setD] = useState(job.dismantle || {});
  useEffect(() => setD(job.dismantle || {}), [job.dismantle]);

  return (
    <Card><CardContent className="p-4 space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div><Label>Planerat nedmonteringsdatum</Label><Input type="date" value={d.planned_date ?? ''} onChange={(e) => setD({ ...d, planned_date: e.target.value })} /></div>
        <div><Label>Ansvarig montör</Label><Input value={d.responsible ?? ''} onChange={(e) => setD({ ...d, responsible: e.target.value })} /></div>
      </div>
      <div><Label>Anteckning</Label><Textarea rows={2} value={d.note ?? ''} onChange={(e) => setD({ ...d, note: e.target.value })} /></div>
      <div className="flex justify-between items-center">
        {d.done_at ? (
          <Badge className="bg-primary"><CheckCircle2 className="w-3 h-3 mr-1" />Nedmonterat {format(new Date(d.done_at), 'd MMM HH:mm', { locale: sv })}</Badge>
        ) : <span className="text-xs text-muted-foreground">Inte nedmonterat</span>}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onSave(d)}>Spara</Button>
          <Button size="sm" onClick={() => onSave({ ...d, done_at: new Date().toISOString() })}>
            <CheckCircle2 className="w-4 h-4 mr-1" />Markera nedmonterat
          </Button>
        </div>
      </div>
    </CardContent></Card>
  );
}
