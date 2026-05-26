import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ShieldAlert, Smartphone, Clock, Camera, CheckCircle, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

export const SecurityAnomaliesView = () => {
  const { organizationId } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [autoCheckouts, setAutoCheckouts] = useState<any[]>([]);
  const [rpvFailed, setRpvFailed] = useState<any[]>([]);
  const [pendingDevices, setPendingDevices] = useState<any[]>([]);
  const [approvedDevices, setApprovedDevices] = useState<any[]>([]);

  const load = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const [ac, rpv, devices] = await Promise.all([
        (supabase as any)
          .from('worker_check_ins')
          .select('id, user_id, project_name, check_in_at, check_out_at, auto_checkout_triggered_at, checkout_reason, duration_hours')
          .eq('organization_id', organizationId)
          .not('auto_checkout_triggered_at', 'is', null)
          .order('auto_checkout_triggered_at', { ascending: false })
          .limit(50),
        (supabase as any)
          .from('random_presence_verifications')
          .select('id, user_id, project_id, triggered_at, expires_at, status, failure_reason, distance_from_project_m')
          .eq('organization_id', organizationId)
          .in('status', ['missed', 'failed'])
          .order('triggered_at', { ascending: false })
          .limit(50),
        (supabase as any)
          .from('user_devices')
          .select('id, user_id, device_id, device_name, platform, app_version, status, registered_at, last_seen_at')
          .eq('organization_id', organizationId)
          .in('status', ['pending', 'approved', 'revoked'])
          .order('registered_at', { ascending: false })
          .limit(100),
      ]);

      setAutoCheckouts(ac.data || []);
      setRpvFailed(rpv.data || []);
      const all = devices.data || [];
      setPendingDevices(all.filter((d: any) => d.status === 'pending'));
      setApprovedDevices(all.filter((d: any) => d.status !== 'pending'));
    } catch (e: any) {
      toast({ title: 'Kunde inte ladda', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [organizationId]);

  const approveDevice = async (userId: string, deviceId: string) => {
    try {
      const { error } = await supabase.functions.invoke('approve-device', {
        body: { user_id: userId, device_id: deviceId },
      });
      if (error) throw error;
      toast({ title: 'Enhet godkänd' });
      load();
    } catch (e: any) {
      toast({ title: 'Misslyckades', description: e.message, variant: 'destructive' });
    }
  };

  const reopenCheckIn = async (checkInId: string) => {
    try {
      const { error } = await supabase.functions.invoke('reopen-check-in', {
        body: { check_in_id: checkInId },
      });
      if (error) throw error;
      toast({ title: 'Pass öppnat igen' });
      load();
    } catch (e: any) {
      toast({ title: 'Misslyckades', description: e.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <Card><CardContent className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </CardContent></Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5" /> Säkerhetsavvikelser
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="devices">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="devices">
              Enheter {pendingDevices.length > 0 && <Badge variant="destructive" className="ml-2">{pendingDevices.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="auto">
              Auto-utcheckningar {autoCheckouts.length > 0 && <Badge variant="secondary" className="ml-2">{autoCheckouts.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="rpv">
              Missade kontroller {rpvFailed.length > 0 && <Badge variant="secondary" className="ml-2">{rpvFailed.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="devices" className="space-y-3 mt-4">
            {pendingDevices.length === 0 && approvedDevices.length === 0 && (
              <div className="text-sm text-muted-foreground p-4 text-center">Inga registrerade enheter.</div>
            )}
            {pendingDevices.map((d) => (
              <div key={d.id} className="flex items-start justify-between gap-3 p-3 border-2 border-amber-500/60 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                <div className="flex items-start gap-3 min-w-0">
                  <Smartphone className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{d.device_name || d.platform}</div>
                    <div className="text-xs text-muted-foreground">
                      Användare: {d.user_id.slice(0, 8)}… • {d.platform} {d.app_version || ''}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Registrerad {format(new Date(d.registered_at), 'd MMM HH:mm', { locale: sv })}
                    </div>
                  </div>
                </div>
                <Button size="sm" onClick={() => approveDevice(d.user_id, d.device_id)}>
                  <CheckCircle className="w-4 h-4 mr-1" /> Godkänn
                </Button>
              </div>
            ))}
            {approvedDevices.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <Smartphone className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm truncate">{d.device_name || d.platform}</div>
                    <div className="text-xs text-muted-foreground">{d.user_id.slice(0, 8)}… • {d.status}</div>
                  </div>
                </div>
                <Badge variant={d.status === 'approved' ? 'secondary' : 'destructive'}>{d.status}</Badge>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="auto" className="space-y-3 mt-4">
            {autoCheckouts.length === 0 && (
              <div className="text-sm text-muted-foreground p-4 text-center">Inga auto-utcheckningar.</div>
            )}
            {autoCheckouts.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-3 p-3 border rounded-lg">
                <div className="flex items-start gap-3 min-w-0">
                  <Clock className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{c.project_name || 'Projekt'}</div>
                    <div className="text-xs text-muted-foreground">Användare: {c.user_id.slice(0, 8)}…</div>
                    <div className="text-xs text-muted-foreground">
                      In {format(new Date(c.check_in_at), 'd MMM HH:mm', { locale: sv })}
                      {c.check_out_at && ` • Ut ${format(new Date(c.check_out_at), 'HH:mm', { locale: sv })}`}
                      {' '}• {c.duration_hours ?? 0}h
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => reopenCheckIn(c.id)}>
                  <RotateCcw className="w-4 h-4 mr-1" /> Öppna igen
                </Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="rpv" className="space-y-3 mt-4">
            {rpvFailed.length === 0 && (
              <div className="text-sm text-muted-foreground p-4 text-center">Inga missade kontroller.</div>
            )}
            {rpvFailed.map((r) => (
              <div key={r.id} className="flex items-start gap-3 p-3 border rounded-lg">
                <Camera className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">{r.status}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(r.triggered_at), 'd MMM HH:mm', { locale: sv })}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Användare: {r.user_id.slice(0, 8)}…</div>
                  {r.failure_reason && <div className="text-xs text-destructive mt-1">{r.failure_reason}</div>}
                  {r.distance_from_project_m != null && (
                    <div className="text-xs text-muted-foreground">Avstånd: {Math.round(r.distance_from_project_m)} m</div>
                  )}
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
