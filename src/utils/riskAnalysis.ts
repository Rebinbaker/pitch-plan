import { Project, WorkPhaseItem } from '@/types/project';
import { calculateRemainingTime } from '@/utils/timeCalculations';

export type RiskLevel = 'delayed' | 'high' | 'warning' | 'normal';

export interface ProjectRisk {
  project: Project;
  level: RiskLevel;
  reasons: string[];
  progress: number;
  remainingDays: number;
  totalDays: number;
  daysDelayed: number; // How many days past the expected end date
}

/**
 * Core delay logic:
 * DELAYED if: current date > (planned start + expected duration) AND progress < 100%
 * HIGH RISK if: progress < 50% AND less than 2 days remaining
 * WARNING if: progress is unusually slow relative to elapsed time
 */
export function analyzeProjectRisk(project: Project): ProjectRisk {
  const workPhases = project.workPhases || [];
  const completedPhases = workPhases.filter(p => p.completed).length;
  const progress = workPhases.length > 0 ? Math.round((completedPhases / workPhases.length) * 100) : 0;

  const timeEstimate = calculateRemainingTime(project);
  const remainingDays = timeEstimate.workersRemainingDays;
  const totalDays = timeEstimate.totalWorkDays;

  const reasons: string[] = [];
  let level: RiskLevel = 'normal';
  let daysDelayed = 0;

  // Skip completed/invoiced/ånger projects
  if (project.status === 'completed' || project.status === 'invoiced' || project.status === 'ånger') {
    return { project, level: 'normal', reasons: [], progress, remainingDays, totalDays, daysDelayed: 0 };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate expected end date from planned start + estimated duration
  const plannedStartStr = project.planerad_start_datum || project.startDate;
  const estimatedDuration = project.ungefärlig_arbetstid_dagar || project.estimatedWorkDays || 7;

  if (plannedStartStr) {
    const plannedStart = new Date(plannedStartStr);
    plannedStart.setHours(0, 0, 0, 0);

    const expectedEnd = new Date(plannedStart);
    expectedEnd.setDate(expectedEnd.getDate() + estimatedDuration - 1);

    // DELAYED: current date > expected end AND not 100% done
    if (today > expectedEnd && progress < 100) {
      daysDelayed = Math.ceil((today.getTime() - expectedEnd.getTime()) / (1000 * 60 * 60 * 24));
      level = 'delayed';
      reasons.push(`${daysDelayed} dag${daysDelayed !== 1 ? 'ar' : ''} försenad`);
    }
  }

  // If already started (ongoing) — check progress vs elapsed time
  if (project.status === 'ongoing' && level !== 'delayed') {
    const actualStartStr = project.första_moment_bockat_datum || project.actualConstructionStart || plannedStartStr;
    if (actualStartStr) {
      const startDate = new Date(actualStartStr);
      startDate.setHours(0, 0, 0, 0);
      const elapsedDays = Math.max(1, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

      // Expected progress based on elapsed time
      const expectedProgress = Math.min(100, Math.round((elapsedDays / estimatedDuration) * 100));

      // HIGH RISK: Progress < 50% AND less than 2 days remaining on estimate
      const daysLeft = Math.max(0, estimatedDuration - elapsedDays);
      if (progress < 50 && daysLeft <= 2) {
        level = 'high';
        reasons.push('Låg progress + nära deadline');
      }

      // WARNING: Progress is < 60% of expected progress (significantly behind)
      if (level === 'normal' && progress < expectedProgress * 0.6 && elapsedDays >= 2) {
        level = 'warning';
        reasons.push(`Ovanligt långsam progress (${progress}% vs förväntade ${expectedProgress}%)`);
      }

      // WARNING: Exceeded planned duration but some progress
      if (level === 'normal' && elapsedDays > estimatedDuration && progress < 100) {
        level = 'warning';
        reasons.push(`Överskridna planerade dagar (${elapsedDays}/${estimatedDuration})`);
      }
    }
  }

  // For planned projects — check if planned start has passed without starting
  if (project.status === 'planned' && plannedStartStr) {
    const plannedStart = new Date(plannedStartStr);
    plannedStart.setHours(0, 0, 0, 0);

    if (today > plannedStart && level !== 'delayed') {
      const daysPastStart = Math.ceil((today.getTime() - plannedStart.getTime()) / (1000 * 60 * 60 * 24));
      if (daysPastStart > 3) {
        // Only flag as delayed if significantly past start, not just a few days
        const expectedEnd = new Date(plannedStart);
        expectedEnd.setDate(expectedEnd.getDate() + estimatedDuration - 1);
        if (today > expectedEnd) {
          daysDelayed = Math.ceil((today.getTime() - expectedEnd.getTime()) / (1000 * 60 * 60 * 24));
          level = 'delayed';
          reasons.push(`Ej påbörjad, ${daysDelayed} dag${daysDelayed !== 1 ? 'ar' : ''} efter planerat slut`);
        } else {
          level = 'warning';
          reasons.push(`${daysPastStart} dagar sedan planerad start men ej påbörjad`);
        }
      }
    }
  }

  return { project, level, reasons, progress, remainingDays, totalDays, daysDelayed };
}

export function analyzeAllProjects(projects: Project[]): {
  risks: ProjectRisk[];
  highRiskCount: number;
  warningCount: number;
  delayedCount: number;
  avgProgress: number;
} {
  const risks = projects.map(analyzeProjectRisk);
  const highRiskCount = risks.filter(r => r.level === 'high').length;
  const warningCount = risks.filter(r => r.level === 'warning').length;
  const delayedCount = risks.filter(r => r.level === 'delayed').length;

  const ongoingProjects = projects.filter(p => p.status === 'ongoing');
  const avgProgress = ongoingProjects.length > 0
    ? Math.round(ongoingProjects.reduce((sum, p) => {
        const phases = p.workPhases || [];
        const completed = phases.filter(ph => ph.completed).length;
        return sum + (phases.length > 0 ? (completed / phases.length) * 100 : 0);
      }, 0) / ongoingProjects.length)
    : 0;

  return { risks, highRiskCount, warningCount, delayedCount, avgProgress };
}
