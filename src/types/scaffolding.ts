export type ScaffoldingStatus = 'Available' | 'In use' | 'Being moved';

export interface ScaffoldingTrailer {
  id: string;
  name: string;
  status: ScaffoldingStatus;
  assignedProject?: string;
  location?: string;
  moverNote?: string;
  lastUpdated: string;
}