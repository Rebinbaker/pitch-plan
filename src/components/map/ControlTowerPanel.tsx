import { Project } from '@/types/project';
import { ProjectRisk } from '@/utils/riskAnalysis';
import { AlertTriangle, Activity, TrendingUp, Target, Brain, MapPin, Users } from 'lucide-react';

interface ControlTowerPanelProps {
  projects: Project[];
  risks: ProjectRisk[];
  highRiskCount: number;
  warningCount: number;
  avgProgress: number;
}

export function ControlTowerPanel({ projects, risks, highRiskCount, warningCount, avgProgress }: ControlTowerPanelProps) {
  const activeProjects = projects.filter(p => p.status === 'ongoing').length;
  const totalProjects = projects.length;

  const highRiskProjects = risks.filter(r => r.level === 'high');
  const warningProjects = risks.filter(r => r.level === 'warning');

  return (
    <div className="space-y-3">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard icon={<MapPin className="h-4 w-4" />} label="Totalt" value={totalProjects} color="text-primary" />
        <StatCard icon={<Activity className="h-4 w-4" />} label="Aktiva" value={activeProjects} color="text-ongoing" />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Hög risk"
          value={highRiskCount}
          color="text-destructive"
          pulse={highRiskCount > 0}
        />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Snitt progress" value={`${avgProgress}%`} color="text-completed" />
      </div>

      {/* Risk Projects */}
      {highRiskProjects.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-destructive flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Hög risk
          </h4>
          {highRiskProjects.map(r => (
            <RiskItem key={r.project.id} risk={r} />
          ))}
        </div>
      )}

      {warningProjects.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-warning flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Varningar
          </h4>
          {warningProjects.slice(0, 3).map(r => (
            <RiskItem key={r.project.id} risk={r} />
          ))}
        </div>
      )}

      {/* Smart Insights Placeholder */}
      <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3">
        <h4 className="text-xs font-semibold text-primary flex items-center gap-1.5 mb-2">
          <Brain className="h-3.5 w-3.5" /> Smarta insikter
        </h4>
        <div className="space-y-1.5">
          {highRiskCount > 0 && (
            <InsightRow text={`${highRiskCount} projekt har hög risk`} type="risk" />
          )}
          {warningCount > 0 && (
            <InsightRow text={`${warningCount} projekt har varningar`} type="warning" />
          )}
          {avgProgress > 0 && avgProgress < 40 && (
            <InsightRow text="Generellt låg progress — överväg resursökning" type="info" />
          )}
          {highRiskCount === 0 && warningCount === 0 && (
            <InsightRow text="Alla projekt på rätt spår ✓" type="success" />
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, pulse }: { icon: React.ReactNode; label: string; value: number | string; color: string; pulse?: boolean }) {
  return (
    <div className={`rounded-lg border bg-card p-2.5 transition-all hover:shadow-card ${pulse ? 'animate-pulse' : ''}`}>
      <div className="flex items-center gap-1.5">
        <span className={color}>{icon}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <div className={`text-lg font-bold mt-0.5 ${color}`}>{value}</div>
    </div>
  );
}

function RiskItem({ risk }: { risk: ProjectRisk }) {
  return (
    <div className="rounded-md border bg-card/80 p-2 text-xs">
      <div className="font-medium text-foreground truncate">{risk.project.customerName}</div>
      <div className="text-muted-foreground truncate">{risk.project.address}</div>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-muted-foreground">{risk.progress}%</span>
        <div className="flex-1 bg-muted rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full transition-all"
            style={{
              width: `${risk.progress}%`,
              backgroundColor: risk.level === 'high' ? 'hsl(var(--destructive))' : 'hsl(var(--warning))',
            }}
          />
        </div>
      </div>
      {risk.reasons.map((reason, i) => (
        <div key={i} className="text-[10px] text-destructive/80 mt-0.5">• {reason}</div>
      ))}
    </div>
  );
}

function InsightRow({ text, type }: { text: string; type: 'risk' | 'warning' | 'info' | 'success' }) {
  const colors = {
    risk: 'text-destructive',
    warning: 'text-warning',
    info: 'text-info',
    success: 'text-completed',
  };
  return (
    <div className={`text-xs ${colors[type]} flex items-start gap-1`}>
      <span className="mt-0.5">→</span>
      <span>{text}</span>
    </div>
  );
}
