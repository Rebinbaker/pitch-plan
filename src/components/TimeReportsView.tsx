import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, Download, FileText, TrendingUp } from 'lucide-react';
import { TimeReport, TimeEntry } from '@/types/timeTracking';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { sv } from 'date-fns/locale';
import TeamTimeChart from './TeamTimeChart';

const TimeReportsView = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<TimeReport[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTeam, setSelectedTeam] = useState<string>('all');

  useEffect(() => {
    if (user?.id) {
      loadReports();
      loadTimeEntries();
      loadTeams();
    }
  }, [user?.id]);

  const loadTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('user_id', user!.id);

      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  const loadReports = async () => {
    try {
      const { data, error } = await supabase
        .from('time_reports')
        .select('*')
        .eq('user_id', user!.id)
        .order('generated_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = (type: 'daily' | 'weekly' | 'monthly', date: string) => {
    const baseDate = new Date(date);
    switch (type) {
      case 'daily':
        return { start: format(baseDate, 'yyyy-MM-dd'), end: format(baseDate, 'yyyy-MM-dd') };
      case 'weekly':
        const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 });
        return { start: format(weekStart, 'yyyy-MM-dd'), end: format(weekEnd, 'yyyy-MM-dd') };
      case 'monthly':
        const monthStart = startOfMonth(baseDate);
        const monthEnd = endOfMonth(baseDate);
        return { start: format(monthStart, 'yyyy-MM-dd'), end: format(monthEnd, 'yyyy-MM-dd') };
    }
  };

  const loadTimeEntries = async () => {
    try {
      let query = supabase
        .from('time_entries')
        .select(`
          *,
          profiles(username, display_name)
        `)
        .eq('user_id', user!.id);

      // Add team filter if selected
      if (selectedTeam && selectedTeam !== 'all') {
        query = query.eq('team_id', selectedTeam);
      }

      const { data, error } = await query
        .gte('start_time', getDateRange(reportType, selectedDate).start)
        .lte('start_time', getDateRange(reportType, selectedDate).end)
        .order('start_time', { ascending: false });

      if (error) throw error;
      setTimeEntries(data || []);
    } catch (error) {
      console.error('Error loading time entries:', error);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadTimeEntries();
    }
  }, [reportType, selectedDate, selectedTeam]);

  const generateReport = async () => {
    setGenerateLoading(true);
    try {
      const baseDate = new Date(selectedDate);
      let period: { start: string; end: string };
      let title: string;

      switch (reportType) {
        case 'daily':
          period = { start: baseDate.toISOString(), end: baseDate.toISOString() };
          title = `Daglig rapport - ${format(baseDate, 'PPP', { locale: sv })}`;
          break;
        case 'weekly':
          const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
          const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 });
          period = { start: weekStart.toISOString(), end: weekEnd.toISOString() };
          title = `Veckorapport - v${format(baseDate, 'I yyyy', { locale: sv })}`;
          break;
        case 'monthly':
          const monthStart = startOfMonth(baseDate);
          const monthEnd = endOfMonth(baseDate);
          period = { start: monthStart.toISOString(), end: monthEnd.toISOString() };
          title = `Månadsrapport - ${format(baseDate, 'MMMM yyyy', { locale: sv })}`;
          break;
      }

      // Add team filter to title if selected
      if (selectedTeam && selectedTeam !== 'all') {
        const selectedTeamData = teams.find(t => t.id === selectedTeam);
        if (selectedTeamData) {
          title += ` - ${selectedTeamData.name}`;
        }
      }

      try {
        let query = supabase
          .from('time_entries')
          .select(`
            *,
            profiles(username, display_name)
          `)
          .eq('user_id', user!.id);

        // Add team filter if selected
        if (selectedTeam && selectedTeam !== 'all') {
          query = query.eq('team_id', selectedTeam);
        }

        const { data: entries, error } = await query
          .gte('start_time', period.start)
          .lte('start_time', period.end);

        if (error) throw error;

        const totalHours = entries?.reduce((sum, entry) => sum + (entry.duration_hours || 0), 0) || 0;
        const billableHours = entries?.filter(e => e.is_billable)
          .reduce((sum, entry) => sum + (entry.duration_hours || 0), 0) || 0;

        // Group by project
        const projectData: Record<string, { hours: number; billable: number; entries: number }> = {};
        entries?.forEach(entry => {
          const key = entry.project_id || 'Utan projekt';
          if (!projectData[key]) {
            projectData[key] = { hours: 0, billable: 0, entries: 0 };
          }
          projectData[key].hours += entry.duration_hours || 0;
          if (entry.is_billable) {
            projectData[key].billable += entry.duration_hours || 0;
          }
          projectData[key].entries += 1;
        });

        const reportData = {
          period,
          summary: { totalHours, billableHours, totalEntries: entries?.length || 0 },
          projects: projectData,
          entries: entries || [],
          team: selectedTeam ? teams.find(t => t.id === selectedTeam) : null
        };

        // Save report
        const { data: report, error: reportError } = await supabase
          .from('time_reports')
          .insert({
            user_id: user!.id,
            report_type: reportType,
            title,
            start_date: format(new Date(period.start), 'yyyy-MM-dd'),
            end_date: format(new Date(period.end), 'yyyy-MM-dd'),
            total_hours: totalHours,
            billable_hours: billableHours,
            team_ids: selectedTeam && selectedTeam !== 'all' ? [selectedTeam] : null,
            report_data: reportData
          })
          .select()
          .single();

        if (reportError) throw reportError;

        toast({
          title: "Rapport genererad",
          description: `${title} har skapats`,
        });

        loadReports();
      } catch (error) {
        console.error('Error generating report:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Fel",
        description: "Kunde inte generera rapport",
        variant: "destructive",
      });
    } finally {
      setGenerateLoading(false);
    }
  };

  const exportReport = async (report: TimeReport) => {
    try {
      // Get user profile for this report
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('user_id', report.user_id)
        .single();

      const userName = profile?.display_name || profile?.username || 'Okänd användare';

      // Create CSV content
      const entries = report.report_data?.entries || [];
      const csvHeaders = ['Användare', 'Team', 'Datum', 'Starttid', 'Sluttid', 'Timmar', 'Arbetmoment', 'Beskrivning'];
      const csvRows = entries.map((entry: any) => {
        // Get team name by looking up team_id in our teams array
        let teamName = 'Inget team';
        if (entry.team_id && teams.length > 0) {
          const team = teams.find(t => t.id === entry.team_id);
          teamName = team?.name || 'Inget team';
        }
        
        return [
          userName,
          teamName,
          format(new Date(entry.start_time), 'yyyy-MM-dd'),
          format(new Date(entry.start_time), 'HH:mm'),
          entry.end_time ? format(new Date(entry.end_time), 'HH:mm') : '',
          entry.duration_hours || '',
          entry.work_phase_name || 'Ingen arbetsfas',
          entry.description || ''
        ];
      });

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      // Add BOM for UTF-8 support in Excel
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${report.title.replace(/\s+/g, '_')}.csv`;
      link.click();

      toast({
        title: "Rapport exporterad",
        description: "CSV-fil har laddats ner",
      });
    } catch (error) {
      console.error('Error exporting report:', error);
      toast({
        title: "Fel",
        description: "Kunde inte exportera rapport",
        variant: "destructive",
      });
    }
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}t ${m}m`;
  };

  if (loading) {
    return <div className="p-6">Laddar rapporter...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Generate New Report */}
      <Card>
        <CardHeader>
          <CardTitle>Generera ny rapport</CardTitle>
          <CardDescription>Skapa detaljerade tidsrapporter för analys</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <Label htmlFor="report-type">Rapporttyp</Label>
              <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daglig</SelectItem>
                  <SelectItem value="weekly">Veckovis</SelectItem>
                  <SelectItem value="monthly">Månadsvis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="team-filter">Team (valfritt)</Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="Alla team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla team</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="report-date">
                {reportType === 'daily' ? 'Datum' : reportType === 'weekly' ? 'Vecka (valfritt datum)' : 'Månad (valfritt datum)'}
              </Label>
              <Input
                id="report-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            
            <div className="flex items-end">
              <Button onClick={generateReport} disabled={generateLoading} className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                {generateLoading ? 'Genererar...' : 'Generera rapport'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Chart */}
      <TeamTimeChart timeEntries={timeEntries} />

      {/* Existing Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Tidigare rapporter</CardTitle>
          <CardDescription>Dina sparade tidsrapporter</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">{report.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(report.start_date), 'PPP', { locale: sv })} - {format(new Date(report.end_date), 'PPP', { locale: sv })}
                  </div>
                   <div className="flex items-center gap-4 mt-2">
                     <Badge variant="outline">{formatHours(report.total_hours)} totalt</Badge>
                     <Badge variant="secondary" className="capitalize">{report.report_type}</Badge>
                     {report.team_ids && report.team_ids.length > 0 && (
                       <Badge variant="default">Team-filtrerad</Badge>
                     )}
                   </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => exportReport(report)}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportera
                  </Button>
                </div>
              </div>
            ))}
            {reports.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Inga rapporter skapade ännu. Generera din första rapport ovan.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TimeReportsView;
