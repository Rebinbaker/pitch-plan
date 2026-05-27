import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Activity, ShieldCheck, CheckCircle, XCircle, Send, Flag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

export const StationaryMonitoringView = () => {
  const { organizationId } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [flags, setFlags] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [mpv, setMpv] = useState<Record<string, any>>({});
  const [comments, setComments] = useState<Record<string, string>>({});

  const load = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const [f, s, m] = await Promise.all([
        (supabase as any).from('stationary_device_flags')
          .select('*').eq('organization_id', organizationId)
          .order('created_at', { ascending: false }).limit(100),
        (supabase as any).from('user_risk_scores')
          .select('user_id, score, last_event_at').eq('organization_id', organizationId)
          .order('score', { ascending: false }).limit(10),
        (supabase as any).from('manual_presence_verifications')
          .select('id, flag_id, status, triggered_at, expires_at, completed_at, failure_reason, distance_from_project_m')
          .eq('organization_id', organizationId)
          .order('triggered_at', { ascending: false }).limit(200),
      ]);
      setFlags(f.data || []);
      setScores(s.data || []);
      const byFlag: Record<string, any> = {};
      for (const v of m.data || []) if (v.flag_id && !byFlag[v.flag_id]) byFlag[v.flag_id] = v;
      setMpv(byFlag);
    } catch (e: any) {
      toast({ title: 'Kunde inte ladda', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); const i = setInterval(load, 30_000); return () => clearInterval(i); /* eslint-disable-next-line */ }, [organizationId]);

  const triggerVerification = async (flag: any) => {
    try {
      const { error } = await supabase.functions.invoke('trigger-manual-verification', { body: { flag_id: flag.id } });
      if (error) throw error;
      toast({ title: 'Verifiering skickad', description: 'Användaren har 5 minuter på sig.' });
      load();
    } catch (e: any) { toast({ title: 'Misslyckades', description: e.message, variant: 'destructive' }); }
  };

  const updateFlag = async (flagId: string, status: 'legitimate' | 'ignored' | 'escalated') => {
    try {
      const { error } = await supabase.functions.invoke('update-flag-status', {
        body: { flag_id: flagId, status, comment: comments[flagId] ?? null },
      });
      if (error) throw error;
      toast({ title: 'Flagga uppdaterad' });
      load();
    } catch (e: any) { toast({ title: 'Misslyckades', description: e.message, variant: 'destructive' }); }
  };

  if (loading) {
    return <Card><CardContent className="p-6 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5" /> Stationary Device Monitoring</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {scores.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2">Topp risk score</div>
            <div className="flex flex-wrap gap-2">
              {scores.map((s) => (
                <Badge key={s.user_id} variant={s.score >= 30 ? 'destructive' : 'secondary'}>
                  {s.user_id.slice(0, 8)}… · {s.score}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {flags.length === 0 && (
          <div className="text-sm text-muted-foreground p-4 text-center">Inga stationary-flaggor.</div>
        )}

        {flags.map((f) => {
          const v = mpv[f.id];
          return (
            <div key={f.id} className="p-3 border rounded-lg space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant={f.risk_level === 'high' ? 'destructive' : 'secondary'}>{f.risk_level.toUpperCase()}</Badge>
                  <Badge variant="outline">{f.status}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(f.started_at), 'd MMM HH:mm', { locale: sv })}
                  </span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-1">
                <div>Användare: {f.user_id.slice(0, 8)}…</div>
                <div>Rörelse: {Math.round(f.total_movement_m)} m</div>
                <div>Duration: {Math.round(f.duration_minutes)} min</div>
                <div>Accel: {f.accelerometer_activity}</div>
                <div>GPS-varians: {Math.round(f.gps_variance_m)} m</div>
                <div>Accuracy: {Math.round(f.avg_accuracy_m)} m</div>
              </div>

              {v && (
                <div className="text-xs flex items-center gap-2 p-2 bg-muted/40 rounded">
                  {v.status === 'passed' && <CheckCircle className="w-3 h-3 text-green-600" />}
                  {(v.status === 'failed' || v.status === 'missed') && <XCircle className="w-3 h-3 text-destructive" />}
                  <span>Verifiering: <strong>{v.status}</strong></span>
                  {v.failure_reason && <span className="text-destructive">· {v.failure_reason}</span>}
                </div>
              )}

              {f.status === 'open' && (
                <>
                  <Textarea
                    placeholder="Kommentar (valfritt)…"
                    className="text-xs"
                    rows={2}
                    value={comments[f.id] ?? ''}
                    onChange={(e) => setComments(c => ({ ...c, [f.id]: e.target.value }))}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => triggerVerification(f)}>
                      <Send className="w-3 h-3 mr-1" /> Skicka verifiering
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateFlag(f.id, 'legitimate')}>
                      <ShieldCheck className="w-3 h-3 mr-1" /> Legitim
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateFlag(f.id, 'ignored')}>
                      Ignorera
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => updateFlag(f.id, 'escalated')}>
                      <Flag className="w-3 h-3 mr-1" /> Eskalera
                    </Button>
                  </div>
                </>
              )}
              {f.admin_comment && (
                <div className="text-xs italic text-muted-foreground">"{f.admin_comment}"</div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
