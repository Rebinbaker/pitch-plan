export type TeamType = 'Internt' | 'Underentreprenör' | 'Säljare';
export type AvailabilityStatus = 'Tillgänglig' | 'Upptagen' | 'Begränsad';

export interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  skills: string[];
}

export interface Seller {
  id: string;
  firstName: string;
  lastName: string;
  region: 'Stockholm' | 'Västra Götaland';
}

export interface ConstructionTeam {
  id: string;
  name: string;
  type: TeamType;
  currentJob?: string;
  availabilityNextWeek: AvailabilityStatus;
  performanceNotes?: string;
  contactInfo?: string;
  skills: string[];
  members?: TeamMember[];
  sellers?: Seller[]; // Sellers assigned to this team
}