export type ScaffoldingStatus = 'Tillgänglig' | 'I bruk' | 'Under transport';
export type ScaffoldingOwnership = 'Inhyrda ställningar' | 'Egna ställningar';

export interface ScaffoldingTrailer {
  id: string;
  name: string;
  status: ScaffoldingStatus;
  ownership: ScaffoldingOwnership;
  assignedProject?: string;
  location?: string;
  moverNote?: string;
  lastUpdated: string;
  description?: string; // Optional description field
}