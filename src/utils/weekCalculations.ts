import { addDays, addWeeks, format, getISOWeek, startOfWeek } from 'date-fns';

export function weekNumberToDate(weekString: string, year: number = new Date().getFullYear()): string {
  // Parse week string like "v31" or "31"
  const weekNumber = parseInt(weekString.replace(/[^0-9]/g, ''), 10);

  if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 53) {
    throw new Error('Invalid week number');
  }

  // ISO week 1 is the week containing Jan 4th, starting on Monday
  const jan4 = new Date(year, 0, 4);
  const mondayOfWeek1 = startOfWeek(jan4, { weekStartsOn: 1 });
  const targetDate = addWeeks(mondayOfWeek1, weekNumber - 1);

  return format(targetDate, 'yyyy-MM-dd');
}

export function calculateDeadlineFromWorkDays(startDate: string, workDays: number): string {
  const start = new Date(startDate);
  const deadline = addDays(start, workDays - 1); // -1 because if we work 1 day, deadline is the same day

  return format(deadline, 'yyyy-MM-dd');
}

export function getCurrentWeekString(): string {
  const weekNumber = getISOWeek(new Date());
  return `v${weekNumber}`;
}