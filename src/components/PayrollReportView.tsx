import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Wallet, Clock, Users, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';

type Period = 'today' | 'week' | 'month' | 'custom';

interface CheckInRow {
  id: string;
  user_id: string;
  team_member_id: string | null;
  project_name: string | null;
  check_in_at: string;
  check_out_at: string | null;
  duration_hours: number | null;
  gross_hours: number | null;
  absence_minutes: number | null;
  net_hours: number | null;
  regular_hours: number | null;
  overtime_hours: number | null;
  regular_pay: number | null;
  overtime_pay: number | null;
  wage_amount: number | null;
  hourly_rate_snapshot: number;
  overtime_hourly_rate_snapshot: number | null;
}

interface WorkerSummary {
  user_id: string;
  name: string;
  team_name: string | null;
  hours: number;
  regular_hours: number;
  overtime_hours: number;
  regular_pay: number;
  overtime_pay: number;
  absence_min: number;
  wage: number;
  sessions: number;
  hourly_rate: number;
  overtime_rate: number;
}

const PayrollReportView = () => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const [period, setPeriod] = useState<Period>('week');
  const [from, setFrom] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [rows, setRows] = useState<CheckInRow[]>([]);
  const [memberLookup, setMemberLookup] = useState<Record<string, { name: string; team: string }>>({});
  const [loading, setLoading] = useState(false);

  const applyPeriod = (p: Period) => {
    setPeriod(p);
    const now = new Date();
    if (p === 'today') {
      setFrom(format(startOfDay(now), 'yyyy-MM-dd'));
      setTo(format(endOfDay(now), 'yyyy-MM-dd'));
    } else if (p === 'week') {
      setFrom(format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
      setTo(format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
    } else if (p === 'month') {
      setFrom(format(startOfMonth(now), 'yyyy-MM-dd'));
      setTo(format(endOfMonth(now), 'yyyy-MM-dd'));
    }
  };

  const load = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const fromIso = new Date(from + 'T00:00:00').toISOString();
      const toIso = new Date(to + 'T23:59:59').toISOString();

      const [{ data: checkIns, error: e1 }, { data: teams, error: e2 }] = await Promise.all([
        supabase
          .from('worker_check_ins')
          .select('id, user_id, team_member_id, project_name, check_in_at, check_out_at, duration_hours, gross_hours, absence_minutes, net_hours, regular_hours, overtime_hours, regular_pay, overtime_pay, wage_amount, hourly_rate_snapshot, overtime_hourly_rate_snapshot')
          .eq('organization_id', organizationId)
          .gte('check_in_at', fromIso)
          .lte('check_in_at', toIso)
          .order('check_in_at', { ascending: false }),
        supabase.from('teams').select('name, members').eq('organization_id', organizationId),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;

      const lookup: Record<string, { name: string; team: string }> = {};
      (teams || []).forEach((t: any) => {
        const members = Array.isArray(t.members) ? t.members : [];
        members.forEach((m: any) => {
          if (m?.user_id) lookup[m.user_id] = { name: m.name || m.user_id, team: t.name };
        });
      });
      setMemberLookup(lookup);
      setRows((checkIns || []) as any);
    } catch (e: any) {
      toast({ title: 'Kunde inte ladda lönedata', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [organizationId, from, to]);

  const summaries: WorkerSummary[] = useMemo(() => {
    const map = new Map<string, WorkerSummary>();
    rows.forEach(r => {
      const info = memberLookup[r.user_id];
      const key = r.user_id;
      const existing: WorkerSummary = map.get(key) || {
        user_id: r.user_id,
        name: info?.name || 'Okänd byggare',
        team_name: info?.team || null,
        hours: 0,
        regular_hours: 0,
        overtime_hours: 0,
        regular_pay: 0,
        overtime_pay: 0,
        absence_min: 0,
        wage: 0,
        sessions: 0,
        hourly_rate: r.hourly_rate_snapshot,
        overtime_rate: Number(r.overtime_hourly_rate_snapshot ?? r.hourly_rate_snapshot),
      };
      const netHrs = Number(r.net_hours ?? r.duration_hours ?? 0);
      // Backfill split for rows saved before the feature
      const regH = r.regular_hours != null ? Number(r.regular_hours) : Math.min(netHrs, 8);
      const otH = r.overtime_hours != null ? Number(r.overtime_hours) : Math.max(0, netHrs - 8);
      const regP = r.regular_pay != null ? Number(r.regular_pay)
        : Math.round(regH * Number(r.hourly_rate_snapshot || 0) * 100) / 100;
      const otRate = Number(r.overtime_hourly_rate_snapshot ?? r.hourly_rate_snapshot ?? 0);
      const otP = r.overtime_pay != null ? Number(r.overtime_pay)
        : Math.round(otH * otRate * 100) / 100;
      existing.hours += netHrs;
      existing.regular_hours += regH;
      existing.overtime_hours += otH;
      existing.regular_pay += regP;
      existing.overtime_pay += otP;
      existing.absence_min += Number(r.absence_minutes || 0);
      existing.wage += Number(r.wage_amount || (regP + otP));
      existing.sessions += 1;
      map.set(key, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.wage - a.wage);
  }, [rows, memberLookup]);

  const totals = useMemo(() => summaries.reduce(
    (acc, s) => ({
      hours: acc.hours + s.hours,
      regular_hours: acc.regular_hours + s.regular_hours,
      overtime_hours: acc.overtime_hours + s.overtime_hours,
      wage: acc.wage + s.wage,
      sessions: acc.sessions + s.sessions,
    }),
    { hours: 0, regular_hours: 0, overtime_hours: 0, wage: 0, sessions: 0 }
  ), [summaries]);

  const exportCsv = () => {
    const header = 'Namn,Arbetslag,Antal pass,Vanliga timmar,Övertidstimmar,Timlön,Övertidslön/h,Vanlig lön,Övertidslön,Total lön\n';
    const body = summaries.map(s =>
      `"${s.name}","${s.team_name || ''}",${s.sessions},${s.regular_hours.toFixed(2)},${s.overtime_hours.toFixed(2)},${s.hourly_rate},${s.overtime_rate},${s.regular_pay.toFixed(2)},${s.overtime_pay.toFixed(2)},${s.wage.toFixed(2)}`
    ).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lonerapport_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wallet className="w-5 h-5" /> Lönerapport byggare</CardTitle>
          <CardDescription>Sammanställning av timmar och lön baserat på incheckningar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant={period === 'today' ? 'default' : 'outline'} size="sm" onClick={() => applyPeriod('today')}>Idag</Button>
            <Button variant={period === 'week' ? 'default' : 'outline'} size="sm" onClick={() => applyPeriod('week')}>Denna vecka</Button>
            <Button variant={period === 'month' ? 'default' : 'outline'} size="sm" onClick={() => applyPeriod('month')}>Denna månad</Button>
            <Button variant={period === 'custom' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('custom')}>Anpassad</Button>
          </div>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <div>
              <Label>Från</Label>
              <Input type="date" value={from} onChange={e => { setFrom(e.target.value); setPeriod('custom'); }} />
            </div>
            <div>
              <Label>Till</Label>
              <Input type="date" value={to} onChange={e => { setTo(e.target.value); setPeriod('custom'); }} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> Byggare</div>
              <div className="text-2xl font-bold">{summaries.length}</div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Vanliga tim</div>
              <div className="text-2xl font-bold">{totals.regular_hours.toFixed(1)}h</div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Övertidstim</div>
              <div className="text-2xl font-bold text-orange-600">{totals.overtime_hours.toFixed(1)}h</div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1"><Wallet className="w-3 h-3" /> Total lön</div>
              <div className="text-2xl font-bold">{Math.round(totals.wage).toLocaleString('sv-SE')} kr</div>
            </CardContent></Card>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={summaries.length === 0}>
              <Download className="w-4 h-4 mr-2" /> Exportera CSV
            </Button>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Namn</TableHead>
                  <TableHead>Arbetslag</TableHead>
                  <TableHead className="text-right">Pass</TableHead>
                  <TableHead className="text-right">Vanliga tim</TableHead>
                  <TableHead className="text-right">Övertid tim</TableHead>
                  <TableHead className="text-right">Timlön</TableHead>
                  <TableHead className="text-right">Övertidslön/h</TableHead>
                  <TableHead className="text-right">Vanlig lön</TableHead>
                  <TableHead className="text-right">Övertidslön</TableHead>
                  <TableHead className="text-right">Summa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-6">Laddar…</TableCell></TableRow>
                ) : summaries.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-6">Inga incheckningar i perioden.</TableCell></TableRow>
                ) : summaries.map(s => (
                  <TableRow key={s.user_id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.team_name ? <Badge variant="secondary">{s.team_name}</Badge> : '—'}</TableCell>
                    <TableCell className="text-right">{s.sessions}</TableCell>
                    <TableCell className="text-right">{s.regular_hours.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-orange-600">{s.overtime_hours > 0 ? s.overtime_hours.toFixed(2) : '—'}</TableCell>
                    <TableCell className="text-right">{Math.round(s.hourly_rate)} kr/h</TableCell>
                    <TableCell className="text-right">{Math.round(s.overtime_rate)} kr/h</TableCell>
                    <TableCell className="text-right">{Math.round(s.regular_pay).toLocaleString('sv-SE')} kr</TableCell>
                    <TableCell className="text-right text-orange-600">{s.overtime_pay > 0 ? `${Math.round(s.overtime_pay).toLocaleString('sv-SE')} kr` : '—'}</TableCell>
                    <TableCell className="text-right font-bold">{Math.round(s.wage).toLocaleString('sv-SE')} kr</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollReportView;
