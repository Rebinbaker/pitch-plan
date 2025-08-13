export interface WorkloadMetrics {
  weeklyHours: number;
  normalCapacity: number;
  overloadPercentage: number;
  consecutiveWorkDays: number;
  activeProjects: number;
  travelRatio: number;
  overtimeHours: number;
  workloadStatus: WorkloadStatus;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  lastCalculated: string;
}

export type WorkloadStatus = 'healthy' | 'warning' | 'overloaded' | 'critical';

export interface WorkloadWarning {
  id: string;
  type: 'overload' | 'consecutive_days' | 'overtime' | 'travel_fatigue' | 'project_overload';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommendations: string[];
  affectedPerson: string;
  teamId: string;
  date: string;
}

export interface TeamScheduleEntry {
  id: string;
  teamId: string;
  teamMemberId: string;
  date: string;
  status: 'available' | 'on_leave' | 'sick' | 'vacation' | 'busy';
  hoursPlanned: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRequest {
  id: string;
  teamId: string;
  teamMemberId: string;
  userId: string;
  requestedBy: string;
  startDate: string;
  endDate: string;
  leaveType: 'vacation' | 'sick' | 'personal' | 'parental';
  reason?: string;
  status: 'pending' | 'approved' | 'denied';
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamCapacity {
  teamId: string;
  date: string;
  totalCapacity: number;
  availableCapacity: number;
  plannedWork: number;
  utilizationPercentage: number;
  status: 'underutilized' | 'optimal' | 'near_capacity' | 'overbooked';
}