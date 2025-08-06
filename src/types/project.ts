export type ProjectStatus = 'planned' | 'ongoing' | 'completed' | 'invoiced';
export type Region = 'Stockholm' | 'Västra Götaland';
export type ROTStatus = 'Yes' | 'No';

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