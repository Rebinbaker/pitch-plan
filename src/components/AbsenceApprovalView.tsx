import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, XCircle, Clock, MapPin, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

interface AbsenceRow {
  id: string;
  check_in_id: string;
  user_id: string;
  left_at: string;
  returned_at: string | null;
  duration_minutes: number | null;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  project_name?: string | null;
  worker_name?: string;
}

const AbsenceApprovalView = () => {
  const { organizationId } = useOrganization();
  const { user } = useAuth();
  const [rows, setRows] = useState<AbsenceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [memberLookup, setMemberLookup] = useState<Record<string, string>>({});

  const load = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const [{ data: absences, error }, { data: teams }, { data: checkIns }] = await Promise.all([
        supabase
          .from('worker_absence_periods')
          .select('*')
          .eq('organization_id', organizationId)
          .order('left_at', { ascending: false })
          .limit(200),
        supabase.from('teams').select('members').eq('organization_id', organizationId),
        supabase.from('worker_check_ins').select('id, project_name').eq('organization_id', organizationId),
      ]);
      if (error) throw error;

      const lookup: Record<string, string> = {};
      (teams || []).forEach((t: any) => {
        const members = Array.isArray(t.members) ? t.members : [];
        members.forEach((m: any) => {
          if (m?.user_id) lookup[m.user_id] = m.name || m.user_id;
        });
      });
      setMemberLookup(lookup);

      const ciMap = new Map<string, string | null>();
      (checkIns || []).forEach((c: any) => ciMap.set(c.id, c.project_name));

      setRows(
        (absences || []).map((a: any) => ({
          ...a,
          worker_name: lookup[a.user_id] || 'Okänd',
          project_name: ciMap.get(a.check_in_id) || null,
        })),
      );
    } catch (e: any) {
      toast({ title: 'Kunde inte ladda', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [organizationId]);

  const review = async (id: string, status: 'approved' | 'rejected') => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('worker_absence_periods')
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;

      // Recompute net_hours on the related check_in if it's closed
      const row = rows.find(r => r.id === id);
      if (row) {
        const { data: ci } = await supabase
          .from('worker_check_ins')
          .select('id, gross_hours, hourly_rate_snapshot, check_out_at')
          .eq('id', row.check_in_id)
          .maybeSingle();
        if (ci?.check_out_at && ci?.gross_hours != null) {
          const { data: allAbs } = await supabase
            .from('worker_absence_periods')
            .select('duration_minutes, status')
            .eq('check_in_id', row.check_in_id);
          let minutes = 0;
          (allAbs || []).forEach((a: any) => {
            if (a.status !== 'approved' && a.duration_minutes != null) minutes += Number(a.duration_minutes);
          });
          const net = Math.max(0, Number(ci.gross_hours) - minutes / 60);
          const wage = Math.round(net * Number(ci.hourly_rate_snapshot || 0) * 100) / 100;
          await supabase.from('worker_check_ins').update({
            absence_minutes: Math.round(minutes),
            net_hours: Math.round(net * 100) / 100,
            duration_hours: Math.round(net * 100) / 100,
            wage_amount: wage,
          }).eq('id', row.check_in_id);
        }
      }

      toast({ title: status === 'approved' ? 'Godkänd' : 'Avvisad' });
      load();
    } catch (e: any) {
      toast({ title: 'Kunde inte uppdatera', description: e.message, variant: 'destructive' });
    }
  };

  const filtered = useMemo(
    () => filter === 'all' ? rows : rows.filter(r => r.status === filter),
    [rows, filter],
  );

  const pendingCount = rows.filter(r => r.status === 'pending').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          Frånvaroperioder
          {pendingCount > 0 && <Badge variant="destructive">{pendingCount} att granska</Badge>}
        </CardTitle>
        <CardDescription>
          Tid utanför arbetsplatsen dras av från lönen som standard. Godkänn för att återföra tiden.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
            <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}>
              {f === 'pending' ? 'Väntar' : f === 'approved' ? 'Godkända' : f === 'rejected' ? 'Avvisade' : 'Alla'}
            </Button>
          ))}
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Byggare</TableHead>
                <TableHead>Projekt</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Min</TableHead>
                <TableHead>Motivering</TableHead>
                <TableHead className="text-right">Åtgärd</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-6">Laddar…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Inga frånvaroperioder</TableCell></TableRow>
              ) : filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{format(new Date(r.left_at), 'd MMM', { locale: sv })}</TableCell>
                  <TableCell className="font-medium">{r.worker_name}</TableCell>
                  <TableCell className="text-xs"><MapPin className="w-3 h-3 inline mr-1" />{r.project_name || '—'}</TableCell>
                  <TableCell className="text-xs">
                    {format(new Date(r.left_at), 'HH:mm', { locale: sv })}
                    {' – '}
                    {r.returned_at ? format(new Date(r.returned_at), 'HH:mm', { locale: sv }) : 'pågår'}
                  </TableCell>
                  <TableCell className="text-right">{r.duration_minutes ?? '—'}</TableCell>
                  <TableCell className="text-xs max-w-xs truncate" title={r.reason || ''}>
                    {r.reason || <span className="text-muted-foreground italic">Ingen motivering</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === 'pending' ? (
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="default" onClick={() => review(r.id, 'approved')}>
                          <CheckCircle2 className="w-3 h-3 mr-1" />Godkänn
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => review(r.id, 'rejected')}>
                          <XCircle className="w-3 h-3 mr-1" />Avvisa
                        </Button>
                      </div>
                    ) : r.status === 'approved' ? (
                      <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Godkänd</Badge>
                    ) : (
                      <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Avvisad</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AbsenceApprovalView;
