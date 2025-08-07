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
}

export interface WorkPhaseItem {
  id: string;
  label: string;
  completed: boolean;
  completedAt?: string;
  comment?: string;
}

export const defaultChecklist: Omit<ChecklistItem, 'id'>[] = [
  { label: 'Order container', completed: false },
  { label: 'Book scaffolding', completed: false },
  { label: 'Order material', completed: false },
  { label: 'Schedule construction team', completed: false },
  { label: 'Notify customer', completed: false },
  { label: 'Perform pre-inspection', completed: false },
  { label: 'Upload daily photos', completed: false },
  { label: 'Upload post-inspection', completed: false },
  { label: 'Final quality control', completed: false },
  { label: 'Confirm ROT paperwork', completed: false },
  { label: 'Mark ready for invoice', completed: false },
];

export const defaultWorkPhases: Omit<WorkPhaseItem, 'id'>[] = [
  { label: 'Rivning av pannor, läkt, nockregel', completed: false },
  { label: 'Montering av ny råspont', completed: false },
  { label: 'Montering av ny nockregel samt trekantslist', completed: false },
  { label: 'Montering av ny underlagsduk', completed: false },
  { label: 'Montering av ny strö- samt bärläkt', completed: false },
  { label: 'Montering av nockband, fotplåt', completed: false },
  { label: 'Montering av nya pannor', completed: false },
  { label: 'Skrapa + måla plåt, nya vindskivebeslag samt fotplåt', completed: false },
  { label: 'Snöraskydd', completed: false },
  { label: 'Nya hängrännor och stuprör', completed: false },
];