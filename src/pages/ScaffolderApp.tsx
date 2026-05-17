import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { LogOut, MapPin, Briefcase, Loader2, Camera, X, CheckCircle2, Calendar, Truck, Hammer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface ScaffolderJob {
  project_id: string;
  project_name: string;
  address: string | null;
  team_id: string;
  team_name: string;
}

type Step = 'booked' | 'transport' | 'assembled';

interface Confirmation {
  project_id: string;
  booked_at: string | null;
  booked_note: string | null;
  transport_booked_at: string | null;
  transport_booked_note: string | null;
  assembled_at: string | null;
  assembled_note: string | null;
  assembled_photo_url: string | null;
}

const STEP_META: Record<Step, { label: string; icon: typeof Calendar; needsPhoto: boolean }> = {
  booked: { label: 'Ställning bokad', icon: Calendar, needsPhoto: false },
  transport: { label: 'Transport bokad', icon: Truck, needsPhoto: false },
  assembled: { label: 'Ställning uppmonterad', icon: Hammer, needsPhoto: true },
};

const ScaffolderAppInner = () => {
  const { user, signOut } = useAuth();
  const { organizationId } = useOrganization();
  const [jobs, setJobs] = useState<ScaffolderJob[]>([]);
  const [confirmations, setConfirmations] = useState<Record<string, Confirmation>>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);

  // Step dialog
  const [pending, setPending] = useState<{ job: ScaffolderJob; step: Step } | null>(null);
  const [note, setNote] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const onPhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  };

  const closeDialog = () => {
    setPending(null);
    setNote('');
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
  };

  const loadAll = async () => {
    if (!user || !organizationId) return;
    setLoading(true);
    try {
      // Find teams of type Ställningsmontör where user is a member
      const { data: teams, error: teamsErr } = await (supabase as any)
        .from('teams')
        .select('id, name, type, members')
        .eq('organization_id', organizationId)
        .eq('type', 'Ställningsmontör');
      if (teamsErr) throw teamsErr;

      const myTeams = (teams || []).filter((t: any) => {
        const members = Array.isArray(t.members) ? t.members : [];
        return members.some((m: any) => m?.user_id === user.id);
      });

      if (myTeams.length === 0) {
        setJobs([]);
        setConfirmations({});
        return;
      }

      const teamIds = myTeams.map((t: any) => t.id);
      const { data: projects, error: projErr } = await supabase
        .from('projects' as any)
        .select('id, name, address, scaffolding_team_id, status')
        .eq('organization_id', organizationId)
        .in('scaffolding_team_id', teamIds)
        .neq('status', 'completed');
      if (projErr) throw projErr;

      const jobList: ScaffolderJob[] = (projects || []).map((p: any) => {
        const team = myTeams.find((t: any) => t.id === p.scaffolding_team_id)!;
        return {
          project_id: p.id,
          project_name: p.name,
          address: p.address,
          team_id: team.id,
          team_name: team.name,
        };
      });
      setJobs(jobList);

      if (jobList.length > 0) {
        const { data: confs } = await supabase
          .from('scaffolding_confirmations' as any)
          .select('*')
          .in('project_id', jobList.map(j => j.project_id));
        const map: Record<string, Confirmation> = {};
        (confs || []).forEach((c: any) => { map[c.project_id] = c; });
        setConfirmations(map);
      }
    } catch (e: any) {
      toast({ title: 'Kunde inte ladda', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [user, organizationId]);

  const openStep = (job: ScaffolderJob, step: Step) => {
    const existing = confirmations[job.project_id];
    const alreadyDone =
      (step === 'booked' && existing?.booked_at) ||
      (step === 'transport' && existing?.transport_booked_at) ||
      (step === 'assembled' && existing?.assembled_at);
    if (alreadyDone) {
      toast({ title: 'Redan bekräftat', description: 'Kontakta admin för att ångra.' });
      return;
    }
    setPending({ job, step });
    setNote('');
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const submitStep = async () => {
    if (!pending || !user || !organizationId) return;
    const { job, step } = pending;
    const meta = STEP_META[step];
    if (meta.needsPhoto && !photoFile) {
      toast({ title: 'Foto krävs', description: 'Ta ett foto för att verifiera.', variant: 'destructive' });
      return;
    }
    setWorking(job.project_id);
    try {
      let photoUrl: string | undefined;
      if (photoFile) {
        const ext = (photoFile.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${user.id}/scaffolding/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('worker-checkin-photos')
          .upload(path, photoFile, { contentType: photoFile.type || 'image/jpeg', upsert: false });
        if (upErr) throw upErr;
        photoUrl = path;
      }

      const now = new Date().toISOString();
      const existing = confirmations[job.project_id];
      const patch: any = { updated_at: now };
      if (step === 'booked') {
        patch.booked_at = now;
        patch.booked_by = user.id;
        patch.booked_note = note || null;
      } else if (step === 'transport') {
        patch.transport_booked_at = now;
        patch.transport_booked_by = user.id;
        patch.transport_booked_note = note || null;
      } else {
        patch.assembled_at = now;
        patch.assembled_by = user.id;
        patch.assembled_note = note || null;
        patch.assembled_photo_url = photoUrl;
      }

      if (existing) {
        const { error } = await supabase
          .from('scaffolding_confirmations' as any)
          .update(patch)
          .eq('project_id', job.project_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('scaffolding_confirmations' as any)
          .insert({
            project_id: job.project_id,
            organization_id: organizationId,
            ...patch,
          });
        if (error) throw error;
      }

      toast({ title: 'Bekräftat', description: `${meta.label} — ${job.project_name}` });
      closeDialog();
      loadAll();
    } catch (e: any) {
      toast({ title: 'Kunde inte spara', description: e.message, variant: 'destructive' });
    } finally {
      setWorking(null);
    }
  };

  const stepStatus = (job: ScaffolderJob, step: Step) => {
    const c = confirmations[job.project_id];
    if (!c) return null;
    if (step === 'booked') return c.booked_at;
    if (step === 'transport') return c.transport_booked_at;
    return c.assembled_at;
  };

  const totalDone = useMemo(() => {
    let done = 0;
    let total = 0;
    jobs.forEach(j => {
      total += 3;
      const c = confirmations[j.project_id];
      if (c?.booked_at) done++;
      if (c?.transport_booked_at) done++;
      if (c?.assembled_at) done++;
    });
    return { done, total };
  }, [jobs, confirmations]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Ställning-app</h1>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="w-4 h-4" />
        </Button>
      </header>

      {jobs.length > 0 && (
        <div className="mx-4 mt-4 p-3 rounded-lg bg-muted/50 text-sm flex items-center justify-between">
          <span>Mina tilldelade projekt</span>
          <Badge variant="secondary">{totalDone.done}/{totalDone.total} steg klara</Badge>
        </div>
      )}

      <div className="p-4 space-y-3">
        {jobs.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Du är inte tilldelad något ställningsprojekt.
            </CardContent>
          </Card>
        )}

        {jobs.map(job => {
          const c = confirmations[job.project_id];
          const allDone = !!(c?.booked_at && c?.transport_booked_at && c?.assembled_at);
          return (
            <Card key={job.project_id} className={allDone ? 'border-primary/50' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-start justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    {job.project_name}
                  </span>
                  {allDone && <Badge className="bg-primary"><CheckCircle2 className="w-3 h-3 mr-1" />Klar</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {job.address && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{job.address}</span>
                  </div>
                )}

                {(['booked', 'transport', 'assembled'] as Step[]).map(step => {
                  const meta = STEP_META[step];
                  const Icon = meta.icon;
                  const done = stepStatus(job, step);
                  return (
                    <Button
                      key={step}
                      variant={done ? 'secondary' : 'default'}
                      className="w-full justify-between h-auto py-3"
                      disabled={!!done || working === job.project_id}
                      onClick={() => openStep(job, step)}
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {meta.label}
                      </span>
                      {done ? (
                        <span className="text-xs opacity-80 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {format(new Date(done), 'd MMM HH:mm', { locale: sv })}
                        </span>
                      ) : (
                        <span className="text-xs opacity-80">Bekräfta</span>
                      )}
                    </Button>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!pending} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pending ? STEP_META[pending.step].label : ''}
            </DialogTitle>
          </DialogHeader>
          {pending && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Projekt: <span className="font-medium text-foreground">{pending.job.project_name}</span>
              </div>

              {STEP_META[pending.step].needsPhoto && (
                <>
                  <div className="rounded-lg border bg-muted/30 p-2 flex items-center justify-center min-h-[180px]">
                    {photoPreview ? (
                      <div className="relative w-full">
                        <img src={photoPreview} alt="Förhandsvisning" className="w-full max-h-[280px] object-contain rounded" />
                        <Button
                          size="icon"
                          variant="secondary"
                          className="absolute top-2 right-2 h-7 w-7"
                          onClick={() => {
                            setPhotoFile(null);
                            if (photoPreview) URL.revokeObjectURL(photoPreview);
                            setPhotoPreview(null);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground text-sm py-6">
                        Foto krävs för uppmontering
                      </div>
                    )}
                  </div>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={onPhotoSelected}
                  />
                  <Button variant="outline" className="w-full" onClick={() => photoInputRef.current?.click()}>
                    <Camera className="w-4 h-4 mr-2" /> {photoPreview ? 'Ta nytt foto' : 'Ta foto'}
                  </Button>
                </>
              )}

              <Textarea
                placeholder="Anteckning (valfritt) — t.ex. leverantör, datum, övrigt"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={closeDialog} disabled={working === pending?.job.project_id}>
              Avbryt
            </Button>
            <Button onClick={submitStep} disabled={working === pending?.job.project_id}>
              {working === pending?.job.project_id ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Bekräfta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ScaffolderApp = () => (
  <ProtectedRoute>
    <ScaffolderAppInner />
  </ProtectedRoute>
);

export default ScaffolderApp;
