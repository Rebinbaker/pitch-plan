import { Project } from '@/types/project';
import { differenceInDays, parseISO, addDays } from 'date-fns';

export interface ProjectNotification {
  id: string;
  projectId: string;
  projectName: string;
  type: 'early_completion' | 'delay_warning';
  message: string;
  daysEarly?: number;
  daysLate?: number;
  createdAt: string;
  read: boolean;
}

export function checkProjectTimelineNotifications(project: Project): ProjectNotification | null {
  if (!project.actualConstructionStart || !project.estimatedWorkDays) {
    return null;
  }

  const actualStart = parseISO(project.actualConstructionStart);
  const estimatedEndDate = addDays(actualStart, project.estimatedWorkDays);
  const currentDate = new Date();

  // Only check for completed projects
  if (project.status === 'completed') {
    const workPhases = project.workPhases || [];
    const lastCompletedPhase = workPhases
      .filter(phase => phase.completed && phase.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())[0];

    if (lastCompletedPhase && lastCompletedPhase.completedAt) {
      const actualEndDate = parseISO(lastCompletedPhase.completedAt);
      const daysDifference = differenceInDays(actualEndDate, estimatedEndDate);

      if (daysDifference < 0) {
        // Project completed early
        const daysEarly = Math.abs(daysDifference);
        return {
          id: `notification-${project.id}-early-${Date.now()}`,
          projectId: project.id,
          projectName: project.name,
          type: 'early_completion',
          message: `Projekt "${project.name}" blev klart ${daysEarly} dag${daysEarly > 1 ? 'ar' : ''} tidigare än planerat!`,
          daysEarly,
          createdAt: new Date().toISOString(),
          read: false,
        };
      } else if (daysDifference > 0) {
        // Project completed late
        return {
          id: `notification-${project.id}-delay-${Date.now()}`,
          projectId: project.id,
          projectName: project.name,
          type: 'delay_warning',
          message: `Projekt "${project.name}" blev ${daysDifference} dag${daysDifference > 1 ? 'ar' : ''} försenat gentemot utlovad arbetstid.`,
          daysLate: daysDifference,
          createdAt: new Date().toISOString(),
          read: false,
        };
      }
    }
  }

  // Check for ongoing projects that are overdue
  if (project.status === 'ongoing') {
    const daysPastEstimate = differenceInDays(currentDate, estimatedEndDate);
    if (daysPastEstimate > 0) {
      return {
        id: `notification-${project.id}-overdue-${Date.now()}`,
        projectId: project.id,
        projectName: project.name,
        type: 'delay_warning',
        message: `Projekt "${project.name}" har gått över sin ungefärliga arbetstid med ${daysPastEstimate} dag${daysPastEstimate > 1 ? 'ar' : ''}.`,
        daysLate: daysPastEstimate,
        createdAt: new Date().toISOString(),
        read: false,
      };
    }
  }

  return null;
}

export function setActualConstructionStart(project: Project): Project | null {
  if (project.actualConstructionStart) {
    return null; // Already set
  }

  const firstChecklistItem = project.checklist?.[0];
  if (firstChecklistItem?.completed && firstChecklistItem.completedAt) {
    return {
      ...project,
      actualConstructionStart: firstChecklistItem.completedAt,
    };
  }

  return null;
}