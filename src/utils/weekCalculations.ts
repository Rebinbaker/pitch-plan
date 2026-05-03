import { addDays, addWeeks, format, getISOWeek, startOfWeek } from 'date-fns';

export function weekNumberToDate(weekString: string, year: number = new Date().getFullYear()): string {
  // Accept formats like "v31", "31", "W31", "2026-W31", "2026-W202611"
  let parsedYear = year;
  let weekPart = weekString;

  // Match "YYYY-Wxx" or similar — extract trailing week number after last "W"
  const isoMatch = weekString.match(/^(\d{4})-W(\d+)$/i);
  if (isoMatch) {
    parsedYear = parseInt(isoMatch[1], 10);
    let weekNum = parseInt(isoMatch[2], 10);
    // Handle malformed values like "202611" by taking the last 1-2 digits as week
    if (weekNum > 53) {
      const tail = isoMatch[2].slice(-2);
      weekNum = parseInt(tail, 10);
    }
    weekPart = String(weekNum);
  }

  const weekNumber = parseInt(weekPart.replace(/[^0-9]/g, ''), 10);

  if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 53) {
    throw new Error('Invalid week number');
  }

  year = parsedYear;

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