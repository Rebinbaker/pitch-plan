export type ScaffoldingStatus = 'Tillgänglig' | 'I bruk' | 'Under transport';

export interface ScaffoldingTrailer {
  id: string;
  name: string;
  status: ScaffoldingStatus;
  assignedProject?: string;
  location?: string;
  moverNote?: string;
  lastUpdated: string;
}