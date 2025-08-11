import { addDays, startOfYear, addWeeks, format } from 'date-fns';

export function weekNumberToDate(weekString: string, year: number = new Date().getFullYear()): string {
  // Parse week string like "v31" or "31"
  const weekNumber = parseInt(weekString.replace(/[^0-9]/g, ''));
  
  if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 53) {
    throw new Error('Invalid week number');
  }

  // Get the start of the year
  const yearStart = startOfYear(new Date(year, 0, 1));
  
  // Add weeks to get to the specified week (week 1 starts on Monday)
  // Week 1 is the first week with at least 4 days in the new year
  const targetDate = addWeeks(yearStart, weekNumber - 1);
  
  return format(targetDate, 'yyyy-MM-dd');
}

export function calculateDeadlineFromWorkDays(startDate: string, workDays: number): string {
  const start = new Date(startDate);
  const deadline = addDays(start, workDays - 1); // -1 because if we work 1 day, deadline is the same day
  
  return format(deadline, 'yyyy-MM-dd');
}

export function getCurrentWeekString(): string {
  const now = new Date();
  const yearStart = startOfYear(now);
  const daysDiff = Math.floor((now.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24));
  const weekNumber = Math.ceil((daysDiff + 1) / 7);
  
  return `v${weekNumber}`;
}