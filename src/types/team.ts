export type TeamType = 'Internt' | 'Underentreprenör';
export type AvailabilityStatus = 'Tillgänglig' | 'Upptagen' | 'Begränsad';

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