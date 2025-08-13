import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar as CalendarIcon, User, Users, Clock, 
  CheckCircle, AlertCircle, Coffee, Briefcase,
  MapPin, Phone, Mail
} from 'lucide-react';
import { ConstructionTeam, TeamMember } from '@/types/team';
import { TeamScheduleEntry } from '@/types/workload';
import { format, addDays, startOfWeek, endOfWeek, parseISO, isSameDay } from 'date-fns';
import { sv } from 'date-fns/locale';

interface PersonalScheduleViewProps {
  team: ConstructionTeam;
  onUpdateSchedule: () => void;
}

export function PersonalScheduleView({ team, onUpdateSchedule }: PersonalScheduleViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [scheduleEntries, setScheduleEntries] = useState<TeamScheduleEntry[]>([]);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);

  useEffect(() => {
    if (team.members && team.members.length > 0 && !selectedMember) {
      setSelectedMember(team.members[0].id);
    }
  }, [team.members, selectedMember]);

  useEffect(() => {
    loadPersonalSchedule();
  }, [selectedDate, selectedMember, team.id]);

  const loadPersonalSchedule = async () => {
    // In a real app, this would fetch from Supabase
    // For now, we'll use mock data
    setScheduleEntries([]);
    setTimeEntries([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'hsl(var(--success))';
      case 'busy': return 'hsl(var(--warning))';
      case 'on_leave': return 'hsl(var(--info))';
      case 'sick': return 'hsl(var(--destructive))';
      case 'vacation': return 'hsl(var(--accent))';
      default: return 'hsl(var(--muted))';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'Tillgänglig';
      case 'busy': return 'Upptagen';
      case 'on_leave': return 'Ledighet';
      case 'sick': return 'Sjuk';
      case 'vacation': return 'Semester';
      default: return 'Okänd';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'busy': return <Briefcase className="w-4 h-4 text-warning" />;
      case 'on_leave': return <Coffee className="w-4 h-4 text-info" />;
      case 'sick': return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'vacation': return <Coffee className="w-4 h-4 text-accent" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const selectedMemberData = team.members?.find(m => m.id === selectedMember);
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getDayEntries = (date: Date) => {
    return scheduleEntries.filter(entry => 
      entry.teamMemberId === selectedMember &&
      format(parseISO(entry.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  const getDayTimeEntries = (date: Date) => {
    return timeEntries.filter(entry => 
      entry.userId === selectedMember &&
      isSameDay(parseISO(entry.sessionDate), date)
    );
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const calculateDayHours = (date: Date) => {
    const dayTimeEntries = getDayTimeEntries(date);
    return dayTimeEntries.reduce((total, entry) => total + (entry.durationHours || 0), 0);
  };

  const getWeekSummary = () => {
    const totalHours = weekDays.reduce((sum, day) => sum + calculateDayHours(day), 0);
    const workDays = weekDays.filter(day => calculateDayHours(day) > 0).length;
    const avgHoursPerDay = workDays > 0 ? totalHours / workDays : 0;

    return { totalHours, workDays, avgHoursPerDay };
  };

  if (!selectedMemberData) {
    return (
      <div className="text-center py-12">
        <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-medium mb-2">Inga teammedlemmar</h3>
        <p className="text-muted-foreground">
          Lägg till medlemmar i teamet för att se deras scheman
        </p>
      </div>
    );
  }

  const weekSummary = getWeekSummary();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Personligt schema</h3>
          <p className="text-sm text-muted-foreground">
            Se individuella scheman och arbetstider för teammedlemmar
          </p>
        </div>
      </div>

      {/* Member Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Välj teammedlem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger>
                <SelectValue placeholder="Välj teammedlem" />
              </SelectTrigger>
              <SelectContent>
                {team.members?.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.firstName} {member.lastName}
                    {member.position && ` - ${member.position}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Quick member overview */}
            {selectedMemberData && (
              <>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Avatar>
                    <AvatarFallback>
                      {getInitials(selectedMemberData.firstName, selectedMemberData.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {selectedMemberData.firstName} {selectedMemberData.lastName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedMemberData.position || 'Teammedlem'}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {selectedMemberData.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedMemberData.email}</span>
                    </div>
                  )}
                  {selectedMemberData.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedMemberData.phone}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="weekly" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="weekly">Veckoöversikt</TabsTrigger>
          <TabsTrigger value="calendar">Kalender</TabsTrigger>
          <TabsTrigger value="summary">Sammanfattning</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Week Stats */}
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Veckostatistik</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-2xl font-bold">{weekSummary.totalHours.toFixed(1)}h</div>
                    <div className="text-sm text-muted-foreground">Total arbetstid</div>
                  </div>
                  
                  <div>
                    <div className="text-2xl font-bold">{weekSummary.workDays}</div>
                    <div className="text-sm text-muted-foreground">Arbetsdagar</div>
                  </div>
                  
                  <div>
                    <div className="text-lg font-medium">{weekSummary.avgHoursPerDay.toFixed(1)}h</div>
                    <div className="text-sm text-muted-foreground">Snitt per dag</div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Kapacitet</span>
                      <span>{((weekSummary.totalHours / 40) * 100).toFixed(0)}%</span>
                    </div>
                    <Progress 
                      value={Math.min((weekSummary.totalHours / 40) * 100, 100)} 
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Weekly Schedule */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5" />
                    Vecka {format(selectedDate, 'w', { locale: sv })} - {format(selectedDate, 'yyyy')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {weekDays.map(day => {
                      const dayEntries = getDayEntries(day);
                      const dayTimeEntries = getDayTimeEntries(day);
                      const dayHours = calculateDayHours(day);
                      const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                      
                      return (
                        <div key={day.toISOString()} className={`p-4 rounded-lg border ${
                          isToday ? 'bg-primary/5 border-primary' : 'bg-background'
                        }`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="text-lg font-medium">
                                {format(day, 'EEEE', { locale: sv })}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {format(day, 'd MMMM', { locale: sv })}
                              </div>
                              {isToday && (
                                <Badge variant="outline" className="text-xs">
                                  Idag
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-sm font-medium">
                                {dayHours.toFixed(1)}h
                              </div>
                              {dayEntries.length > 0 && (
                                <div className="flex items-center gap-1">
                                  {getStatusIcon(dayEntries[0].status)}
                                  <span className="text-sm">{getStatusText(dayEntries[0].status)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Schedule entries */}
                          {dayEntries.length > 0 && (
                            <div className="space-y-2 mb-3">
                              {dayEntries.map(entry => (
                                <div key={entry.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                                  <Badge 
                                    variant="secondary"
                                    style={{ 
                                      backgroundColor: getStatusColor(entry.status), 
                                      color: 'white' 
                                    }}
                                  >
                                    {getStatusText(entry.status)}
                                  </Badge>
                                  <span className="text-sm">{entry.hoursPlanned}h planerat</span>
                                  {entry.notes && (
                                    <span className="text-sm text-muted-foreground">- {entry.notes}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Time entries */}
                          {dayTimeEntries.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-sm font-medium">Registrerad tid:</div>
                              {dayTimeEntries.map((entry, index) => (
                                <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  <span>
                                    {format(parseISO(entry.startTime), 'HH:mm')} - 
                                    {entry.endTime ? format(parseISO(entry.endTime), 'HH:mm') : 'Pågår'}
                                  </span>
                                  {entry.description && (
                                    <>
                                      <span>-</span>
                                      <span>{entry.description}</span>
                                    </>
                                  )}
                                  {entry.gpsLatitude && entry.gpsLongitude && (
                                    <MapPin className="w-3 h-3" />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {dayEntries.length === 0 && dayTimeEntries.length === 0 && (
                            <div className="text-sm text-muted-foreground italic">
                              Inga schemalagda aktiviteter
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Välj datum</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  locale={sv}
                  className="rounded-md border pointer-events-auto"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {format(selectedDate, 'EEEE d MMMM yyyy', { locale: sv })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(() => {
                    const dayEntries = getDayEntries(selectedDate);
                    const dayTimeEntries = getDayTimeEntries(selectedDate);
                    const dayHours = calculateDayHours(selectedDate);

                    return (
                      <>
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <span className="font-medium">Total arbetstid</span>
                          <span className="text-lg font-bold">{dayHours.toFixed(1)}h</span>
                        </div>

                        {dayEntries.length > 0 && (
                          <div className="space-y-2">
                            <div className="font-medium">Planerat schema:</div>
                            {dayEntries.map(entry => (
                              <div key={entry.id} className="p-2 border rounded">
                                <div className="flex items-center gap-2 mb-1">
                                  {getStatusIcon(entry.status)}
                                  <span className="font-medium">{getStatusText(entry.status)}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {entry.hoursPlanned}h
                                  </span>
                                </div>
                                {entry.notes && (
                                  <div className="text-sm text-muted-foreground">{entry.notes}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {dayTimeEntries.length > 0 && (
                          <div className="space-y-2">
                            <div className="font-medium">Registrerad tid:</div>
                            {dayTimeEntries.map((entry, index) => (
                              <div key={index} className="p-2 border rounded">
                                <div className="flex items-center gap-2 mb-1">
                                  <Clock className="w-4 h-4" />
                                  <span className="font-medium">
                                    {format(parseISO(entry.startTime), 'HH:mm')} - 
                                    {entry.endTime ? format(parseISO(entry.endTime), 'HH:mm') : 'Pågår'}
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    ({(entry.durationHours || 0).toFixed(1)}h)
                                  </span>
                                </div>
                                {entry.description && (
                                  <div className="text-sm text-muted-foreground">{entry.description}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {dayEntries.length === 0 && dayTimeEntries.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>Inga schemalagda aktiviteter denna dag</p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Månadsöversikt</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">~160h</div>
                <div className="text-sm text-muted-foreground">Genomsnittlig månadstid</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Produktivitet</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">95%</div>
                <div className="text-sm text-muted-foreground">Närvaroprocent</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Övertid</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">5.5h</div>
                <div className="text-sm text-muted-foreground">Denna månad</div>
              </CardContent>
            </Card>
          </div>

          {/* Skills and Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Kompetensprofil</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium mb-2">Färdigheter</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedMemberData.skills?.map((skill, index) => (
                      <Badge key={index} variant="outline">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}