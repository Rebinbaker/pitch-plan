export interface TimeEntry {
  id: string;
  user_id: string;
  project_id?: string;
  team_id?: string;
  start_time: string;
  end_time?: string;
  duration_hours?: number;
  work_phase_name?: string;
  description?: string;
  entry_type: string;
  is_billable: boolean;
  hourly_rate?: number;
  created_at: string;
  updated_at: string;
}

export interface WorkSession {
  id: string;
  user_id: string;
  project_id?: string;
  team_id?: string;
  session_date: string;
  total_hours: number;
  break_hours: number;
  overtime_hours: number;
  notes?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_at?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TimeReport {
  id: string;
  user_id: string;
  report_type: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  total_hours: number;
  billable_hours: number;
  total_cost?: number;
  project_ids?: string[];
  team_ids?: string[];
  report_data?: any;
  generated_at: string;
  created_at: string;
}

export interface TimeTrackingStats {
  totalHoursToday: number;
  totalHoursThisWeek: number;
  totalHoursThisMonth: number;
  averageHoursPerDay: number;
  billableHoursThisWeek: number;
  currentSessionTime?: number;
  isTimerRunning: boolean;
}