import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, TrendingDown, Minus, AlertTriangle, 
  Clock, Users, BarChart3, Activity 
} from 'lucide-react';
import { ConstructionTeam } from '@/types/team';
import { WorkloadMetrics, WorkloadWarning } from '@/types/workload';
import { getWorkloadColor } from '@/utils/workloadCalculations';

interface WorkloadTrendChartProps {
  team: ConstructionTeam;
  workloadMetrics: Map<string, WorkloadMetrics>;
  warnings: WorkloadWarning[];
}

export function WorkloadTrendChart({ 
  team, 
  workloadMetrics, 
  warnings 
}: WorkloadTrendChartProps) {
  const getMemberName = (memberId: string) => {
    const member = team.members?.find(m => m.id === memberId);
    return member ? `${member.firstName} ${member.lastName}` : 'Okänd medlem';
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'increasing': return <TrendingUp className="w-4 h-4 text-warning" />;
      case 'decreasing': return <TrendingDown className="w-4 h-4 text-success" />;
      default: return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTrendText = (direction: string) => {
    switch (direction) {
      case 'increasing': return 'Ökande';
      case 'decreasing': return 'Minskande';
      default: return 'Stabil';
    }
  };

  const getWorkloadStatusText = (status: string) => {
    switch (status) {
      case 'healthy': return 'Hälsosam';
      case 'warning': return 'Varning';
      case 'overloaded': return 'Överbelastad';
      case 'critical': return 'Kritisk';
      default: return 'Okänd';
    }
  };

  // Calculate team averages
  const metricsArray = Array.from(workloadMetrics.values());
  const avgWeeklyHours = metricsArray.length > 0 
    ? metricsArray.reduce((sum, m) => sum + m.weeklyHours, 0) / metricsArray.length 
    : 0;
  const avgOverloadPercentage = metricsArray.length > 0 
    ? metricsArray.reduce((sum, m) => sum + m.overloadPercentage, 0) / metricsArray.length 
    : 0;
  const totalOvertimeHours = metricsArray.reduce((sum, m) => sum + m.overtimeHours, 0);

  // Count status distribution
  const statusCounts = {
    healthy: metricsArray.filter(m => m.workloadStatus === 'healthy').length,
    warning: metricsArray.filter(m => m.workloadStatus === 'warning').length,
    overloaded: metricsArray.filter(m => m.workloadStatus === 'overloaded').length,
    critical: metricsArray.filter(m => m.workloadStatus === 'critical').length
  };

  const criticalWarnings = warnings.filter(w => w.severity === 'critical');
  const highWarnings = warnings.filter(w => w.severity === 'high');

  return (
    <div className="space-y-6">
      {/* Team Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Genomsnittlig arbetstid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgWeeklyHours.toFixed(1)}h</div>
            <div className="text-sm text-muted-foreground">per vecka</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Genomsnittlig belastning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgOverloadPercentage.toFixed(0)}%</div>
            <div className="text-sm text-muted-foreground">av normal kapacitet</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Total övertid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{totalOvertimeHours.toFixed(1)}h</div>
            <div className="text-sm text-muted-foreground">denna vecka</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Aktiva varningar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{warnings.length}</div>
            <div className="text-sm text-muted-foreground">
              {criticalWarnings.length} kritiska
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Belastningsfördelning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-success/10 rounded-lg">
              <div className="text-2xl font-bold text-success">{statusCounts.healthy}</div>
              <div className="text-sm text-muted-foreground">Hälsosam</div>
            </div>
            <div className="text-center p-3 bg-warning/10 rounded-lg">
              <div className="text-2xl font-bold text-warning">{statusCounts.warning}</div>
              <div className="text-sm text-muted-foreground">Varning</div>
            </div>
            <div className="text-center p-3 bg-accent/10 rounded-lg">
              <div className="text-2xl font-bold text-accent">{statusCounts.overloaded}</div>
              <div className="text-sm text-muted-foreground">Överbelastad</div>
            </div>
            <div className="text-center p-3 bg-destructive/10 rounded-lg">
              <div className="text-2xl font-bold text-destructive">{statusCounts.critical}</div>
              <div className="text-sm text-muted-foreground">Kritisk</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Member Workload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Individuell belastning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {team.members?.map(member => {
              const metrics = workloadMetrics.get(member.id);
              if (!metrics) return null;

              return (
                <div key={member.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium">
                          {member.firstName} {member.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {member.position || 'Teammedlem'}
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        style={{
                          backgroundColor: getWorkloadColor(metrics.workloadStatus),
                          color: 'white'
                        }}
                      >
                        {getWorkloadStatusText(metrics.workloadStatus)}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        {getTrendIcon(metrics.trendDirection)}
                        {getTrendText(metrics.trendDirection)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{metrics.weeklyHours.toFixed(1)}h</div>
                      <div className="text-sm text-muted-foreground">denna vecka</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Belastning</span>
                      <span>{metrics.overloadPercentage.toFixed(0)}%</span>
                    </div>
                    <Progress
                      value={Math.min(metrics.overloadPercentage, 150)}
                      className="h-2"
                      style={{
                        '--progress-background': getWorkloadColor(metrics.workloadStatus)
                      } as any}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-3">
                    <div className="text-center">
                      <div className="text-sm font-medium">{metrics.overtimeHours.toFixed(1)}h</div>
                      <div className="text-xs text-muted-foreground">Övertid</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium">{metrics.activeProjects}</div>
                      <div className="text-xs text-muted-foreground">Projekt</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium">{metrics.consecutiveWorkDays}</div>
                      <div className="text-xs text-muted-foreground">Arbetsdagar</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Critical Warnings Detail */}
      {criticalWarnings.length > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Kritiska varningar som kräver omedelbar åtgärd
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {criticalWarnings.map(warning => (
                <div key={warning.id} className="p-4 bg-background rounded-lg border">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium text-destructive">
                        {warning.affectedPerson}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {warning.message}
                      </div>
                    </div>
                    <Badge variant="destructive" className="text-xs">
                      {warning.severity.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="mt-3">
                    <div className="text-sm font-medium mb-1">Rekommenderade åtgärder:</div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {warning.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-destructive">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Rekommendationer för teamoptimering</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {avgOverloadPercentage > 120 && (
              <div className="flex items-start gap-3 p-3 bg-warning/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
                <div>
                  <div className="font-medium">Hög genomsnittlig belastning</div>
                  <div className="text-sm text-muted-foreground">
                    Teamet arbetar {avgOverloadPercentage.toFixed(0)}% av normal kapacitet. 
                    Överväg att omfördela arbetsuppgifter eller anställa fler medarbetare.
                  </div>
                </div>
              </div>
            )}
            
            {totalOvertimeHours > 20 && (
              <div className="flex items-start gap-3 p-3 bg-accent/10 rounded-lg">
                <Clock className="w-5 h-5 text-accent mt-0.5" />
                <div>
                  <div className="font-medium">Hög total övertid</div>
                  <div className="text-sm text-muted-foreground">
                    Teamet har arbetat {totalOvertimeHours.toFixed(1)} övertidstimmar denna vecka. 
                    Kontrollera att arbetstidslagen följs och planera för återhämtning.
                  </div>
                </div>
              </div>
            )}

            {statusCounts.critical > 0 && (
              <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                <div>
                  <div className="font-medium">Kritisk belastning upptäckt</div>
                  <div className="text-sm text-muted-foreground">
                    {statusCounts.critical} teammedlem(mar) har kritisk belastning. 
                    Omedelbar åtgärd krävs för att förhindra utbrändhet och säkerställa kvalitet.
                  </div>
                </div>
              </div>
            )}

            {metricsArray.length > 0 && avgOverloadPercentage <= 100 && totalOvertimeHours <= 10 && statusCounts.critical === 0 && (
              <div className="flex items-start gap-3 p-3 bg-success/10 rounded-lg">
                <Users className="w-5 h-5 text-success mt-0.5" />
                <div>
                  <div className="font-medium">Teamet mår bra</div>
                  <div className="text-sm text-muted-foreground">
                    Belastningen är inom hälsosamma gränser. Fortsätt med den nuvarande planeringen 
                    och övervaka regelbundet för att upprätthålla balansen.
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}