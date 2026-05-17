import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Play, Square, Clock, Wallet, Briefcase, Loader2, Camera, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface AssignedJob {
  project_id: string;
  project_name: string;
  address: string | null;
  team_id: string;
  team_name: string;
  team_member_id: string;
  hourly_rate: number;
}

interface OpenCheckIn {
  id: string;
  project_id: string;
  project_name: string | null;
  check_in_at: string;
  hourly_rate_snapshot: number;
}

interface CheckInHistory {
  id: string;
  project_name: string | null;
  check_in_at: string;
  check_out_at: string | null;
  duration_hours: number | null;
  wage_amount: number | null;
}

const haversine = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const geocode = async (address: string): Promise<{ lat: number; lng: number } | null> => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
    const data = await res.json();
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (e) { console.error(e); }
  return null;
};

export function ScaffolderTimeTracking() {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [jobs, setJobs] = useState<AssignedJob[]>([]);
  const [openCheckIn, setOpenCheckIn] = useState<OpenCheckIn | null>(null);
  const [history, setHistory] = useState<CheckInHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [pendingJob, setPendingJob] = useState<AssignedJob | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!openCheckIn) return;
    const i = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(i);
  }, [openCheckIn]);

  const loadAll = async () => {
    if (!user || !organizationId) return;
    setLoading(true);
    try {
      // teams of type Ställningsmontör where user is member
      const { data: teams } = await (supabase as any)
        .from('teams')
        .select('id, name, type, members')
        .eq('organization_id', organizationId)
        .eq('type', 'Ställningsmontör');

      const myTeams = (teams || [])
        .map((t: any) => {
          const members = Array.isArray(t.members) ? t.members : [];
          const me = members.find((m: any) => m?.user_id === user.id);
          return me ? { team: t, me } : null;
        })
        .filter(Boolean) as { team: any; me: any }[];

      if (myTeams.length > 0) {
        const teamIds = myTeams.map(({ team }) => team.id);
        const { data: projects } = await supabase
          .from('projects' as any)
          .select('id, name, address, scaffolding_team_id, status')
          .eq('organization_id', organizationId)
          .in('scaffolding_team_id', teamIds)
          .neq('status', 'completed')
          .neq('status', 'cancelled');

        const jobList: AssignedJob[] = (projects || []).map((p: any) => {
          const match = myTeams.find(({ team }) => team.id === p.scaffolding_team_id)!;
          return {
            project_id: p.id,
            project_name: p.name,
            address: p.address,
            team_id: match.team.id,
            team_name: match.team.name,
            team_member_id: match.me.id,
            hourly_rate: Number(match.me.hourly_rate || 0),
          };
        });
        setJobs(jobList);
      } else {
        setJobs([]);
      }

      const { data: openRows } = await supabase
        .from('worker_check_ins')
        .select('id, project_id, project_name, check_in_at, hourly_rate_snapshot')
        .eq('user_id', user.id)
        .is('check_out_at', null)
        .order('check_in_at', { ascending: false })
        .limit(1);
      setOpenCheckIn((openRows?.[0] as any) || null);

      const { data: hist } = await supabase
        .from('worker_check_ins')
        .select('id, project_name, check_in_at, check_out_at, duration_hours, wage_amount')
        .eq('user_id', user.id)
        .not('check_out_at', 'is', null)
        .order('check_in_at', { ascending: false })
        .limit(30);
      setHistory((hist as any) || []);
    } catch (e: any) {
      toast({ title: 'Kunde inte ladda', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [user, organizationId]);

  const getPosition = (): Promise<GeolocationPosition> => new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('GPS stöds inte'));
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true, timeout: 15000, maximumAge: 30000,
    });
  });

  const onPhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  };

  const closePhotoDialog = () => {
    setPendingJob(null);
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
  };

  const startCheckInFlow = (job: AssignedJob) => {
    if (openCheckIn) {
      toast({ title: 'Du har en pågående incheckning', description: 'Checka ut först.', variant: 'destructive' });
      return;
    }
    setPendingJob(job);
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const confirmCheckIn = async () => {
    if (!pendingJob || !user || !organizationId) return;
    if (!photoFile) {
      toast({ title: 'Foto krävs', description: 'Ta ett foto för att verifiera incheckningen.', variant: 'destructive' });
      return;
    }
    const job = pendingJob;
    setWorking(job.project_id);
    try {
      const pos = await getPosition();
      let distanceKm: number | null = null;
      if (job.address) {
        const projCoords = await geocode(job.address);
        if (projCoords) {
          distanceKm = haversine(pos.coords.latitude, pos.coords.longitude, projCoords.lat, projCoords.lng);
          if (distanceKm > 1.0) {
            toast({
              title: 'För långt från projektet',
              description: `Du är ${distanceKm.toFixed(2)} km bort. Du måste vara inom 1 km.`,
              variant: 'destructive',
            });
            setWorking(null);
            return;
          }
        }
      }

      const ext = (photoFile.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('worker-checkin-photos')
        .upload(path, photoFile, { contentType: photoFile.type || 'image/jpeg' });
      if (upErr) throw upErr;

      const { data, error } = await supabase.from('worker_check_ins').insert({
        organization_id: organizationId,
        user_id: user.id,
        team_id: job.team_id,
        team_member_id: job.team_member_id,
        project_id: job.project_id,
        project_name: job.project_name,
        check_in_lat: pos.coords.latitude,
        check_in_lng: pos.coords.longitude,
        distance_km: distanceKm,
        hourly_rate_snapshot: job.hourly_rate,
        check_in_photo_url: path,
      }).select().single();

      if (error) throw error;
      toast({ title: 'Incheckad', description: `${job.project_name} — timer igång` });
      setOpenCheckIn(data as any);
      closePhotoDialog();
    } catch (e: any) {
      toast({ title: 'Kunde inte checka in', description: e.message, variant: 'destructive' });
    } finally {
      setWorking(null);
    }
  };

  const handleCheckOut = async () => {
    if (!openCheckIn || !user) return;
    setWorking(openCheckIn.id);
    try {
      const pos = await getPosition();
      const checkInAt = new Date(openCheckIn.check_in_at);
      const now = new Date();
      const duration = (now.getTime() - checkInAt.getTime()) / 3_600_000;
      const wage = Math.round(duration * (openCheckIn.hourly_rate_snapshot || 0) * 100) / 100;

      const { error } = await supabase
        .from('worker_check_ins')
        .update({
          check_out_at: now.toISOString(),
          check_out_lat: pos.coords.latitude,
          check_out_lng: pos.coords.longitude,
          duration_hours: Math.round(duration * 100) / 100,
          wage_amount: wage,
        })
        .eq('id', openCheckIn.id);
      if (error) throw error;

      toast({ title: 'Utcheckad', description: `${duration.toFixed(2)}h — ${wage} kr` });
      setOpenCheckIn(null);
      loadAll();
    } catch (e: any) {
      toast({ title: 'Kunde inte checka ut', description: e.message, variant: 'destructive' });
    } finally {
      setWorking(null);
    }
  };

  const live = useMemo(() => {
    if (!openCheckIn) return null;
    const ms = Date.now() - new Date(openCheckIn.check_in_at).getTime();
    const hours = ms / 3_600_000;
    const wage = hours * (openCheckIn.hourly_rate_snapshot || 0);
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return { label: `${h}t ${m}m`, wage: Math.round(wage) };
    // eslint-disable-next-line
  }, [openCheckIn, tick]);

  const todayTotal = useMemo(() => {
    const today = new Date().toDateString();
    return history
      .filter(h => new Date(h.check_in_at).toDateString() === today)
      .reduce((acc, h) => ({
        hours: acc.hours + (h.duration_hours || 0),
        wage: acc.wage + (h.wage_amount || 0),
      }), { hours: 0, wage: 0 });
  }, [history]);

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      {openCheckIn && live && (
        <Card className="border-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Pågående: {openCheckIn.project_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md bg-muted p-3">
                <div className="text-xs text-muted-foreground">Tid</div>
                <div className="text-lg font-semibold">{live.label}</div>
              </div>
              <div className="rounded-md bg-muted p-3">
                <div className="text-xs text-muted-foreground">Lön (live)</div>
                <div className="text-lg font-semibold">{live.wage} kr</div>
              </div>
            </div>
            <Button onClick={handleCheckOut} disabled={working === openCheckIn.id} variant="destructive" className="w-full">
              {working === openCheckIn.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Square className="w-4 h-4 mr-2" />}
              Checka ut
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="w-4 h-4" /> Idag
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md bg-muted p-3">
            <div className="text-xs text-muted-foreground">Timmar</div>
            <div className="text-lg font-semibold">{todayTotal.hours.toFixed(2)}h</div>
          </div>
          <div className="rounded-md bg-muted p-3">
            <div className="text-xs text-muted-foreground">Lön</div>
            <div className="text-lg font-semibold">{Math.round(todayTotal.wage)} kr</div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wide">Mina projekt</h3>
        {jobs.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-center text-muted-foreground text-sm">Inga aktiva projekt.</CardContent>
          </Card>
        ) : jobs.map(job => (
          <Card key={job.project_id}>
            <CardContent className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium truncate flex items-center gap-1"><Briefcase className="w-4 h-4" />{job.project_name}</div>
                {job.address && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3" />{job.address}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">{job.hourly_rate} kr/h</div>
              </div>
              <Button
                size="sm"
                onClick={() => startCheckInFlow(job)}
                disabled={!!openCheckIn || working === job.project_id}
              >
                <Play className="w-4 h-4 mr-1" /> Checka in
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wide">Historik</h3>
        {history.length === 0 ? (
          <Card><CardContent className="p-4 text-center text-muted-foreground text-sm">Inga incheckningar än.</CardContent></Card>
        ) : history.map(h => (
          <Card key={h.id}>
            <CardContent className="p-3 flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <div className="font-medium truncate">{h.project_name || 'Projekt'}</div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(h.check_in_at), 'd MMM yyyy HH:mm', { locale: sv })}
                  {h.check_out_at && ` → ${format(new Date(h.check_out_at), 'HH:mm', { locale: sv })}`}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-semibold">{h.duration_hours?.toFixed(2)}h</div>
                <Badge variant="secondary">{Math.round(h.wage_amount || 0)} kr</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!pendingJob} onOpenChange={(o) => !o && closePhotoDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Checka in: {pendingJob?.project_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
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
                <span className="text-xs text-muted-foreground py-4">Foto krävs för incheckning</span>
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
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={closePhotoDialog} disabled={!!working}>Avbryt</Button>
            <Button onClick={confirmCheckIn} disabled={!!working}>
              {working ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              Checka in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
