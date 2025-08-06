export type ProjectStatus = 'planned' | 'ongoing' | 'completed' | 'invoiced';
export type Region = 'Stockholm' | 'Västra Götaland';
export type ROTStatus = 'Yes' | 'No';
export type MaterialType = 'Takpannor' | 'Underlagspapp' | 'Nockpannor' | 'Råspont' | 'Vindskivor' | 'Reglar' | 'Övrigt';
export type StorageLocation = 'Lundavägen 20' | 'Nålvägen Gusum';

export interface AvvaratMaterial {
  isReserved: boolean;
  materialType?: MaterialType;
  storageLocation?: StorageLocation;
  dateOfReservation?: string;
  responsiblePerson?: string;
  quantity?: string;
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
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  completedAt?: string;
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