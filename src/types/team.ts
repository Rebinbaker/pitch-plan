export type TeamType = 'Internt' | 'Underentreprenör' | 'Säljare' | 'Ställningsmontör' | 'Chef';

export const CHEF_DEPARTMENTS = [
  'Produktionscontroller',
  'Byggledare',
  'Ställningschef',
  'Containeransvarig',
  'Tak',
  'Ställning',
  'Försäljning',
  'Logistik',
  'Material',
  'Ekonomi',
  'Projektledning'
] as const;
export type AvailabilityStatus = 'Tillgänglig' | 'Upptagen' | 'Begränsad';

export interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  skills: string[];
  position?: string;
  email?: string;
  phone?: string;
  hourly_rate?: number;
  monthly_salary?: number;
  calculated_hourly_rate?: number;
  overtime_hourly_rate?: number;
  user_id?: string;
  login_email?: string;
}

export interface Seller {
  id: string;
  firstName: string;
  lastName: string;
  region: string;
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
  leader?: string;
}