import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, MapPin, Play, Square, Clock, Wallet, Briefcase, Loader2, Camera, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useGeofenceTracker, formatAwayTimer } from '@/hooks/useGeofenceTracker';
import { WorkerAbsenceList } from '@/components/WorkerAbsenceList';
import { AlertTriangle } from 'lucide-react';
import { BackButton } from '@/components/BackButton';
import { useDeviceBinding } from '@/hooks/useDeviceBinding';
import { DeviceBindingGate } from '@/components/DeviceBindingGate';
import { RandomVerificationPrompt } from '@/components/RandomVerificationPrompt';
import { ManualVerificationPrompt } from '@/components/ManualVerificationPrompt';

interface AssignedJob {
  project_id: string;
  project_name: string;
  address: string | null;
  team_id: string;
  team_name: string;
  team_member_id: string;
  hourly_rate: number;
  overtime_hourly_rate: number;
  leader?: string;
}

interface OpenCheckIn {
  id: string;
  project_id: string;
  project_name: string | null;
  check_in_at: string;
  hourly_rate_snapshot: number;
  overtime_hourly_rate_snapshot: number | null;
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

const WorkerAppInner = () => {
  const { user, signOut } = useAuth();
  const { organizationId } = useOrganization();
  const [jobs, setJobs] = useState<AssignedJob[]>([]);
  const [redirectToScaffolder, setRedirectToScaffolder] = useState(false);
  const [openCheckIn, setOpenCheckIn] = useState<OpenCheckIn | null>(null);
  const [history, setHistory] = useState<CheckInHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [pendingJob, setPendingJob] = useState<AssignedJob | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

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

  // live timer
  useEffect(() => {
    if (!openCheckIn) return;
    const i = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(i);
  }, [openCheckIn]);

  // GPS geofence tracker (continuous pings while checked in)
  const geofence = useGeofenceTracker(openCheckIn?.id || null);
  const deviceBinding = useDeviceBinding();

  // Random presence verification polling
  const [pendingVerification, setPendingVerification] = useState<{ id: string; triggered_at: string; expires_at: string } | null>(null);

  useEffect(() => {
    if (!openCheckIn || !user) {
      setPendingVerification(null);
      return;
    }
    const poll = async () => {
      try {
        await supabase.functions.invoke('schedule-random-verification', {
          body: { check_in_id: openCheckIn.id },
        });
      } catch (e) { /* ignore */ }
      const { data } = await (supabase as any)
        .from('random_presence_verifications')
        .select('id, triggered_at, expires_at, status')
        .eq('check_in_id', openCheckIn.id)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('triggered_at', { ascending: false })
        .limit(1);
      const row = data?.[0];
      setPendingVerification(row ? { id: row.id, triggered_at: row.triggered_at, expires_at: row.expires_at } : null);
    };
    poll();
    const i = setInterval(poll, 60_000);
    return () => clearInterval(i);
  }, [openCheckIn?.id, user?.id]);

  const loadAll = async () => {
    if (!user || !organizationId) return;
    setLoading(true);
    try {
      // find teams where this user is a member
      const { data: teams, error: teamsErr } = await (supabase as any)
        .from('teams')
        .select('id, name, type, members, leader, organization_id')
        .eq('organization_id', organizationId);
      if (teamsErr) throw teamsErr;

      const myAllTeams = (teams || []).filter((t: any) => {
        const members = Array.isArray(t.members) ? t.members : [];
        return members.some((m: any) => m?.user_id === user.id);
      });
      // If user is ONLY in scaffolding teams, redirect to scaffolder app
      if (myAllTeams.length > 0 && myAllTeams.every((t: any) => t.type === 'Ställningsmontör')) {
        setRedirectToScaffolder(true);
        return;
      }

      const myTeams = (teams || []).map(t => {
        const members = Array.isArray(t.members) ? (t.members as any[]) : [];
        const me = members.find(m => m?.user_id === user.id);
        return me ? { team: t, me } : null;
      }).filter(Boolean) as { team: any; me: any }[];

      if (myTeams.length === 0) {
        setJobs([]);
      } else {
        const teamNames = myTeams.map(({ team }) => team.name);
        const { data: projects, error: projErr } = await supabase
          .from('projects')
          .select('id, name, address, construction_team, status')
          .eq('organization_id', organizationId)
          .in('construction_team', teamNames)
          .neq('status', 'completed')
          .neq('status', 'cancelled');
        if (projErr) throw projErr;

        const jobList: AssignedJob[] = (projects || []).map(p => {
          const match = myTeams.find(({ team }) => team.name === p.construction_team)!;
          return {
            project_id: p.id,
            project_name: p.name,
            address: p.address,
            team_id: match.team.id,
            team_name: match.team.name,
            team_member_id: match.me.id,
            hourly_rate: Number(match.me.hourly_rate || 0),
            overtime_hourly_rate: Number(match.me.overtime_hourly_rate ?? match.me.hourly_rate ?? 0),
            leader: match.team.leader,
          };
        });
        setJobs(jobList);
      }

      // open check-in
      const { data: openRows } = await supabase
        .from('worker_check_ins')
        .select('id, project_id, project_name, check_in_at, hourly_rate_snapshot, overtime_hourly_rate_snapshot')
        .eq('user_id', user.id)
        .is('check_out_at', null)
        .order('check_in_at', { ascending: false })
        .limit(1);
      setOpenCheckIn(openRows?.[0] as any || null);

      // history (last 30)
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

  const startCheckInFlow = (job: AssignedJob) => {
    if (openCheckIn) {
      toast({ title: 'Du har en pågående incheckning', description: 'Checka ut först.', variant: 'destructive' });
      return;
    }
    if (deviceBinding.status !== 'approved') {
      toast({ title: 'Enheten är inte godkänd', description: 'Din chef måste godkänna enheten innan du kan checka in.', variant: 'destructive' });
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

      // Upload photo
      const ext = (photoFile.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('worker-checkin-photos')
        .upload(path, photoFile, { contentType: photoFile.type || 'image/jpeg', upsert: false });
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
        overtime_hourly_rate_snapshot: job.overtime_hourly_rate || job.hourly_rate,
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
      const grossHours = (now.getTime() - checkInAt.getTime()) / 3_600_000;

      // Compute absence: sum of minutes from non-approved periods (default = deducted)
      const { data: absences } = await supabase
        .from('worker_absence_periods')
        .select('left_at, returned_at, duration_minutes, status')
        .eq('check_in_id', openCheckIn.id);

      let absenceMinutes = 0;
      (absences || []).forEach((a: any) => {
        if (a.status === 'approved') return;
        if (a.duration_minutes != null) {
          absenceMinutes += Number(a.duration_minutes);
        } else if (a.left_at && !a.returned_at) {
          // still open at checkout — count until now
          absenceMinutes += Math.max(0, (now.getTime() - new Date(a.left_at).getTime()) / 60000);
        }
      });

      const netHours = Math.max(0, grossHours - absenceMinutes / 60);
      const regularRate = Number(openCheckIn.hourly_rate_snapshot || 0);
      const overtimeRate = Number(openCheckIn.overtime_hourly_rate_snapshot ?? regularRate);
      const regularHours = Math.min(netHours, 8);
      const overtimeHours = Math.max(0, netHours - 8);
      const regularPay = Math.round(regularHours * regularRate * 100) / 100;
      const overtimePay = Math.round(overtimeHours * overtimeRate * 100) / 100;
      const wage = Math.round((regularPay + overtimePay) * 100) / 100;

      // close any open absence
      await supabase
        .from('worker_absence_periods')
        .update({ returned_at: now.toISOString() })
        .eq('check_in_id', openCheckIn.id)
        .is('returned_at', null);

      const { error } = await supabase
        .from('worker_check_ins')
        .update({
          check_out_at: now.toISOString(),
          check_out_lat: pos.coords.latitude,
          check_out_lng: pos.coords.longitude,
          duration_hours: Math.round(netHours * 100) / 100,
          gross_hours: Math.round(grossHours * 100) / 100,
          absence_minutes: Math.round(absenceMinutes),
          net_hours: Math.round(netHours * 100) / 100,
          regular_hours: Math.round(regularHours * 100) / 100,
          overtime_hours: Math.round(overtimeHours * 100) / 100,
          regular_pay: regularPay,
          overtime_pay: overtimePay,
          wage_amount: wage,
        })
        .eq('id', openCheckIn.id);
      if (error) throw error;

      toast({
        title: 'Utcheckad',
        description: `Brutto ${grossHours.toFixed(2)}h – Avdrag ${Math.round(absenceMinutes)} min = ${netHours.toFixed(2)}h • ${wage} kr`,
      });
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
    const sum = history
      .filter(h => new Date(h.check_in_at).toDateString() === today)
      .reduce((acc, h) => ({
        hours: acc.hours + (h.duration_hours || 0),
        wage: acc.wage + (h.wage_amount || 0),
      }), { hours: 0, wage: 0 });
    return sum;
  }, [history]);

  if (redirectToScaffolder) {
    return <Navigate to="/scaffolder" replace />;
  }

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
        <div className="flex items-center gap-2">
          <BackButton to="/" label="" />
          <div>
            <h1 className="text-lg font-bold">Bygg-app</h1>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="w-4 h-4" />
        </Button>
      </header>

      {!Capacitor.isNativePlatform() && (
        <Link to="/download" className="block mx-4 mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/40 hover:bg-amber-500/20 transition">
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Ladda ner appen för bakgrunds-GPS</div>
              <div className="text-xs text-muted-foreground">I webbläsaren stoppas GPS när du stänger fliken. Tryck här →</div>
            </div>
          </div>
        </Link>
      )}

      <DeviceBindingGate binding={deviceBinding} />




      {openCheckIn && live && (
        <div className="mx-4 mt-4 p-4 rounded-lg bg-primary text-primary-foreground shadow-lg">
          <div className="text-xs opacity-80">Pågående pass</div>
          <div className="text-lg font-bold truncate">{openCheckIn.project_name}</div>
          <div className="flex items-center justify-between mt-3">
            <div>
              <div className="text-3xl font-mono font-bold">{live.label}</div>
              <div className="text-sm opacity-90 flex items-center gap-1 mt-1">
                <Wallet className="w-3 h-3" /> {live.wage} kr intjänat
              </div>
            </div>
            <Button
              size="lg"
              variant="secondary"
              onClick={handleCheckOut}
              disabled={working === openCheckIn.id}
            >
              {working === openCheckIn.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Square className="w-5 h-5 mr-2" />}
              Checka ut
            </Button>
          </div>
        </div>
      )}

      {openCheckIn && !geofence.insideRadius && (
        <div className="mx-4 mt-3 p-4 rounded-lg bg-destructive text-destructive-foreground shadow-lg animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <div className="font-bold">Utanför arbetsplatsen</div>
          </div>
          <div className="text-3xl font-mono font-bold mt-2">
            {formatAwayTimer(geofence.currentAwaySeconds)}
          </div>
          <div className="text-xs opacity-90 mt-1">
            {geofence.distanceM != null && `${Math.round(geofence.distanceM)} m från arbetsplatsen (radie ${geofence.radiusM} m). `}
            Denna tid dras av från din lön om chefen inte godkänner.
          </div>
        </div>
      )}

      {openCheckIn && geofence.insideRadius && geofence.distanceM != null && (
        <div className="mx-4 mt-3 px-3 py-2 rounded text-xs bg-green-50 text-green-700 border border-green-200 flex items-center gap-2">
          <MapPin className="w-3 h-3" />
          På arbetsplatsen ({Math.round(geofence.distanceM)} m, radie {geofence.radiusM} m)
        </div>
      )}

      {openCheckIn && geofence.absences.length > 0 && (
        <div className="mx-4 mt-3">
          <WorkerAbsenceList absences={geofence.absences} onUpdated={geofence.refresh} />
        </div>
      )}


      <div className="p-4">
        <Tabs defaultValue="jobs">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="jobs">Mina jobb</TabsTrigger>
            <TabsTrigger value="history">Historik</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="space-y-3 mt-4">
            {jobs.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  Du är inte tilldelad något aktivt projekt.
                </CardContent>
              </Card>
            )}
            {jobs.map(job => (
              <Card key={job.project_id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-start justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      {job.project_name}
                    </span>
                    <Badge variant="secondary">{job.team_name}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {job.address && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{job.address}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Wallet className="w-4 h-4" />
                    <span>{job.hourly_rate ? `${job.hourly_rate} kr/h` : 'Timlön ej satt'}</span>
                  </div>
                  <Button
                    className="w-full mt-2"
                    size="lg"
                    disabled={!!openCheckIn || working === job.project_id || !job.hourly_rate}
                    onClick={() => startCheckInFlow(job)}
                  >
                    {working === job.project_id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <><Play className="w-5 h-5 mr-2" /> Checka in</>
                    )}
                  </Button>
                  {!job.hourly_rate && (
                    <p className="text-xs text-destructive">Be admin sätta din timlön innan du kan checka in.</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="history" className="space-y-3 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Idag
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between">
                  <div>
                    <div className="text-2xl font-bold">{todayTotal.hours.toFixed(1)}h</div>
                    <div className="text-xs text-muted-foreground">Arbetad tid</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{Math.round(todayTotal.wage)} kr</div>
                    <div className="text-xs text-muted-foreground">Intjänat</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {history.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-muted-foreground">Inga avslutade pass än.</CardContent></Card>
            ) : (
              history.map(h => (
                <Card key={h.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-sm">{h.project_name || 'Projekt'}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(h.check_in_at), 'EEE d MMM, HH:mm', { locale: sv })}
                          {h.check_out_at && ` – ${format(new Date(h.check_out_at), 'HH:mm', { locale: sv })}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{(h.duration_hours || 0).toFixed(2)}h</div>
                        <div className="text-xs text-muted-foreground">{Math.round(h.wage_amount || 0)} kr</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!pendingJob} onOpenChange={(o) => !o && closePhotoDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Verifiera incheckning med foto</DialogTitle>
          </DialogHeader>
          {pendingJob && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Ta ett foto från arbetsplatsen — t.ex. taket, ställningen eller skylten. Detta sparas som verifikation.
              </div>
              <div className="rounded-lg border bg-muted/30 p-2 flex items-center justify-center min-h-[200px]">
                {photoPreview ? (
                  <div className="relative w-full">
                    <img src={photoPreview} alt="Förhandsvisning" className="w-full max-h-[300px] object-contain rounded" />
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute top-2 right-2 h-7 w-7"
                      onClick={() => { setPhotoFile(null); if (photoPreview) URL.revokeObjectURL(photoPreview); setPhotoPreview(null); }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    Inget foto valt än
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
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={closePhotoDialog} disabled={working === pendingJob?.project_id}>
              Avbryt
            </Button>
            <Button
              onClick={confirmCheckIn}
              disabled={!photoFile || working === pendingJob?.project_id}
            >
              {working === pendingJob?.project_id ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Bekräfta incheckning
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RandomVerificationPrompt
        pending={pendingVerification}
        deviceId={deviceBinding.deviceId}
        onComplete={() => setPendingVerification(null)}
      />

      <ManualVerificationPrompt
        pending={geofence.pendingManualVerification}
        deviceId={deviceBinding.deviceId}
        onComplete={geofence.clearPendingManualVerification}
      />
    </div>
  );
};

const WorkerApp = () => (
  <ProtectedRoute>
    <WorkerAppInner />
  </ProtectedRoute>
);

export default WorkerApp;
