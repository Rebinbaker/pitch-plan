import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin } from 'lucide-react';
import { format, addWeeks, startOfWeek, addDays } from 'date-fns';
import { sv } from 'date-fns/locale';

interface MobilePlanningViewProps {
  projects?: any[];
}

export function MobilePlanningView({ projects = [] }: MobilePlanningViewProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const nextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const prevWeek = () => setCurrentWeek(addWeeks(currentWeek, -1));
  const goToToday = () => setCurrentWeek(new Date());

  // Mock planning data
  const planningData = [
    {
      id: '1',
      projectName: 'Villa Andersson',
      team: 'Team Alpha',
      date: addDays(weekStart, 1),
      startTime: '08:00',
      endTime: '16:00',
      location: 'Stockholm',
      status: 'confirmed'
    },
    {
      id: '2',
      projectName: 'Kontor Stockholm',
      team: 'Team Beta',
      date: addDays(weekStart, 2),
      startTime: '09:00',
      endTime: '17:00',
      location: 'Stockholm',
      status: 'tentative'
    },
    {
      id: '3',
      projectName: 'Lager Göteborg',
      team: 'Team Gamma',
      date: addDays(weekStart, 4),
      startTime: '07:30',
      endTime: '15:30',
      location: 'Göteborg',
      status: 'confirmed'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-success text-success-foreground';
      case 'tentative': return 'bg-warning text-warning-foreground';
      case 'cancelled': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Bekräftad';
      case 'tentative': return 'Preliminär';
      case 'cancelled': return 'Inställd';
      default: return status;
    }
  };

  const getEventsForDay = (date: Date) => {
    return planningData.filter(event => 
      format(event.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">Planering</h2>
        <p className="text-sm text-muted-foreground">Veckoöversikt för team</p>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={prevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-center">
              <p className="font-semibold">
                Vecka {format(weekStart, 'w', { locale: sv })}
              </p>
              <p className="text-sm text-muted-foreground">
                {format(weekStart, 'dd MMM', { locale: sv })} - {format(addDays(weekStart, 6), 'dd MMM', { locale: sv })}
              </p>
            </div>
            
            <Button variant="outline" size="sm" onClick={nextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <Button variant="ghost" size="sm" onClick={goToToday} className="w-full mt-3">
            Gå till idag
          </Button>
        </CardContent>
      </Card>

      {/* Week Overview */}
      <div className="space-y-3">
        {weekDays.map((day, index) => {
          const dayEvents = getEventsForDay(day);
          const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
          
          return (
            <Card key={index} className={isToday ? 'border-primary bg-primary/5' : ''}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(day, 'EEEE dd/MM', { locale: sv })}
                    </span>
                    {isToday && (
                      <Badge variant="secondary" className="text-xs">
                        Idag
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm font-normal text-muted-foreground">
                    {dayEvents.length} bokningar
                  </span>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="pt-0">
                {dayEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Inga bokningar
                  </p>
                ) : (
                  <div className="space-y-3">
                    {dayEvents.map((event) => (
                      <div key={event.id} className="border border-border rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">{event.projectName}</h4>
                            <p className="text-xs text-muted-foreground">{event.team}</p>
                          </div>
                          <Badge className={`text-xs ${getStatusColor(event.status)}`}>
                            {getStatusLabel(event.status)}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span>{event.startTime} - {event.endTime}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span>{event.location}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}