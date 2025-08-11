import { Project, WorkPhaseItem } from '@/types/project';
import { format, startOfWeek, addDays, addWeeks } from 'date-fns';

/**
 * Converts ISO week string to the first Monday of that week
 * @param weekString - ISO week format (e.g., "2025-W33")
 * @returns Date object for the Monday of that week
 */
export function weekStringToDate(weekString: string): Date {
  const [yearStr, weekStr] = weekString.split('-W');
  const year = parseInt(yearStr);
  const week = parseInt(weekStr);
  
  if (isNaN(year) || isNaN(week) || week < 1 || week > 53) {
    throw new Error(`Invalid week string: ${weekString}`);
  }
  
  // Get January 4th of the year (which is always in week 1)
  const jan4 = new Date(year, 0, 4);
  
  // Find the Monday of week 1
  const mondayOfWeek1 = startOfWeek(jan4, { weekStartsOn: 1 });
  
  // Add weeks to get to the target week
  return addWeeks(mondayOfWeek1, week - 1);
}

/**
 * Converts a date to ISO week string
 * @param date - Date to convert
 * @returns ISO week string (e.g., "2025-W33")
 */
export function dateToWeekString(date: Date): string {
  // Find the Thursday of the same week (ISO week belongs to year containing Thursday)
  const thursday = addDays(startOfWeek(date, { weekStartsOn: 1 }), 3);
  const year = thursday.getFullYear();
  
  // Get January 4th of the year (which is always in week 1)
  const jan4 = new Date(year, 0, 4);
  const mondayOfWeek1 = startOfWeek(jan4, { weekStartsOn: 1 });
  
  // Calculate week number
  const weekNumber = Math.floor((date.getTime() - mondayOfWeek1.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}

/**
 * Calculates the planned start date from ISO week
 * @param weekString - ISO week string (e.g., "2025-W33")
 * @returns Date string in YYYY-MM-DD format
 */
export function calculatePlannedStartDate(weekString: string): string {
  const startDate = weekStringToDate(weekString);
  return format(startDate, 'yyyy-MM-dd');
}

/**
 * Calculates the estimated end date based on project status
 * @param project - Project object
 * @returns Date string in YYYY-MM-DD format
 */
export function calculateBeraknatSlutDatum(project: Project): string {
  if (project.status === 'ongoing' && project.första_moment_bockat_datum) {
    // Calculate based on actual work phase progress
    return calculateEndDateFromProgress(project);
  } else {
    // Calculate from planned start date + estimated work days
    const plannedStartStr = project.planerad_start_datum || project.startDate;
    const plannedStart = new Date(plannedStartStr);
    
    // Validate the date
    if (isNaN(plannedStart.getTime())) {
      console.warn('Invalid plannedStart date:', plannedStartStr, 'using current date as fallback');
      const fallbackStart = new Date();
      const endDate = addDays(fallbackStart, (project.ungefärlig_arbetstid_dagar || 7) - 1);
      return format(endDate, 'yyyy-MM-dd');
    }
    
    const workDays = project.ungefärlig_arbetstid_dagar || 7;
    const endDate = addDays(plannedStart, workDays - 1);
    return format(endDate, 'yyyy-MM-dd');
  }
}

/**
 * Calculates end date based on actual work phase progress
 * @param project - Project object
 * @returns Date string in YYYY-MM-DD format
 */
function calculateEndDateFromProgress(project: Project): string {
  if (!project.workPhases || !project.första_moment_bockat_datum) {
    // Fallback to planned calculation
    const plannedStart = new Date(project.planerad_start_datum);
    const endDate = addDays(plannedStart, project.ungefärlig_arbetstid_dagar - 1);
    return format(endDate, 'yyyy-MM-dd');
  }
  
  const startDate = new Date(project.första_moment_bockat_datum);
  const today = new Date();
  const daysSinceStart = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Calculate completion percentage from work phases
  const totalWeight = project.workPhases.reduce((sum, phase) => sum + phase.weight, 0);
  const completedWeight = project.workPhases
    .filter(phase => phase.completed)
    .reduce((sum, phase) => sum + phase.weight, 0);
  
  const completionPercentage = totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 0;
  
  if (completionPercentage === 0) {
    // No progress yet, use planned duration
    const endDate = addDays(startDate, project.ungefärlig_arbetstid_dagar - 1);
    return format(endDate, 'yyyy-MM-dd');
  }
  
  // Calculate daily progress rate
  const dailyProgressRate = completionPercentage / daysSinceStart;
  
  if (dailyProgressRate <= 0) {
    // No progress, use original planned end date
    const endDate = addDays(startDate, project.ungefärlig_arbetstid_dagar - 1);
    return format(endDate, 'yyyy-MM-dd');
  }
  
  // Calculate remaining days needed
  const remainingPercentage = 100 - completionPercentage;
  const remainingDays = Math.ceil(remainingPercentage / dailyProgressRate);
  
  const endDate = addDays(today, remainingDays);
  return format(endDate, 'yyyy-MM-dd');
}

/**
 * Checks if a project should be in "Starting This Week" category
 * @param project - Project object
 * @param weekStart - Start of the week being viewed
 * @param weekEnd - End of the week being viewed
 * @returns boolean
 */
export function isStartingThisWeek(project: Project, weekStart: Date, weekEnd: Date): boolean {
  if (project.status !== 'planned') return false;
  
  // Use planerad_start_datum if available, otherwise fallback to startDate
  const plannedStartStr = project.planerad_start_datum || project.startDate;
  const plannedStart = new Date(plannedStartStr);
  
  // Validate date
  if (isNaN(plannedStart.getTime())) {
    console.warn('Invalid planned start date for project', project.name, ':', plannedStartStr);
    return false;
  }
  
  const isInWeek = plannedStart >= weekStart && plannedStart <= weekEnd;
  
  return isInWeek;
}

/**
 * Checks if a project should be in "Ongoing Projects" category
 * @param project - Project object
 * @param today - Current date
 * @returns boolean
 */
export function isOngoingProject(project: Project, today: Date): boolean {
  if (project.status !== 'ongoing') return false;
  
  const calculatedEnd = new Date(project.beräknat_slut_datum);
  return today <= calculatedEnd;
}

/**
 * Checks if a project should be in "Due This Week" category
 * @param project - Project object
 * @param weekStart - Start of the week being viewed
 * @param weekEnd - End of the week being viewed
 * @returns boolean
 */
export function isDueThisWeek(project: Project, weekStart: Date, weekEnd: Date): boolean {
  // Use beräknat_slut_datum if available, otherwise fallback to deadline
  const calculatedEndStr = project.beräknat_slut_datum || project.deadline;
  const calculatedEnd = new Date(calculatedEndStr);
  
  // Validate date
  if (isNaN(calculatedEnd.getTime())) {
    console.warn('Invalid calculated end date for project', project.name, ':', calculatedEndStr);
    return false;
  }
  
  const isDue = calculatedEnd >= weekStart && calculatedEnd <= weekEnd;
  
  // This applies to BOTH planned projects with deadline this week AND ongoing projects calculated to finish this week
  return isDue;
}

/**
 * Checks if a project has a delayed start (planned start passed without first phase completion)
 * @param project - Project object
 * @param today - Current date
 * @returns boolean
 */
export function hasDelayedStart(project: Project, today: Date): boolean {
  if (project.status !== 'planned') return false;
  if (project.första_moment_bockat_datum) return false; // Already started
  
  const plannedStart = new Date(project.planerad_start_datum);
  return today > plannedStart;
}

/**
 * Checks if an ongoing project is behind schedule
 * @param project - Project object
 * @param weekEnd - End of current week
 * @returns boolean
 */
export function isBehindSchedule(project: Project, weekEnd: Date): boolean {
  if (project.status !== 'ongoing') return false;
  
  const calculatedEnd = new Date(project.beräknat_slut_datum);
  return calculatedEnd > weekEnd;
}

/**
 * Migrates legacy project data to new planning structure
 * @param project - Project with legacy fields
 * @returns Project with new planning fields populated
 */
export function migrateProjectToNewPlanning(project: Project): Project {
  let migratedProject = { ...project };
  
  // Migrate bygg_start_vecka from constructionStartWeek or startDate
  if (!migratedProject.bygg_start_vecka) {
    if (migratedProject.constructionStartWeek) {
      // Convert "v33" format to "2025-W33" format
      const weekNum = migratedProject.constructionStartWeek.replace(/[^0-9]/g, '');
      const currentYear = new Date().getFullYear();
      migratedProject.bygg_start_vecka = `${currentYear}-W${weekNum.padStart(2, '0')}`;
    } else {
      // Use startDate to calculate week
      const startDate = new Date(migratedProject.startDate);
      migratedProject.bygg_start_vecka = dateToWeekString(startDate);
    }
  }
  
  // Calculate planerad_start_datum from bygg_start_vecka
  if (!migratedProject.planerad_start_datum) {
    try {
      migratedProject.planerad_start_datum = calculatePlannedStartDate(migratedProject.bygg_start_vecka);
    } catch (e) {
      // Fallback to startDate if week calculation fails
      migratedProject.planerad_start_datum = migratedProject.startDate;
    }
  }
  
  // Migrate ungefärlig_arbetstid_dagar from estimatedWorkDays or calculate
  if (!migratedProject.ungefärlig_arbetstid_dagar) {
    if (migratedProject.estimatedWorkDays) {
      migratedProject.ungefärlig_arbetstid_dagar = migratedProject.estimatedWorkDays;
    } else {
      // Calculate from startDate to deadline
      const start = new Date(migratedProject.startDate);
      const end = new Date(migratedProject.deadline);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      migratedProject.ungefärlig_arbetstid_dagar = Math.max(1, days);
    }
  }
  
  // Migrate första_moment_bockat_datum from actualConstructionStart
  if (!migratedProject.första_moment_bockat_datum && migratedProject.actualConstructionStart) {
    migratedProject.första_moment_bockat_datum = migratedProject.actualConstructionStart;
  }
  
  // Calculate beräknat_slut_datum
  if (!migratedProject.beräknat_slut_datum) {
    migratedProject.beräknat_slut_datum = calculateBeraknatSlutDatum(migratedProject);
  }
  
  return migratedProject;
}