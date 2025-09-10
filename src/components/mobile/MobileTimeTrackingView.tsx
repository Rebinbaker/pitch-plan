import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Square, Clock, Calendar } from 'lucide-react';
import { TimeEntry, TimeTrackingStats } from '@/types/timeTracking';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

interface MobileTimeTrackingViewProps {
  projects?: any[];
}

export function MobileTimeTrackingView({ projects = [] }: MobileTimeTrackingViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [currentTimer, setCurrentTimer] = useState<{ startTime: Date; projectId?: string } | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [stats, setStats] = useState<TimeTrackingStats>({
    totalHoursToday: 7.5,
    totalHoursThisWeek: 32.5,
    totalHoursThisMonth: 142.3,
    averageHoursPerDay: 7.2,
    billableHoursThisWeek: 28.5,
    isTimerRunning: false
  });

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && currentTimer) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - currentTimer.startTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, currentTimer]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = () => {
    setCurrentTimer({
      startTime: new Date(),
      projectId: projects[0]?.id // Default to first project
    });
    setIsTimerRunning(true);
    setElapsedTime(0);
    toast({
      title: "Timer startad",
      description: "Tidsregistrering pågår nu"
    });
  };

  const pauseTimer = () => {
    setIsTimerRunning(false);
    toast({
      title: "Timer pausad",
      description: `Tid: ${formatTime(elapsedTime)}`
    });
  };

  const stopTimer = () => {
    if (currentTimer && elapsedTime > 0) {
      // Here you would normally save the time entry
      toast({
        title: "Timer stoppad",
        description: `Total tid: ${formatTime(elapsedTime)} har sparats`
      });
    }
    setIsTimerRunning(false);
    setCurrentTimer(null);
    setElapsedTime(0);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">Tidsregistrering</h2>
        <p className="text-sm text-muted-foreground">Registrera arbetstid enkelt</p>
      </div>

      {/* Timer Card */}
      <Card className="bg-gradient-subtle">
        <CardHeader className="pb-4">
          <CardTitle className="text-center">Aktiv Timer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Timer Display */}
          <div className="text-center">
            <div className="text-4xl font-mono font-bold text-primary mb-2">
              {formatTime(elapsedTime)}
            </div>
            {currentTimer && (
              <p className="text-sm text-muted-foreground">
                Startad: {format(currentTimer.startTime, 'HH:mm')}
              </p>
            )}
          </div>

          {/* Timer Controls */}
          <div className="flex justify-center gap-3">
            {!isTimerRunning && !currentTimer && (
              <Button size="lg" onClick={startTimer} className="flex-1 max-w-32">
                <Play className="h-5 w-5 mr-2" />
                Starta
              </Button>
            )}
            
            {isTimerRunning && (
              <>
                <Button variant="outline" size="lg" onClick={pauseTimer}>
                  <Pause className="h-5 w-5 mr-2" />
                  Pausa
                </Button>
                <Button variant="destructive" size="lg" onClick={stopTimer}>
                  <Square className="h-4 w-4 mr-2" />
                  Stoppa
                </Button>
              </>
            )}
            
            {!isTimerRunning && currentTimer && (
              <>
                <Button size="lg" onClick={() => setIsTimerRunning(true)} className="flex-1 max-w-32">
                  <Play className="h-5 w-5 mr-2" />
                  Fortsätt
                </Button>
                <Button variant="destructive" size="lg" onClick={stopTimer}>
                  <Square className="h-4 w-4 mr-2" />
                  Stoppa
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats.totalHoursToday}h</p>
            <p className="text-xs text-muted-foreground">Idag</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-8 w-8 text-accent mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats.totalHoursThisWeek}h</p>
            <p className="text-xs text-muted-foreground">Denna vecka</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Entries */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Senaste registreringar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { project: 'Villa Andersson', date: 'Idag', hours: 8.0, status: 'completed' },
            { project: 'Kontor Stockholm', date: 'Igår', hours: 7.5, status: 'completed' },
            { project: 'Lager Göteborg', date: '15 Jan', hours: 6.5, status: 'approved' },
          ].map((entry, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
              <div className="flex-1">
                <p className="font-medium text-sm">{entry.project}</p>
                <p className="text-xs text-muted-foreground">{entry.date}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm">{entry.hours}h</p>
                <Badge variant={entry.status === 'approved' ? 'default' : 'secondary'} className="text-xs">
                  {entry.status === 'approved' ? 'Godkänd' : 'Avslutad'}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}