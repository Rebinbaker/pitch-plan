import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  CalendarDays, Plus, Check, X, Clock, User, 
  Calendar as CalendarIcon, AlertCircle, CheckCircle
} from 'lucide-react';
import { ConstructionTeam } from '@/types/team';
import { LeaveRequest } from '@/types/workload';
import { format, parseISO, differenceInDays } from 'date-fns';
import { sv } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface LeaveManagementProps {
  team: ConstructionTeam;
  onLeaveRequestUpdate: () => void;
}

export function LeaveManagement({ team, onLeaveRequestUpdate }: LeaveManagementProps) {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [newRequest, setNewRequest] = useState({
    teamMemberId: '',
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    leaveType: 'vacation' as const,
    reason: ''
  });

  useEffect(() => {
    loadLeaveRequests();
  }, [team.id]);

  const loadLeaveRequests = async () => {
    // In a real app, this would fetch from Supabase
    // For now, we'll use mock data
    setLeaveRequests([]);
  };

  const getLeaveTypeColor = (type: string) => {
    switch (type) {
      case 'vacation': return 'hsl(var(--success))';
      case 'sick': return 'hsl(var(--destructive))';
      case 'personal': return 'hsl(var(--info))';
      case 'parental': return 'hsl(var(--accent))';
      default: return 'hsl(var(--muted))';
    }
  };

  const getLeaveTypeText = (type: string) => {
    switch (type) {
      case 'vacation': return 'Semester';
      case 'sick': return 'Sjukledighet';
      case 'personal': return 'Personlig ledighet';
      case 'parental': return 'Föräldraledighet';
      default: return 'Okänd';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'hsl(var(--warning))';
      case 'approved': return 'hsl(var(--success))';
      case 'denied': return 'hsl(var(--destructive))';
      default: return 'hsl(var(--muted))';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Väntar på godkännande';
      case 'approved': return 'Godkänd';
      case 'denied': return 'Nekad';
      default: return 'Okänd';
    }
  };

  const handleSubmitRequest = async () => {
    if (!newRequest.teamMemberId || !newRequest.startDate || !newRequest.endDate) return;

    const request: LeaveRequest = {
      id: `leave-${Date.now()}`,
      teamId: team.id,
      teamMemberId: newRequest.teamMemberId,
      userId: 'current-user-id', // In real app, get from auth
      requestedBy: 'current-user-id',
      startDate: format(newRequest.startDate, 'yyyy-MM-dd'),
      endDate: format(newRequest.endDate, 'yyyy-MM-dd'),
      leaveType: newRequest.leaveType,
      reason: newRequest.reason,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // In a real app, this would save to Supabase
    setLeaveRequests([...leaveRequests, request]);
    setShowRequestDialog(false);
    setNewRequest({
      teamMemberId: '',
      startDate: undefined,
      endDate: undefined,
      leaveType: 'vacation',
      reason: ''
    });
    onLeaveRequestUpdate();
  };

  const handleApproveRequest = async (requestId: string) => {
    setLeaveRequests(requests => 
      requests.map(req => 
        req.id === requestId 
          ? { 
              ...req, 
              status: 'approved' as const, 
              approvedBy: 'current-user-id',
              approvedAt: new Date().toISOString()
            }
          : req
      )
    );
    onLeaveRequestUpdate();
  };

  const handleDenyRequest = async (requestId: string) => {
    setLeaveRequests(requests => 
      requests.map(req => 
        req.id === requestId 
          ? { 
              ...req, 
              status: 'denied' as const,
              approvedBy: 'current-user-id',
              approvedAt: new Date().toISOString()
            }
          : req
      )
    );
    onLeaveRequestUpdate();
  };

  const getMemberName = (memberId: string) => {
    const member = team.members?.find(m => m.id === memberId);
    return member ? `${member.firstName} ${member.lastName}` : 'Okänd medlem';
  };

  const pendingRequests = leaveRequests.filter(req => req.status === 'pending');
  const approvedRequests = leaveRequests.filter(req => req.status === 'approved');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Ledighethantering</h3>
          <p className="text-sm text-muted-foreground">
            Hantera ledighetsbegäran och godkännanden för teammedlemmar
          </p>
        </div>
        <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Ny ledighetsbegäran
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ny ledighetsbegäran</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Teammedlem</label>
                <Select 
                  value={newRequest.teamMemberId} 
                  onValueChange={(value) => setNewRequest({ ...newRequest, teamMemberId: value })}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Startdatum</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newRequest.startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newRequest.startDate ? (
                          format(newRequest.startDate, "PPP", { locale: sv })
                        ) : (
                          <span>Välj startdatum</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newRequest.startDate}
                        onSelect={(date) => setNewRequest({ ...newRequest, startDate: date })}
                        initialFocus
                        locale={sv}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="text-sm font-medium">Slutdatum</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newRequest.endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newRequest.endDate ? (
                          format(newRequest.endDate, "PPP", { locale: sv })
                        ) : (
                          <span>Välj slutdatum</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newRequest.endDate}
                        onSelect={(date) => setNewRequest({ ...newRequest, endDate: date })}
                        initialFocus
                        locale={sv}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Typ av ledighet</label>
                <Select 
                  value={newRequest.leaveType} 
                  onValueChange={(value: any) => setNewRequest({ ...newRequest, leaveType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vacation">Semester</SelectItem>
                    <SelectItem value="sick">Sjukledighet</SelectItem>
                    <SelectItem value="personal">Personlig ledighet</SelectItem>
                    <SelectItem value="parental">Föräldraledighet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Anledning (valfritt)</label>
                <Textarea
                  value={newRequest.reason}
                  onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                  placeholder="Beskriv anledningen till ledigheten..."
                  rows={3}
                />
              </div>

              {newRequest.startDate && newRequest.endDate && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm font-medium">
                    Antal dagar: {differenceInDays(newRequest.endDate, newRequest.startDate) + 1}
                  </div>
                </div>
              )}

              <Button onClick={handleSubmitRequest} className="w-full">
                Skicka begäran
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-warning" />
              Väntar på godkännande ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRequests.map(request => (
                <div key={request.id} className="p-4 border rounded-lg bg-warning/5 border-warning/20">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span className="font-medium">{getMemberName(request.teamMemberId)}</span>
                        <Badge 
                          variant="secondary"
                          style={{ 
                            backgroundColor: getLeaveTypeColor(request.leaveType), 
                            color: 'white' 
                          }}
                        >
                          {getLeaveTypeText(request.leaveType)}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(parseISO(request.startDate), 'PPP', { locale: sv })} - {' '}
                        {format(parseISO(request.endDate), 'PPP', { locale: sv })}
                        {' '}({differenceInDays(parseISO(request.endDate), parseISO(request.startDate)) + 1} dagar)
                      </div>
                      {request.reason && (
                        <div className="text-sm text-muted-foreground italic">
                          "{request.reason}"
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-success border-success hover:bg-success/10"
                        onClick={() => handleApproveRequest(request.id)}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Godkänn
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-destructive border-destructive hover:bg-destructive/10"
                        onClick={() => handleDenyRequest(request.id)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Neka
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Leave Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Senaste ledighetsbegäran
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leaveRequests.length > 0 ? (
            <div className="space-y-3">
              {leaveRequests
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 10)
                .map(request => (
                  <div key={request.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span className="font-medium">{getMemberName(request.teamMemberId)}</span>
                          <Badge 
                            variant="secondary"
                            style={{ 
                              backgroundColor: getLeaveTypeColor(request.leaveType), 
                              color: 'white' 
                            }}
                          >
                            {getLeaveTypeText(request.leaveType)}
                          </Badge>
                          <Badge 
                            variant="secondary"
                            style={{ 
                              backgroundColor: getStatusColor(request.status), 
                              color: 'white' 
                            }}
                          >
                            {getStatusText(request.status)}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(parseISO(request.startDate), 'PPP', { locale: sv })} - {' '}
                          {format(parseISO(request.endDate), 'PPP', { locale: sv })}
                          {' '}({differenceInDays(parseISO(request.endDate), parseISO(request.startDate)) + 1} dagar)
                        </div>
                        {request.reason && (
                          <div className="text-sm text-muted-foreground italic">
                            "{request.reason}"
                          </div>
                        )}
                      </div>
                      {request.status === 'approved' && (
                        <CheckCircle className="w-5 h-5 text-success" />
                      )}
                      {request.status === 'denied' && (
                        <AlertCircle className="w-5 h-5 text-destructive" />
                      )}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Inga ledighetsbegäran ännu</p>
              <p className="text-sm">Skapa din första begäran för att komma igång</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}