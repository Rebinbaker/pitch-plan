export type ProjectStatus = 'planned' | 'ongoing' | 'completed' | 'invoiced';
export type Region = 'Stockholm' | 'Västra Götaland';
export type ROTStatus = 'Yes' | 'No';
export type StorageLocation = 'Hos kund' | 'Ställningspark' | 'I bil' | 'Montörens garage' | 'Annat';
export type PlannedAction = 'Användas i framtida projekt' | 'Transporteras till ställningspark' | 'Returneras till leverantör' | 'Kasseras' | 'Annat';

export interface AvvaratMaterial {
  hasLeftoverMaterial: boolean;
  materialDescription?: string; // Free text for material type and quantity
  storageLocation?: StorageLocation;
  customStorageLocation?: string; // For "Annat" option
  dateNoted?: string;
  responsiblePerson?: string;
  plannedAction?: PlannedAction;
  customPlannedAction?: string; // For "Annat" option
  comments?: string;
}

export interface Project {
  id: string;
  name: string;
  address: string;
  customerName: string;
  customerPhone: string;
  responsibleSeller: string;
  constructionTeam: string;
  startDate: string;
  deadline: string;
  rotStatus: ROTStatus;
  status: ProjectStatus;
  region: Region;
  notes: string;
  checklist: ChecklistItem[];
  completionPercentage: number;
  avvaratMaterial?: AvvaratMaterial;
  assignedTrailer?: string; // ID of assigned trailer
  workPhases?: WorkPhaseItem[];
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  completedAt?: string;
  weight: number; // Percentage weight for progress calculation
}

export interface WorkPhaseItem {
  id: string;
  label: string;
  completed: boolean;
  completedAt?: string;
  comment?: string;
  weight: number; // Percentage weight for progress calculation
}

export const defaultChecklist: Omit<ChecklistItem, 'id'>[] = [
  { label: 'Containerbeställning', completed: false, weight: 5 },
  { label: 'Ställningshantering', completed: false, weight: 5 },
  { label: 'Schedule construction team', completed: false, weight: 2 },
  { label: 'Materialkontroll', completed: false, weight: 5 },
  { label: 'Notify customer', completed: false, weight: 1 },
  { label: 'Perform pre-inspection', completed: false, weight: 1 },
  { label: 'Dagliga bilder & kommentarer', completed: false, weight: 2 },
  { label: 'Upload post-inspection', completed: false, weight: 1 },
  { label: 'Slutsynbesiktning', completed: false, weight: 3 },
  { label: 'Confirm ROT paperwork', completed: false, weight: 1 },
  { label: 'Mark ready for invoice', completed: false, weight: 1 },
];

export const defaultWorkPhases: Omit<WorkPhaseItem, 'id'>[] = [
  { label: 'Rivning av pannor, läkt, nockregel', completed: false, weight: 10 },
  { label: 'Montering av ny råspont', completed: false, weight: 10 },
  { label: 'Montering av nockregel + trekantslist', completed: false, weight: 5 },
  { label: 'Montering av underlagsduk', completed: false, weight: 5 },
  { label: 'Montering av strö- & bärläkt', completed: false, weight: 5 },
  { label: 'Montering av nockband, fotplåt', completed: false, weight: 5 },
  { label: 'Montering av nya pannor', completed: false, weight: 15 },
  { label: 'Skrapa & måla plåt, nya beslag', completed: false, weight: 5 },
  { label: 'Montering av snörasskydd', completed: false, weight: 5 },
  { label: 'Hängrännor & stuprör', completed: false, weight: 5 },
  { label: 'Bortforsling och städning', completed: false, weight: 5 },
];