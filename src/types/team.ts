export type TeamType = 'Internal' | 'Subcontractor';
export type AvailabilityStatus = 'Available' | 'Busy' | 'Limited';

export interface ConstructionTeam {
  id: string;
  name: string;
  type: TeamType;
  currentJob?: string;
  availabilityNextWeek: AvailabilityStatus;
  performanceNotes?: string;
  contactInfo?: string;
  skills: string[];
}