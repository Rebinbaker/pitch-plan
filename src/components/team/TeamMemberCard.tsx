import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  User, Crown, Clock, AlertTriangle, TrendingUp, 
  Phone, Mail, Edit, CheckCircle, XCircle, Trash2, Wallet, KeyRound
} from 'lucide-react';
import { TeamMember, ConstructionTeam } from '@/types/team';
import { WorkloadMetrics } from '@/types/workload';
import { getWorkloadColor } from '@/utils/workloadCalculations';
import { AddTeamMemberModal } from './AddTeamMemberModal';
import { CreateWorkerLoginModal } from './CreateWorkerLoginModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface TeamMemberCardProps {
  member: TeamMember;
  workloadMetrics?: WorkloadMetrics;
  isLeader?: boolean;
  team: ConstructionTeam;
  onUpdateTeam: (team: ConstructionTeam) => void;
}

export function TeamMemberCard({ 
  member, 
  workloadMetrics, 
  isLeader, 
  team,
  onUpdateTeam 
}: TeamMemberCardProps) {
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getWorkloadStatusText = (status: string) => {
    switch (status) {
      case 'healthy': return 'Hälsosam belastning';
      case 'warning': return 'Varning - hög belastning';
      case 'overloaded': return 'Överbelastad';
      case 'critical': return 'Kritisk belastning';
      default: return 'Okänd status';
    }
  };

  const getWorkloadStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'overloaded': return <XCircle className="w-4 h-4 text-accent" />;
      case 'critical': return <XCircle className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const handleDeleteMember = () => {
    const updatedMembers = (team.members || []).filter(m => m.id !== member.id);
    onUpdateTeam({
      ...team,
      members: updatedMembers,
    });
  };

  return (
    <Card className="shadow-card hover:shadow-hover transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(member.firstName, member.lastName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {member.firstName} {member.lastName}
                {isLeader && <Crown className="w-4 h-4 text-warning" />}
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                {member.position || 'Teammedlem'}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <AddTeamMemberModal
              team={team}
              onUpdateTeam={onUpdateTeam}
              editingMember={member}
              trigger={
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4" />
                </Button>
              }
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Ta bort {member.firstName} {member.lastName}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Är du säker på att du vill ta bort denna medlem från teamet? Detta kan inte ångras.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Radera medlem
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Workload Status */}
        {workloadMetrics && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getWorkloadStatusIcon(workloadMetrics.workloadStatus)}
                <span className="text-sm font-medium">
                  {getWorkloadStatusText(workloadMetrics.workloadStatus)}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                {workloadMetrics.weeklyHours.toFixed(1)}h/vecka
              </span>
            </div>
            
            <Progress 
              value={workloadMetrics.overloadPercentage} 
              className="h-2"
              style={{
                '--progress-background': getWorkloadColor(workloadMetrics.workloadStatus)
              } as any}
            />
            
            <div className="text-xs text-muted-foreground">
              {workloadMetrics.overloadPercentage.toFixed(0)}% av normal kapacitet
            </div>
          </div>
        )}

        {/* Quick Stats */}
        {workloadMetrics && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 p-2 rounded">
              <div className="text-xs text-muted-foreground">Övertid</div>
              <div className="font-medium">
                {workloadMetrics.overtimeHours.toFixed(1)}h
              </div>
            </div>
            <div className="bg-muted/50 p-2 rounded">
              <div className="text-xs text-muted-foreground">Aktiva projekt</div>
              <div className="font-medium">{workloadMetrics.activeProjects}</div>
            </div>
          </div>
        )}

        {/* Contact Info */}
        {(member.email || member.phone) && (
          <div className="space-y-1">
            {member.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">{member.email}</span>
              </div>
            )}
            {member.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">{member.phone}</span>
              </div>
            )}
          </div>
        )}

        {/* Hourly rate */}
        <div className="flex items-center gap-2 text-sm">
          <Wallet className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            Timlön: {member.hourly_rate ? `${member.hourly_rate} kr/h` : 'Ej satt'}
          </span>
        </div>

        {/* Worker login */}
        <div className="pt-2 border-t">
          <CreateWorkerLoginModal
            team={team}
            member={member}
            onCreated={() => onUpdateTeam({ ...team })}
            trigger={
              <Button variant={member.user_id ? 'outline' : 'default'} size="sm" className="w-full">
                <KeyRound className="w-4 h-4 mr-2" />
                {member.user_id
                  ? `Inlogg klart${member.login_email ? ` (${member.login_email})` : ''}`
                  : team.type === 'Ställningsmontör'
                    ? 'Skapa inlogg för ställningsmontör'
                    : team.type === 'Säljare'
                      ? 'Skapa inlogg för säljare'
                      : 'Skapa inlogg för byggare'}
              </Button>
            }
          />
        </div>

        {/* Skills */}
        {member.skills && member.skills.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Färdigheter</div>
            <div className="flex flex-wrap gap-1">
              {member.skills.slice(0, 3).map((skill, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {member.skills.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{member.skills.length - 3} till
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Trend Indicator */}
        {workloadMetrics && (
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className={`w-4 h-4 ${
              workloadMetrics.trendDirection === 'increasing' ? 'text-warning' : 
              workloadMetrics.trendDirection === 'decreasing' ? 'text-success' : 
              'text-muted-foreground'
            }`} />
            <span className="text-muted-foreground">
              Trend: {
                workloadMetrics.trendDirection === 'increasing' ? 'Ökande belastning' :
                workloadMetrics.trendDirection === 'decreasing' ? 'Minskande belastning' :
                'Stabil belastning'
              }
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}