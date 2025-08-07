import { Project, WorkPhaseItem } from '@/types/project';

export interface TimeEstimate {
  workersRemainingDays: number;
  scaffoldingRemainingDays: number;
  totalWorkDays: number;
  totalScaffoldingDays: number;
}

export function calculateRemainingTime(project: Project): TimeEstimate {
  const workPhases = project.workPhases || [];
  
  // Calculate total estimated days for workers (all work phases)
  const totalWorkDays = workPhases.reduce((sum, phase) => sum + phase.estimatedDays, 0);
  
  // Scaffolding needs extra 0.5 days for dismantling after work is done
  const totalScaffoldingDays = totalWorkDays + 0.5;
  
  // Calculate completed days
  const completedWorkDays = workPhases
    .filter(phase => phase.completed)
    .reduce((sum, phase) => sum + phase.estimatedDays, 0);
  
  // Calculate remaining days
  const workersRemainingDays = Math.max(0, totalWorkDays - completedWorkDays);
  const scaffoldingRemainingDays = Math.max(0, totalScaffoldingDays - completedWorkDays);
  
  return {
    workersRemainingDays,
    scaffoldingRemainingDays,
    totalWorkDays,
    totalScaffoldingDays
  };
}

export function formatDaysRemaining(days: number): string {
  if (days === 0) return 'Klar';
  if (days === 0.5) return '0,5 dag kvar';
  if (days === 1) return '1 dag kvar';
  if (days < 1) return `${days.toString().replace('.', ',')} dag kvar`;
  return `${days.toString().replace('.', ',')} dagar kvar`;
}