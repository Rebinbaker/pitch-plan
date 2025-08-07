export type ProjectStatus = 'planned' | 'ongoing' | 'completed' | 'invoiced';
export type Region = 'Stockholm' | 'Västra Götaland';
export type ROTStatus = 'Yes' | 'No';
export type StorageLocation = 'Hos kund' | 'Ställningspark' | 'I bil' | 'Montörens garage' | 'Annat';
export type PlannedAction = 'Användas i framtida projekt' | 'Transporteras till ställningspark' | 'Returneras till leverantör' | 'Kasseras' | 'Annat';

export type MaterialType = 'Takpannor' | 'Underlagsduk' | 'Läkt' | 'Plåtdetaljer' | 'Isolering' | 'Annat';

export const getMaterialUnit = (materialType: MaterialType): string => {
  switch (materialType) {
    case 'Takpannor':
      return 'st';
    case 'Läkt':
      return 'meter';
    default:
      return 'kvm²';
  }
};

export interface MaterialItem {
  id: string;
  materialType: MaterialType;
  customMaterialType?: string; // For "Annat" option
  squareMeters: number; // This will represent different units based on material type
}

export interface AvvaratMaterial {
  hasLeftoverMaterial: boolean;
  materials?: MaterialItem[];
  storageLocation?: StorageLocation;
  customStorageLocation?: string; // For "Annat" option
  dateNoted?: string;
  responsiblePerson?: string;
  plannedAction?: PlannedAction;
  customPlannedAction?: string; // For "Annat" option
  comments?: string;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string; // ISO string
  user: string; // User who performed the action
  action: string; // Brief action description
  description: string; // Detailed description
  category: 'checklist' | 'workphase' | 'status' | 'general' | 'material' | 'assignment';
  oldValue?: string; // Previous value (for changes)
  newValue?: string; // New value (for changes)
  metadata?: Record<string, any>; // Additional context
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
  scaffoldingResponsible?: string; // Person responsible for scaffolding
  workPhases?: WorkPhaseItem[];
  activityLog?: ActivityLogEntry[];
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
  estimatedDays: number; // Estimated days to complete this phase
}

export const defaultChecklist: Omit<ChecklistItem, 'id'>[] = [
  { label: 'Containerbeställning', completed: false, weight: 5 },
  { label: 'Ställningshantering', completed: false, weight: 5 },
  { label: 'Materialbeställning', completed: false, weight: 5 },
  { label: 'Schedule construction team', completed: false, weight: 2 },
  { label: 'Skapa WhatsApp grupp', completed: false, weight: 1 },
  { label: 'Dagliga egenkontroller', completed: false, weight: 5 },
  { label: 'Bokad hemtag av container', completed: false, weight: 3 },
  { label: 'Nedmontering av ställningar', completed: false, weight: 4 },
  { label: 'Slutsynbesiktning', completed: false, weight: 3 },
  { label: 'Avvarat material?', completed: false, weight: 2 },
  { label: 'Mark ready for invoice', completed: false, weight: 5 },
];

export const defaultWorkPhases: Omit<WorkPhaseItem, 'id'>[] = [
  { label: 'Rivning av pannor, läkt, nockregel', completed: false, weight: 10, estimatedDays: 1 },
  { label: 'Montering av ny råspont', completed: false, weight: 10, estimatedDays: 1 },
  { label: 'Montering av nockregel + trekantslist', completed: false, weight: 5, estimatedDays: 0.5 },
  { label: 'Montering av underlagsduk', completed: false, weight: 5, estimatedDays: 0.5 },
  { label: 'Montering av strö- & bärläkt', completed: false, weight: 5, estimatedDays: 0.5 },
  { label: 'Montering av nockband, fotplåt', completed: false, weight: 5, estimatedDays: 0.5 },
  { label: 'Montering av nya pannor', completed: false, weight: 15, estimatedDays: 1.5 },
  { label: 'Skrapa & måla plåt, nya beslag', completed: false, weight: 5, estimatedDays: 0.5 },
  { label: 'Montering av snörasskydd', completed: false, weight: 5, estimatedDays: 0.5 },
  { label: 'Hängrännor & stuprör', completed: false, weight: 5, estimatedDays: 0.5 },
  { label: 'Bortforsling och städning', completed: false, weight: 5, estimatedDays: 0.5 },
];