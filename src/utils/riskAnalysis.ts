import { Project, WorkPhaseItem } from '@/types/project';
import { calculateRemainingTime } from '@/utils/timeCalculations';

export type RiskLevel = 'high' | 'warning' | 'normal';

export interface ProjectRisk {
  project: Project;
  level: RiskLevel;
  reasons: string[];
  progress: number;
  remainingDays: number;
  totalDays: number;
}

export function analyzeProjectRisk(project: Project): ProjectRisk {
  const workPhases = project.workPhases || [];
  const completedPhases = workPhases.filter(p => p.completed).length;
  const progress = workPhases.length > 0 ? Math.round((completedPhases / workPhases.length) * 100) : 0;

  const timeEstimate = calculateRemainingTime(project);
  const remainingDays = timeEstimate.workersRemainingDays;
  const totalDays = timeEstimate.totalWorkDays;

  const reasons: string[] = [];
  let level: RiskLevel = 'normal';

  // Only analyze ongoing projects
  if (project.status !== 'ongoing') {
    return { project, level: 'normal', reasons: [], progress, remainingDays, totalDays };
  }

  // HIGH RISK: Progress < 50% AND less than 2 days remaining
  if (progress < 50 && remainingDays <= 2 && remainingDays > 0) {
    level = 'high';
    reasons.push('Låg progress + nära deadline');
  }

  // WARNING: Duration exceeds planned (estimated > 7 days and slow progress)
  if (totalDays > 0) {
    const expectedProgress = totalDays > 0 ? ((totalDays - remainingDays) / totalDays) * 100 : 0;
    
    if (totalDays > 7 && progress < expectedProgress * 0.6) {
      if (level !== 'high') level = 'warning';
      reasons.push('Ovanligt långsam progress');
    }

    // WARNING: Exceeded estimated duration
    if (project.ungefärlig_arbetstid_dagar && project.första_moment_bockat_datum) {
      const startDate = new Date(project.första_moment_bockat_datum);
      const today = new Date();
      const elapsedDays = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (elapsedDays > project.ungefärlig_arbetstid_dagar) {
        if (level !== 'high') level = 'warning';
        reasons.push(`Överskridna planerade dagar (${elapsedDays}/${project.ungefärlig_arbetstid_dagar})`);
      }
    }
  }

  return { project, level, reasons, progress, remainingDays, totalDays };
}

export function analyzeAllProjects(projects: Project[]): {
  risks: ProjectRisk[];
  highRiskCount: number;
  warningCount: number;
  avgProgress: number;
} {
  const risks = projects.map(analyzeProjectRisk);
  const highRiskCount = risks.filter(r => r.level === 'high').length;
  const warningCount = risks.filter(r => r.level === 'warning').length;
  
  const ongoingProjects = projects.filter(p => p.status === 'ongoing');
  const avgProgress = ongoingProjects.length > 0
    ? Math.round(ongoingProjects.reduce((sum, p) => {
        const phases = p.workPhases || [];
        const completed = phases.filter(ph => ph.completed).length;
        return sum + (phases.length > 0 ? (completed / phases.length) * 100 : 0);
      }, 0) / ongoingProjects.length)
    : 0;

  return { risks, highRiskCount, warningCount, avgProgress };
}
