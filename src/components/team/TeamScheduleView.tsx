import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarIcon, Plus, Users, Clock, AlertCircle } from 'lucide-react';
import { ConstructionTeam } from '@/types/team';
import { TeamScheduleEntry } from '@/types/workload';
import { format, addDays, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';

interface TeamScheduleViewProps {
  team: ConstructionTeam;
  onUpdateSchedule: () => void;
}

export function TeamScheduleView({ team, onUpdateSchedule }: TeamScheduleViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [scheduleEntries, setScheduleEntries] = useState<TeamScheduleEntry[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newEntry, setNewEntry] = useState({
    teamMemberId: '',
    status: 'available' as const,
    hoursPlanned: 8,
    notes: ''
  });

  useEffect(() => {
    loadScheduleEntries();
  }, [selectedDate, team.id]);

  const loadScheduleEntries = async () => {
    // In a real app, this would fetch from Supabase
    // For now, we'll use mock data
    setScheduleEntries([]);
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

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getDayEntries = (date: Date) => {
    return scheduleEntries.filter(entry => 
      format(parseISO(entry.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  const getMemberName = (memberId: string) => {
    const member = team.members?.find(m => m.id === memberId);
    return member ? `${member.firstName} ${member.lastName}` : 'Okänd medlem';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Teamschema</h3>
          <p className="text-sm text-muted-foreground">
            Hantera schema och tillgänglighet för teammedlemmar
          </p>
        </div>
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
              {weekDays.map(day => {
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
                        {dayEntries.map(entry => (
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
      </div>

      {/* Team Capacity Summary */}
      <Card>
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
                {team.members?.filter(m => 
                  !scheduleEntries.some(e => 
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
                {scheduleEntries.filter(e => 
                  format(parseISO(e.date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd') && 
                  e.status === 'busy'
                ).length}
              </div>
              <div className="text-sm text-muted-foreground">Upptagna</div>
            </div>
            
            <div className="text-center p-3 bg-info/10 rounded-lg">
              <div className="text-2xl font-bold text-info">
                {scheduleEntries.filter(e => 
                  format(parseISO(e.date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd') && 
                  ['on_leave', 'vacation'].includes(e.status)
                ).length}
              </div>
              <div className="text-sm text-muted-foreground">På ledighet</div>
            </div>
            
            <div className="text-center p-3 bg-destructive/10 rounded-lg">
              <div className="text-2xl font-bold text-destructive">
                {scheduleEntries.filter(e => 
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