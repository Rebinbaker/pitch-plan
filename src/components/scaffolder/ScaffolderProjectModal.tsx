import { useEffect, useState } from 'react';
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
  Calendar, CheckCircle2, Loader2, MapPin, User, Phone,
  Package, Mail, Sparkles, ClipboardList, Send, AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import type { Project } from '@/types/project';
import { SIMPLE_CHECKLIST, SimpleChecklistState, simpleProgress } from './scaffoldingChecklist';
import { AIPhotoAnalysisTab } from './AIPhotoAnalysisTab';

interface MaterialRow { id: string; type: string; quantity: number; unit: string; notes?: string }

interface ScaffoldingJob {
  id?: string;
  project_id: string;
  material_spec: MaterialRow[];
  order_status: 'draft' | 'sent' | 'confirmed';
  order_sent_at?: string | null;
  order_sent_to?: string | null;
  order_confirmed_at?: string | null;
  order_notes?: string | null;
  ai_analysis?: any;
  ai_analyzed_at?: string | null;
  simple_checklist: SimpleChecklistState;
  risk_level: 'green' | 'yellow' | 'red';
  activity_log: Array<{ at: string; user_id?: string; action: string; [k: string]: any }>;
}

interface Props {
  project: Project | null;
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

const emptyJob = (projectId: string): ScaffoldingJob => ({
  project_id: projectId,
  material_spec: [],
  order_status: 'draft',
  ai_analysis: {},
  simple_checklist: {},
  risk_level: 'green',
  activity_log: [],
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
        material_spec: merged.material_spec,
        order_status: merged.order_status,
        order_sent_at: merged.order_sent_at,
        order_sent_to: merged.order_sent_to,
        order_confirmed_at: merged.order_confirmed_at,
        order_notes: merged.order_notes,
        simple_checklist: merged.simple_checklist,
        risk_level: merged.risk_level,
        activity_log: merged.activity_log,
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
    const cur = job.simple_checklist[key]?.checked;
    const next: SimpleChecklistState = {
      ...job.simple_checklist,
      [key]: { checked: !cur, at: new Date().toISOString(), by: user.id },
    };
    const log = [...(job.activity_log || []), { at: new Date().toISOString(), user_id: user.id, action: cur ? 'check_off' : 'check_on', key }];
    await saveJob({ simple_checklist: next, activity_log: log });
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
            <OverallProgress state={job.simple_checklist} />
            <Tabs defaultValue="overview" className="mt-4">
              <TabsList className="grid grid-cols-3 h-auto">
                <TabsTrigger value="overview"><ClipboardList className="w-4 h-4 mr-1" />Översikt</TabsTrigger>
                <TabsTrigger value="ai"><Sparkles className="w-4 h-4 mr-1" />AI-analys</TabsTrigger>
                <TabsTrigger value="material"><Package className="w-4 h-4 mr-1" />Material & beställning</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4 space-y-3">
                <ChecklistCard state={job.simple_checklist} onToggle={toggleCheck} />
                <RiskCard job={job} onSave={(risk_level, log) => saveJob({ risk_level, activity_log: log })} />
              </TabsContent>

              <TabsContent value="ai" className="mt-4">
                <AIPhotoAnalysisTab
                  projectId={project.id}
                  initialAnalysis={job.ai_analysis}
                  analyzedAt={job.ai_analyzed_at}
                  onAnalysisDone={async () => {
                    const { data } = await supabase.from('scaffolding_jobs' as any).select('*').eq('project_id', project.id).maybeSingle();
                    if (data) setJob({ ...emptyJob(project.id), ...(data as any) });
                  }}
                  onApplyAsSpec={(rows) => saveJob({ material_spec: rows })}
                />
              </TabsContent>

              <TabsContent value="material" className="mt-4 space-y-3">
                <MaterialSpecCard job={job} onSave={(material_spec) => saveJob({ material_spec })} />
                <MaterialOrderCard
                  job={job} projectId={project.id}
                  onSent={async () => {
                    const { data } = await supabase.from('scaffolding_jobs' as any).select('*').eq('project_id', project.id).maybeSingle();
                    if (data) setJob({ ...emptyJob(project.id), ...(data as any) });
                  }}
                  onConfirm={() => saveJob({ order_status: 'confirmed', order_confirmed_at: new Date().toISOString() })}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

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

function OverallProgress({ state }: { state: SimpleChecklistState }) {
  const pct = simpleProgress(state);
  return (
    <div className="mt-3 space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Framdrift</span><span>{pct}%</span>
      </div>
      <Progress value={pct} />
    </div>
  );
}

function ChecklistCard({ state, onToggle }: { state: SimpleChecklistState; onToggle: (k: string) => void }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <h3 className="font-semibold">Checklista</h3>
        <div className="space-y-1">
          {SIMPLE_CHECKLIST.map((i) => {
            const c = state[i.key];
            return (
              <label key={i.key} className="flex items-start gap-3 py-2 px-2 cursor-pointer hover:bg-muted/40 rounded">
                <Checkbox checked={!!c?.checked} onCheckedChange={() => onToggle(i.key)} className="mt-0.5" />
                <div className="flex-1">
                  <div className={`text-sm font-medium ${c?.checked ? 'line-through text-muted-foreground' : ''}`}>{i.label}</div>
                  {i.description && <div className="text-xs text-muted-foreground">{i.description}</div>}
                </div>
                {c?.at && <span className="text-xs text-muted-foreground shrink-0">{format(new Date(c.at), 'd MMM HH:mm', { locale: sv })}</span>}
              </label>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function RiskCard({ job, onSave }: { job: ScaffoldingJob; onSave: (level: 'green' | 'yellow' | 'red', log: any[]) => void }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <Label>Risknivå</Label>
        <div className="flex gap-2 flex-wrap">
          {(['green', 'yellow', 'red'] as const).map((lvl) => (
            <Button key={lvl} size="sm" variant={job.risk_level === lvl ? 'default' : 'outline'}
              onClick={() => onSave(lvl, [...(job.activity_log || []), { at: new Date().toISOString(), action: 'risk_set', level: lvl }])}
              className={job.risk_level === lvl ? (lvl === 'red' ? 'bg-destructive' : lvl === 'yellow' ? 'bg-yellow-500' : 'bg-emerald-600') : ''}>
              {lvl === 'green' ? 'Grön (OK)' : lvl === 'yellow' ? 'Gul (Risk)' : 'Röd (Akut)'}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MaterialSpecCard({ job, onSave }: { job: ScaffoldingJob; onSave: (rows: MaterialRow[]) => void }) {
  const [rows, setRows] = useState<MaterialRow[]>(job.material_spec || []);
  useEffect(() => setRows(job.material_spec || []), [job.material_spec]);

  const update = (i: number, patch: Partial<MaterialRow>) =>
    setRows(rows.map((r, ix) => (ix === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => setRows(rows.filter((_, ix) => ix !== i));
  const add = () => setRows([...rows, { id: `row-${Date.now()}`, type: '', quantity: 0, unit: 'st' }]);

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Materialspecifikation</h3>
          <Badge variant="outline">{rows.length} artiklar</Badge>
        </div>
        <p className="text-xs text-muted-foreground">Använd AI-analysen för att fylla i denna automatiskt, eller redigera manuellt.</p>
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center border-2 border-dashed rounded">
            Ingen materialspec än. Använd AI-analys eller lägg till manuellt.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <Input className="col-span-7" placeholder="Artikel" value={r.type} onChange={(e) => update(i, { type: e.target.value })} />
                <Input className="col-span-2" type="number" placeholder="Antal" value={r.quantity || ''} onChange={(e) => update(i, { quantity: Number(e.target.value) || 0 })} />
                <Input className="col-span-2" placeholder="Enhet" value={r.unit} onChange={(e) => update(i, { unit: e.target.value })} />
                <Button variant="ghost" size="icon" className="col-span-1" onClick={() => remove(i)}>×</Button>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-between">
          <Button variant="outline" size="sm" onClick={add}>+ Rad</Button>
          <Button size="sm" onClick={() => onSave(rows)}>Spara spec</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MaterialOrderCard({
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
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Beställning</h3>
          <Badge variant={job.order_status === 'confirmed' ? 'default' : job.order_status === 'sent' ? 'secondary' : 'outline'}>
            {job.order_status === 'confirmed' ? 'Bekräftad' : job.order_status === 'sent' ? 'Skickad' : 'Utkast'}
          </Badge>
          {job.order_sent_at && (
            <span className="text-xs text-muted-foreground">Skickad {format(new Date(job.order_sent_at), 'd MMM HH:mm', { locale: sv })} till {job.order_sent_to}</span>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>Leverantörens e-post</Label><Input type="email" value={supplierEmail} onChange={(e) => setSupplierEmail(e.target.value)} placeholder="order@peri.se" /></div>
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
      </CardContent>
    </Card>
  );
}
