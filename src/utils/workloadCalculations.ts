import { WorkloadMetrics, WorkloadStatus, WorkloadWarning, TeamCapacity } from '@/types/workload';
import { ConstructionTeam, TeamMember } from '@/types/team';
import { addDays, startOfWeek, endOfWeek, format, parseISO, differenceInDays } from 'date-fns';

export interface TimeEntry {
  id: string;
  teamId?: string;
  userId: string;
  projectId?: string;
  startTime: string;
  endTime?: string;
  durationHours?: number;
  sessionDate: string;
  description?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
}

const NORMAL_WEEKLY_CAPACITY = 40; // Standard work hours per week
const OVERTIME_THRESHOLD = 45; // Hours per week considered overtime
const CRITICAL_THRESHOLD = 55; // Hours per week considered critical
const MAX_CONSECUTIVE_DAYS = 10; // Maximum consecutive work days before warning

export function calculateMemberWorkload(
  member: TeamMember,
  timeEntries: TimeEntry[],
  weekStart: Date = new Date()
): WorkloadMetrics {
  const weekStartDate = startOfWeek(weekStart, { weekStartsOn: 1 });
  const weekEndDate = endOfWeek(weekStart, { weekStartsOn: 1 });

  // Filter time entries for this member in the current week
  const memberEntries = timeEntries.filter(entry => {
    const entryDate = parseISO(entry.sessionDate);
    return entry.userId === member.id && 
           entryDate >= weekStartDate && 
           entryDate <= weekEndDate;
  });

  // Calculate weekly hours
  const weeklyHours = memberEntries.reduce((total, entry) => {
    return total + (entry.durationHours || 0);
  }, 0);

  // Calculate overtime
  const overtimeHours = Math.max(0, weeklyHours - NORMAL_WEEKLY_CAPACITY);

  // Count active projects
  const activeProjects = new Set(
    memberEntries
      .filter(entry => entry.projectId)
      .map(entry => entry.projectId)
  ).size;

  // Calculate consecutive work days (simplified - would need more historical data)
  const workDaysThisWeek = new Set(
    memberEntries.map(entry => format(parseISO(entry.sessionDate), 'yyyy-MM-dd'))
  ).size;

  // Calculate travel ratio (if GPS data is available)
  const entriesWithGPS = memberEntries.filter(entry => 
    entry.gpsLatitude && entry.gpsLongitude
  );
  const travelRatio = entriesWithGPS.length > 1 ? 
    calculateTravelRatio(entriesWithGPS) : 0;

  // Determine workload status
  const overloadPercentage = (weeklyHours / NORMAL_WEEKLY_CAPACITY) * 100;
  const workloadStatus = determineWorkloadStatus(
    weeklyHours, 
    overtimeHours, 
    activeProjects, 
    workDaysThisWeek
  );

  // Simple trend calculation (would be more sophisticated with historical data)
  const trendDirection: 'increasing' | 'decreasing' | 'stable' = 
    weeklyHours > NORMAL_WEEKLY_CAPACITY ? 'increasing' : 
    weeklyHours < NORMAL_WEEKLY_CAPACITY * 0.8 ? 'decreasing' : 'stable';

  return {
    weeklyHours,
    normalCapacity: NORMAL_WEEKLY_CAPACITY,
    overloadPercentage,
    consecutiveWorkDays: workDaysThisWeek,
    activeProjects,
    travelRatio,
    overtimeHours,
    workloadStatus,
    trendDirection,
    lastCalculated: new Date().toISOString()
  };
}

function determineWorkloadStatus(
  weeklyHours: number,
  overtimeHours: number,
  activeProjects: number,
  consecutiveDays: number
): WorkloadStatus {
  if (weeklyHours >= CRITICAL_THRESHOLD || consecutiveDays >= MAX_CONSECUTIVE_DAYS) {
    return 'critical';
  }
  if (weeklyHours >= OVERTIME_THRESHOLD || activeProjects > 3 || overtimeHours > 10) {
    return 'overloaded';
  }
  if (weeklyHours >= NORMAL_WEEKLY_CAPACITY * 0.9 || activeProjects > 2) {
    return 'warning';
  }
  return 'healthy';
}

function calculateTravelRatio(entries: TimeEntry[]): number {
  if (entries.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 1; i < entries.length; i++) {
    const prev = entries[i - 1];
    const curr = entries[i];
    
    if (prev.gpsLatitude && prev.gpsLongitude && 
        curr.gpsLatitude && curr.gpsLongitude) {
      totalDistance += calculateDistance(
        prev.gpsLatitude, prev.gpsLongitude,
        curr.gpsLatitude, curr.gpsLongitude
      );
    }
  }

  // Return ratio of travel to work time (simplified)
  const totalWorkTime = entries.reduce((sum, entry) => sum + (entry.durationHours || 0), 0);
  return totalWorkTime > 0 ? (totalDistance / 100) / totalWorkTime : 0; // Normalized ratio
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export function generateWorkloadWarnings(
  team: ConstructionTeam,
  workloadMetrics: Map<string, WorkloadMetrics>
): WorkloadWarning[] {
  const warnings: WorkloadWarning[] = [];

  team.members?.forEach(member => {
    const metrics = workloadMetrics.get(member.id);
    if (!metrics) return;

    // Check for overload
    if (metrics.workloadStatus === 'critical') {
      warnings.push({
        id: `overload-${member.id}-${Date.now()}`,
        type: 'overload',
        severity: 'critical',
        message: `${member.firstName} ${member.lastName} arbetar ${metrics.weeklyHours.toFixed(1)} timmar denna vecka (${metrics.overloadPercentage.toFixed(0)}% av normal kapacitet)`,
        recommendations: [
          'Omfördela arbetsuppgifter till andra teammedlemmar',
          'Överväg att flytta mindre kritiska uppgifter till nästa vecka',
          'Kontrollera att personen får tillräcklig vila'
        ],
        affectedPerson: `${member.firstName} ${member.lastName}`,
        teamId: team.id,
        date: new Date().toISOString()
      });
    }

    // Check for consecutive days
    if (metrics.consecutiveWorkDays >= 8) {
      warnings.push({
        id: `consecutive-${member.id}-${Date.now()}`,
        type: 'consecutive_days',
        severity: metrics.consecutiveWorkDays >= 10 ? 'critical' : 'high',
        message: `${member.firstName} ${member.lastName} har arbetat ${metrics.consecutiveWorkDays} dagar i följd`,
        recommendations: [
          'Planera in vilodagar',
          'Överväg att rotera arbetsuppgifter',
          'Kontrollera att arbetstidslagen följs'
        ],
        affectedPerson: `${member.firstName} ${member.lastName}`,
        teamId: team.id,
        date: new Date().toISOString()
      });
    }

    // Check for too many projects
    if (metrics.activeProjects > 3) {
      warnings.push({
        id: `projects-${member.id}-${Date.now()}`,
        type: 'project_overload',
        severity: 'medium',
        message: `${member.firstName} ${member.lastName} arbetar på ${metrics.activeProjects} olika projekt samtidigt`,
        recommendations: [
          'Fokusera på färre projekt åt gången',
          'Överväg att sammanlägga liknande uppgifter',
          'Förbättra projektplanering och prioritering'
        ],
        affectedPerson: `${member.firstName} ${member.lastName}`,
        teamId: team.id,
        date: new Date().toISOString()
      });
    }
  });

  return warnings;
}

export function calculateTeamCapacity(
  team: ConstructionTeam,
  date: Date,
  scheduleEntries: any[] = []
): TeamCapacity {
  const totalMembers = team.members?.length || 0;
  const totalCapacity = totalMembers * 8; // 8 hours per person per day
  
  // Calculate available capacity based on schedule entries
  const daySchedule = scheduleEntries.filter(entry => 
    entry.teamId === team.id && 
    format(parseISO(entry.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
  );

  const unavailableHours = daySchedule
    .filter(entry => entry.status !== 'available')
    .reduce((sum, entry) => sum + (entry.hoursPlanned || 8), 0);

  const availableCapacity = totalCapacity - unavailableHours;
  const plannedWork = daySchedule
    .filter(entry => entry.status === 'busy')
    .reduce((sum, entry) => sum + (entry.hoursPlanned || 0), 0);

  const utilizationPercentage = totalCapacity > 0 ? 
    (plannedWork / totalCapacity) * 100 : 0;

  let status: 'underutilized' | 'optimal' | 'near_capacity' | 'overbooked';
  if (utilizationPercentage < 60) {
    status = 'underutilized';
  } else if (utilizationPercentage <= 85) {
    status = 'optimal';
  } else if (utilizationPercentage <= 100) {
    status = 'near_capacity';
  } else {
    status = 'overbooked';
  }

  return {
    teamId: team.id,
    date: format(date, 'yyyy-MM-dd'),
    totalCapacity,
    availableCapacity,
    plannedWork,
    utilizationPercentage,
    status
  };
}

export function getWorkloadColor(status: WorkloadStatus): string {
  switch (status) {
    case 'healthy': return 'hsl(var(--success))';
    case 'warning': return 'hsl(var(--warning))';
    case 'overloaded': return 'hsl(var(--accent))';
    case 'critical': return 'hsl(var(--destructive))';
    default: return 'hsl(var(--muted))';
  }
}

export function getCapacityColor(status: 'underutilized' | 'optimal' | 'near_capacity' | 'overbooked'): string {
  switch (status) {
    case 'underutilized': return 'hsl(var(--info))';
    case 'optimal': return 'hsl(var(--success))';
    case 'near_capacity': return 'hsl(var(--warning))';
    case 'overbooked': return 'hsl(var(--destructive))';
    default: return 'hsl(var(--muted))';
  }
}