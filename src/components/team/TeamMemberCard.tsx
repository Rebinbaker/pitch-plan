import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  User, Crown, Clock, AlertTriangle, TrendingUp, 
  Phone, Mail, Edit, CheckCircle, XCircle 
} from 'lucide-react';
import { TeamMember } from '@/types/team';
import { WorkloadMetrics } from '@/types/workload';
import { getWorkloadColor } from '@/utils/workloadCalculations';

interface TeamMemberCardProps {
  member: TeamMember;
  workloadMetrics?: WorkloadMetrics;
  isLeader?: boolean;
  onUpdateMember: (member: TeamMember) => void;
}

export function TeamMemberCard({ 
  member, 
  workloadMetrics, 
  isLeader, 
  onUpdateMember 
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
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onUpdateMember(member)}
          >
            <Edit className="w-4 h-4" />
          </Button>
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