import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Users, Clock, AlertTriangle, Calendar, TrendingUp, 
  MapPin, Phone, Star, Shield, UserCheck 
} from 'lucide-react';
import { ConstructionTeam } from '@/types/team';
import { WorkloadMetrics, WorkloadWarning } from '@/types/workload';
import { calculateMemberWorkload, generateWorkloadWarnings, getWorkloadColor } from '@/utils/workloadCalculations';
import { TeamMemberCard } from './TeamMemberCard';
import { TeamScheduleView } from './TeamScheduleView';
import { LeaveManagement } from './LeaveManagement';
import { WorkloadTrendChart } from './WorkloadTrendChart';

interface TeamDetailModalProps {
  team: ConstructionTeam;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateTeam: (team: ConstructionTeam) => void;
  timeEntries?: any[];
}

export function TeamDetailModal({ 
  team, 
  open, 
  onOpenChange, 
  onUpdateTeam,
  timeEntries = []
}: TeamDetailModalProps) {
  const [workloadMetrics, setWorkloadMetrics] = useState<Map<string, WorkloadMetrics>>(new Map());
  const [warnings, setWarnings] = useState<WorkloadWarning[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && team.members) {
      calculateTeamWorkload();
    }
  }, [open, team, timeEntries]);

  const calculateTeamWorkload = async () => {
    setLoading(true);
    try {
      const metrics = new Map<string, WorkloadMetrics>();
      
      // Calculate workload for each team member
      team.members?.forEach(member => {
        const memberMetrics = calculateMemberWorkload(member, timeEntries);
        metrics.set(member.id, memberMetrics);
      });

      setWorkloadMetrics(metrics);
      
      // Generate warnings based on workload
      const teamWarnings = generateWorkloadWarnings(team, metrics);
      setWarnings(teamWarnings);
    } catch (error) {
      console.error('Error calculating workload:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTeamAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'Tillgänglig': return 'hsl(var(--success))';
      case 'Begränsad': return 'hsl(var(--warning))';
      case 'Upptagen': return 'hsl(var(--destructive))';
      default: return 'hsl(var(--muted))';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Internt': return 'hsl(var(--primary))';
      case 'Underentreprenör': return 'hsl(var(--accent))';
      case 'Säljare': return 'hsl(var(--success))';
      default: return 'hsl(var(--muted))';
    }
  };

  const criticalWarnings = warnings.filter(w => w.severity === 'critical');
  const highWarnings = warnings.filter(w => w.severity === 'high');
  const totalWarnings = warnings.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl flex items-center gap-3">
              <Users className="w-6 h-6" />
              {team.name}
            </DialogTitle>
            <div className="flex gap-2">
              <Badge 
                variant="secondary" 
                style={{ backgroundColor: getTypeColor(team.type), color: 'white' }}
              >
                {team.type}
              </Badge>
              <Badge 
                variant="secondary"
                style={{ backgroundColor: getTeamAvailabilityColor(team.availabilityNextWeek), color: 'white' }}
              >
                {team.availabilityNextWeek}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="overview" className="h-full flex flex-col">
            <TabsList className="grid grid-cols-5 w-full flex-shrink-0">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Översikt
              </TabsTrigger>
              <TabsTrigger value="members" className="flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                Medlemmar
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Schema
              </TabsTrigger>
              <TabsTrigger value="workload" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Belastning
              </TabsTrigger>
              <TabsTrigger value="leave" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Ledighet
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto mt-4">
              <TabsContent value="overview" className="space-y-6">
                {/* Team Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Teamstorlek
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-primary">
                        {team.members?.length || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">medlemmar</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Varningar
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-destructive">
                        {totalWarnings}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {criticalWarnings.length} kritiska, {highWarnings.length} höga
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        Teamledare
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-medium">
                        {team.leader || 'Ej tilldelad'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {team.leader ? 'Utsedd ledare' : 'Ingen ledare tilldelad'}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Current Job & Contact */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {team.currentJob && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MapPin className="w-5 h-5" />
                          Nuvarande uppdrag
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-lg font-medium">{team.currentJob}</div>
                      </CardContent>
                    </Card>
                  )}

                  {team.contactInfo && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Phone className="w-5 h-5" />
                          Kontaktinformation
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-lg">{team.contactInfo}</div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Performance Notes */}
                {team.performanceNotes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="w-5 h-5" />
                        Prestationsanteckningar
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{team.performanceNotes}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Skills */}
                {team.skills && team.skills.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Teamfärdigheter</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {team.skills.map((skill, index) => (
                          <Badge key={index} variant="outline">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Critical Warnings */}
                {criticalWarnings.length > 0 && (
                  <Card className="border-destructive bg-destructive/5">
                    <CardHeader>
                      <CardTitle className="text-destructive flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Kritiska varningar
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {criticalWarnings.map(warning => (
                          <div key={warning.id} className="p-3 bg-background rounded-lg border">
                            <div className="font-medium text-destructive mb-1">
                              {warning.message}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Rekommendationer:
                            </div>
                            <ul className="text-sm text-muted-foreground list-disc list-inside">
                              {warning.recommendations.map((rec, index) => (
                                <li key={index}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="members" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {team.members?.map(member => (
                    <TeamMemberCard
                      key={member.id}
                      member={member}
                      workloadMetrics={workloadMetrics.get(member.id)}
                      isLeader={team.leader === `${member.firstName} ${member.lastName}`}
                      onUpdateMember={(updatedMember) => {
                        const updatedMembers = team.members?.map(m => 
                          m.id === updatedMember.id ? updatedMember : m
                        );
                        onUpdateTeam({ ...team, members: updatedMembers });
                      }}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="schedule">
                <TeamScheduleView 
                  team={team}
                  onUpdateSchedule={() => calculateTeamWorkload()}
                />
              </TabsContent>

              <TabsContent value="workload">
                <WorkloadTrendChart 
                  team={team}
                  workloadMetrics={workloadMetrics}
                  warnings={warnings}
                />
              </TabsContent>

              <TabsContent value="leave">
                <LeaveManagement 
                  team={team}
                  onLeaveRequestUpdate={() => calculateTeamWorkload()}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}