import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar as CalendarIcon, Plus, Users, Clock, AlertCircle, 
  User, CheckCircle, Coffee, Briefcase, MapPin, Phone, Mail
} from 'lucide-react';
import { ConstructionTeam, TeamMember } from '@/types/team';
import { TeamScheduleEntry } from '@/types/workload';
import { format, addDays, startOfWeek, endOfWeek, parseISO, isSameDay } from 'date-fns';
import { sv } from 'date-fns/locale';

interface TeamScheduleViewProps {
  team: ConstructionTeam;
  onUpdateSchedule: () => void;
}

export function TeamScheduleView({ team, onUpdateSchedule }: TeamScheduleViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [scheduleEntries, setScheduleEntries] = useState<TeamScheduleEntry[]>([]);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'team' | 'individual'>('team');
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newEntry, setNewEntry] = useState({
    teamMemberId: '',
    status: 'available' as const,
    hoursPlanned: 8,
    notes: ''
  });

  useEffect(() => {
    if (team.members && team.members.length > 0 && !selectedMember) {
      setSelectedMember(team.members[0].id);
    }
  }, [team.members, selectedMember]);

  useEffect(() => {
    loadScheduleEntries();
  }, [selectedDate, team.id, selectedMember, viewMode]);

  const loadScheduleEntries = async () => {
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

  const getMemberName = (memberId: string) => {
    const member = team.members?.find(m => m.id === memberId);
    return member ? `${member.firstName} ${member.lastName}` : 'Okänd medlem';
  };

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getDayEntries = (date: Date) => {
    if (viewMode === 'individual') {
      return scheduleEntries.filter(entry => 
        entry.teamMemberId === selectedMember &&
        format(parseISO(entry.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      );
    }
    return scheduleEntries.filter(entry => 
      format(parseISO(entry.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  const getDayTimeEntries = (date: Date) => {
    if (viewMode === 'individual') {
      return timeEntries.filter(entry => 
        entry.userId === selectedMember &&
        isSameDay(parseISO(entry.sessionDate), date)
      );
    }
    return timeEntries.filter(entry => 
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

  const weekSummary = getWeekSummary();

  const handleAddEntry = async () => {
    if (!newEntry.teamMemberId) return;

    const entry: TeamScheduleEntry = {
      id: `schedule-${Date.now()}`,
      teamId: team.id,
      teamMemberId: newEntry.teamMemberId,
      date: format(selectedDate, 'yyyy-MM-dd'),
      status: newEntry.status,
      hoursPlanned: newEntry.hoursPlanned,
      notes: newEntry.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // In a real app, this would save to Supabase
    setScheduleEntries([...scheduleEntries, entry]);
    setShowAddDialog(false);
    setNewEntry({
      teamMemberId: '',
      status: 'available',
      hoursPlanned: 8,
      notes: ''
    });
    onUpdateSchedule();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Schema & Tidsplanering</h3>
          <p className="text-sm text-muted-foreground">
            Hantera schema och arbetstider för teamet eller individuella medlemmar
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={viewMode} onValueChange={(value: 'team' | 'individual') => setViewMode(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="team">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Teamöversikt
                </div>
              </SelectItem>
              <SelectItem value="individual">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Individuellt
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Lägg till schema
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Lägg till schemapost</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Teammedlem</label>
                  <Select 
                    value={newEntry.teamMemberId} 
                    onValueChange={(value) => setNewEntry({ ...newEntry, teamMemberId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Välj teammedlem" />
                    </SelectTrigger>
                    <SelectContent>
                      {team.members?.map(member => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.firstName} {member.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select 
                    value={newEntry.status} 
                    onValueChange={(value: any) => setNewEntry({ ...newEntry, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Tillgänglig</SelectItem>
                      <SelectItem value="busy">Upptagen</SelectItem>
                      <SelectItem value="on_leave">Ledighet</SelectItem>
                      <SelectItem value="sick">Sjuk</SelectItem>
                      <SelectItem value="vacation">Semester</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Planerade timmar</label>
                  <Input
                    type="number"
                    min="0"
                    max="12"
                    value={newEntry.hoursPlanned}
                    onChange={(e) => setNewEntry({ 
                      ...newEntry, 
                      hoursPlanned: parseInt(e.target.value) || 0 
                    })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Anteckningar</label>
                  <Textarea
                    value={newEntry.notes}
                    onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                    placeholder="Valfria anteckningar..."
                    rows={3}
                  />
                </div>

                <Button onClick={handleAddEntry} className="w-full">
                  Lägg till
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {viewMode === 'individual' ? (
        <IndividualScheduleView 
          team={team}
          selectedMember={selectedMember}
          setSelectedMember={setSelectedMember}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          scheduleEntries={scheduleEntries}
          timeEntries={timeEntries}
          weekSummary={weekSummary}
          getDayEntries={getDayEntries}
          getDayTimeEntries={getDayTimeEntries}
          getInitials={getInitials}
          calculateDayHours={calculateDayHours}
          getStatusColor={getStatusColor}
          getStatusText={getStatusText}
          getStatusIcon={getStatusIcon}
          getMemberName={getMemberName}
          weekStart={weekStart}
          weekDays={weekDays}
        />
      ) : (
        <TeamOverviewSchedule 
          team={team}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          scheduleEntries={scheduleEntries}
          getDayEntries={getDayEntries}
          getMemberName={getMemberName}
          getStatusColor={getStatusColor}
          getStatusText={getStatusText}
          getStatusIcon={getStatusIcon}
          weekStart={weekStart}
          weekDays={weekDays}
        />
      )}
    </div>
  );
}

// Individual Schedule Component
function IndividualScheduleView({ 
  team, selectedMember, setSelectedMember, selectedDate, setSelectedDate,
  scheduleEntries, timeEntries, weekSummary, getDayEntries, getDayTimeEntries,
  getInitials, calculateDayHours, getStatusColor, getStatusText, getStatusIcon,
  getMemberName, weekStart, weekDays
}: any) {
  const selectedMemberData = team.members?.find((m: TeamMember) => m.id === selectedMember);

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

  return (
    <Tabs defaultValue="weekly" className="space-y-4">
      <div className="flex items-center justify-between">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="weekly">Veckoöversikt</TabsTrigger>
          <TabsTrigger value="calendar">Kalender</TabsTrigger>
          <TabsTrigger value="summary">Sammanfattning</TabsTrigger>
        </TabsList>
        
        <Select value={selectedMember} onValueChange={setSelectedMember}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Välj teammedlem" />
          </SelectTrigger>
          <SelectContent>
            {team.members?.map((member: TeamMember) => (
              <SelectItem key={member.id} value={member.id}>
                {member.firstName} {member.lastName}
                {member.position && ` - ${member.position}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Member Info Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-12 h-12">
              <AvatarFallback>
                {getInitials(selectedMemberData.firstName, selectedMemberData.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-medium">
                {selectedMemberData.firstName} {selectedMemberData.lastName}
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedMemberData.position || 'Teammedlem'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold">{weekSummary.totalHours.toFixed(1)}h</div>
              <div className="text-sm text-muted-foreground">denna vecka</div>
            </div>
          </div>
        </CardContent>
      </Card>

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
                  {weekDays.map((day: Date) => {
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
                            {dayEntries.map((entry: any) => (
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
                            {dayTimeEntries.map((entry: any, index: number) => (
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
                          {dayEntries.map((entry: any) => (
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
                          {dayTimeEntries.map((entry: any, index: number) => (
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

        <Card>
          <CardHeader>
            <CardTitle>Kompetensprofil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium mb-2">Färdigheter</div>
                <div className="flex flex-wrap gap-2">
                  {selectedMemberData.skills?.map((skill: string, index: number) => (
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
  );
}

// Team Overview Schedule Component  
function TeamOverviewSchedule({
  team, selectedDate, setSelectedDate, scheduleEntries, getDayEntries,
  getMemberName, getStatusColor, getStatusText, getStatusIcon, weekStart, weekDays
}: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Välj datum
          </CardTitle>
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

      {/* Weekly View */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Veckoöversikt - Vecka {format(selectedDate, 'w', { locale: sv })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {weekDays.map((day: Date) => {
              const dayEntries = getDayEntries(day);
              const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              
              return (
                <div key={day.toISOString()} className={`p-3 rounded-lg border ${
                  isToday ? 'bg-primary/5 border-primary' : 'bg-background'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">
                      {format(day, 'EEEE d MMMM', { locale: sv })}
                      {isToday && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Idag
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {dayEntries.length} poster
                    </div>
                  </div>
                  
                  {dayEntries.length > 0 ? (
                    <div className="space-y-2">
                      {dayEntries.map((entry: any) => (
                        <div key={entry.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="secondary"
                              style={{ 
                                backgroundColor: getStatusColor(entry.status), 
                                color: 'white' 
                              }}
                            >
                              {getStatusText(entry.status)}
                            </Badge>
                            <span className="text-sm font-medium">
                              {getMemberName(entry.teamMemberId)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            {entry.hoursPlanned}h
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
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

      {/* Team Capacity Summary */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Kapacitetsöversikt
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-success/10 rounded-lg">
              <div className="text-2xl font-bold text-success">
                {team.members?.filter((m: TeamMember) => 
                  !scheduleEntries.some((e: any) => 
                    e.teamMemberId === m.id && 
                    format(parseISO(e.date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd') && 
                    e.status !== 'available'
                  )
                ).length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Tillgängliga</div>
            </div>
            
            <div className="text-center p-3 bg-warning/10 rounded-lg">
              <div className="text-2xl font-bold text-warning">
                {scheduleEntries.filter((e: any) => 
                  format(parseISO(e.date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd') && 
                  e.status === 'busy'
                ).length}
              </div>
              <div className="text-sm text-muted-foreground">Upptagna</div>
            </div>
            
            <div className="text-center p-3 bg-info/10 rounded-lg">
              <div className="text-2xl font-bold text-info">
                {scheduleEntries.filter((e: any) => 
                  format(parseISO(e.date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd') && 
                  ['on_leave', 'vacation'].includes(e.status)
                ).length}
              </div>
              <div className="text-sm text-muted-foreground">På ledighet</div>
            </div>
            
            <div className="text-center p-3 bg-destructive/10 rounded-lg">
              <div className="text-2xl font-bold text-destructive">
                {scheduleEntries.filter((e: any) => 
                  format(parseISO(e.date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd') && 
                  e.status === 'sick'
                ).length}
              </div>
              <div className="text-sm text-muted-foreground">Sjuka</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}