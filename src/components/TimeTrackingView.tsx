import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Pause, Square, Clock, Calendar, BarChart3 } from 'lucide-react';
import { TimeEntry, TimeTrackingStats } from '@/types/timeTracking';
import { useSupabaseStorage } from '@/hooks/useSupabaseStorage';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import TimeEntryForm from './TimeEntryForm';
import TimeReportsView from './TimeReportsView';

const TimeTrackingView = memo(() => {
  console.log('TimeTrackingView re-rendered');
  
  const { user } = useAuth();
  const { toast } = useToast();
  const { projects } = useSupabaseStorage();
  const [teams, setTeams] = useState<any[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [stats, setStats] = useState<TimeTrackingStats>({
    totalHoursToday: 0,
    totalHoursThisWeek: 0,
    totalHoursThisMonth: 0,
    averageHoursPerDay: 0,
    billableHoursThisWeek: 0,
    isTimerRunning: false
  });
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTeams = useCallback(async () => {
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
  }, [user?.id]);

  const loadStats = useCallback(async () => {
    try {
      const today = new Date();
      const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user!.id)
        .gte('start_time', monthStart.toISOString());

      if (error) throw error;

      const entries = data || [];
      const todayEntries = entries.filter(e => 
        new Date(e.start_time).toDateString() === new Date().toDateString()
      );
      const weekEntries = entries.filter(e => 
        new Date(e.start_time) >= weekStart
      );

      const totalHoursToday = todayEntries.reduce((sum, e) => sum + (e.duration_hours || 0), 0);
      const totalHoursThisWeek = weekEntries.reduce((sum, e) => sum + (e.duration_hours || 0), 0);
      const totalHoursThisMonth = entries.reduce((sum, e) => sum + (e.duration_hours || 0), 0);
      const billableHoursThisWeek = weekEntries
        .filter(e => e.is_billable)
        .reduce((sum, e) => sum + (e.duration_hours || 0), 0);

      setStats({
        totalHoursToday,
        totalHoursThisWeek,
        totalHoursThisMonth,
        averageHoursPerDay: totalHoursThisMonth / new Date().getDate(),
        billableHoursThisWeek,
        isTimerRunning: !!currentEntry
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, [user?.id, currentEntry]);

  const loadTimeEntries = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user!.id)
        .order('start_time', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTimeEntries(data || []);

      // Check for running timer
      const runningEntry = data?.find(entry => !entry.end_time);
      setCurrentEntry(runningEntry || null);
    } catch (error) {
      console.error('Error loading time entries:', error);
      toast({
        title: "Fel",
        description: "Kunde inte ladda tidsregistreringar",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  useEffect(() => {
    if (user?.id) {
      loadTimeEntries();
      loadStats();
      loadTeams();
    }
  }, [user?.id, loadTeams, loadTimeEntries, loadStats]);

  const startTimer = useCallback(async (projectId?: string, description?: string, teamId?: string) => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          user_id: user!.id,
          project_id: projectId,
          team_id: teamId,
          start_time: new Date().toISOString(),
          description: description || 'Arbetspass',
          entry_type: 'timer',
          is_billable: true
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentEntry(data);
      setStats(prev => ({ ...prev, isTimerRunning: true }));
      
      toast({
        title: "Timer startad",
        description: "Tidsregistrering påbörjad",
      });
    } catch (error) {
      console.error('Error starting timer:', error);
      toast({
        title: "Fel",
        description: "Kunde inte starta timer",
        variant: "destructive",
      });
    }
  }, [user?.id, toast]);

  const stopTimer = useCallback(async () => {
    if (!currentEntry) return;

    try {
      const endTime = new Date();
      const startTime = new Date(currentEntry.start_time);
      const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

      const { error } = await supabase
        .from('time_entries')
        .update({
          end_time: endTime.toISOString(),
          duration_hours: Math.round(durationHours * 100) / 100
        })
        .eq('id', currentEntry.id);

      if (error) throw error;

      setCurrentEntry(null);
      setStats(prev => ({ ...prev, isTimerRunning: false }));
      loadTimeEntries();
      loadStats();

      toast({
        title: "Timer stoppad",
        description: `Registrerat ${Math.round(durationHours * 100) / 100} timmar`,
      });
    } catch (error) {
      console.error('Error stopping timer:', error);
      toast({
        title: "Fel",
        description: "Kunde inte stoppa timer",
        variant: "destructive",
      });
    }
  }, [currentEntry, loadTimeEntries, loadStats, toast]);

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}t ${m}m`;
  };

  if (loading) {
    return <div className="p-6">Laddar tidsregistrering...</div>;
  }

  return (
    <div className="space-y-6" style={{ contain: 'layout style paint', transform: 'translateZ(0)' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tidsregistrering</h1>
          <p className="text-muted-foreground">Registrera och följ upp arbetstid</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Idag
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(stats.totalHoursToday)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Denna vecka
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(stats.totalHoursThisWeek)}</div>
            <p className="text-xs text-muted-foreground">
              {formatDuration(stats.billableHoursThisWeek)} fakturerbart
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Denna månad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(stats.totalHoursThisMonth)}</div>
            <p className="text-xs text-muted-foreground">
              Snitt: {formatDuration(stats.averageHoursPerDay)}/dag
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {currentEntry ? (
              <div>
                <Badge variant="default" className="mb-2">Timer aktiv</Badge>
                <Button size="sm" onClick={stopTimer} className="w-full">
                  <Pause className="h-4 w-4 mr-2" />
                  Stoppa
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={() => startTimer()} className="w-full">
                <Play className="h-4 w-4 mr-2" />
                Starta timer
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="timer" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timer">Timer & Registrering</TabsTrigger>
          <TabsTrigger value="entries">Senaste registreringar</TabsTrigger>
          <TabsTrigger value="reports">Rapporter</TabsTrigger>
        </TabsList>

        <TabsContent value="timer" className="space-y-4">
          <TimeEntryForm 
            projects={projects}
            teams={teams}
            onEntryAdded={loadTimeEntries}
            currentEntry={currentEntry}
            onStartTimer={startTimer}
            onStopTimer={stopTimer}
          />
        </TabsContent>

        <TabsContent value="entries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Senaste registreringar</CardTitle>
              <CardDescription>Dina 20 senaste tidsregistreringar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                 {timeEntries.map((entry: any) => (
                   <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                     <div>
                       <div className="font-medium">{entry.description || 'Arbetstid'}</div>
                       <div className="text-sm text-muted-foreground">
                         {format(new Date(entry.start_time), 'PPp', { locale: sv })}
                         {entry.end_time && ` - ${format(new Date(entry.end_time), 'p', { locale: sv })}`}
                       </div>
                       <div className="flex items-center gap-2 mt-1">
                         {entry.work_phase_name && (
                           <Badge variant="outline">{entry.work_phase_name}</Badge>
                         )}
                         {entry.profiles && (
                           <Badge variant="secondary" className="text-xs">
                             {entry.profiles.display_name || entry.profiles.username}
                           </Badge>
                         )}
                       </div>
                     </div>
                     <div className="text-right">
                       <div className="font-bold">
                         {entry.duration_hours ? formatDuration(entry.duration_hours) : 'Pågår...'}
                       </div>
                       {entry.location_verified && (
                         <Badge variant="default" className="text-xs">📍 Platsverifierad</Badge>
                       )}
                     </div>
                   </div>
                 ))}
                {timeEntries.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Inga tidsregistreringar ännu
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <TimeReportsView />
        </TabsContent>
      </Tabs>
    </div>
  );
});

export default TimeTrackingView;