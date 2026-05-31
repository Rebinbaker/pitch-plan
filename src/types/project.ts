export type ProjectStatus = 'planned' | 'ongoing' | 'completed' | 'invoiced' | 'ånger';
export type Region = string;
export type ROTStatus = 'Yes' | 'No';
export type StorageLocation = 'Hos kund' | 'Ställningspark' | 'I bil' | 'Montörens garage' | 'Annat';
export type PlannedAction = 
  | 'Allokeras till nästa bygge' 
  | 'Körs till Linköpingsparken' 
  | 'Transporteras till ställningspark' 
  | 'Returneras till leverantör' 
  | 'Kasseras' 
  | 'Annat';

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
  allocatedToProjectId?: string; // ID of project this material is allocated to
  allocatedToProjectName?: string; // Name of project for display
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
  responsibleBooker?: string;

  constructionTeam?: string; // Made optional since it will be set via checklist
  scaffoldingTeamId?: string; // ID of the assigned scaffolding (Ställningsmontör) team
  startDate: string; // Legacy field - keeping for backwards compatibility
  deadline: string; // Legacy field - keeping for backwards compatibility
  
  // New planning fields (optional for migration)
  bygg_start_vecka?: string; // ISO week format (e.g., "2025-W33")
  planerad_start_datum?: string; // Auto-calculated from bygg_start_vecka
  ungefärlig_arbetstid_dagar?: number; // Estimated work time in days
  första_moment_bockat_datum?: string; // Date when first work phase is completed
  beräknat_slut_datum?: string; // Calculated end date based on status
  
  // Legacy fields (deprecated but keeping for migration)
  constructionStartWeek?: string; // Deprecated - use bygg_start_vecka
  estimatedWorkDays?: number; // Deprecated - use ungefärlig_arbetstid_dagar
  actualConstructionStart?: string; // Deprecated - use första_moment_bockat_datum
  
  rotStatus: ROTStatus;
  status: ProjectStatus;
  region: Region;
  notes: string;
  checklist: ChecklistItem[];
  completionPercentage: number;
  avvaratMaterial?: AvvaratMaterial;
  assignedTrailer?: string; // ID of assigned trailer
  scaffoldingResponsible?: string; // Person responsible for scaffolding
  scaffoldingBooked?: boolean; // True when trailer is assigned and responsible person is set
  workPhases?: WorkPhaseItem[];
  activityLog?: ActivityLogEntry[];
  allocatedMaterials?: AllocatedMaterial[]; // Materials allocated from other projects
  materialOrder?: MaterialOrder; // Material order created by project manager
  accommodationBooking?: AccommodationBooking; // Hotel/lodging booking for the construction team
}

export interface AccommodationBooking {
  name: string;
  checkInDate: string; // ISO date (YYYY-MM-DD)
  nights: number;
  bookedAt?: string; // ISO timestamp
  address?: string;
  latitude?: number;
  longitude?: number;
  distanceKm?: number;
  travelMinutes?: number;
  distanceEstimated?: boolean; // true if Haversine fallback was used
}

// Returns the calculated check-out date for an accommodation booking
export const getAccommodationCheckOutDate = (booking: AccommodationBooking): Date => {
  const d = new Date(booking.checkInDate);
  d.setDate(d.getDate() + (booking.nights || 0));
  return d;
};

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  completedAt?: string;
  weight: number; // Percentage weight for progress calculation
  whatsappConfirmed?: boolean; // Flag to track WhatsApp group confirmation
  containerConfirmed?: boolean; // Flag to track container booking confirmation (hemtag)
  containerOrderConfirmed?: boolean; // Flag to track container order confirmation (boka)
  accommodationConfirmed?: boolean; // Flag to track that accommodation has been booked
  scaffoldingStatus?: 'on_the_way' | 'on_site_unbuilt' | 'built_ready'; // Scaffolding arrival/build status
  scaffoldingArrivalDate?: string; // Expected arrival date (ISO yyyy-mm-dd) when status is 'on_the_way'
  welcomeCallNotes?: string; // Notes from the welcome call with the customer
  welcomeCallAt?: string; // ISO timestamp of when welcome call notes were last saved
}

export interface WorkPhaseItem {
  id: string;
  label: string;
  completed: boolean;
  completedAt?: string;
  comment?: string;
  weight: number; // Percentage weight for progress calculation
  estimatedDays: number; // Estimated days to complete this phase
  requiresDailyInspection?: boolean; // If this phase requires daily self-inspection
  imagesReceived?: boolean; // If project leader has confirmed receiving images
  inspectionConfirmed?: boolean; // True when completed AND imagesReceived (for phases requiring inspection)
  lastReminderSent?: string; // Date when last reminder was sent
}

export const defaultChecklist: Omit<ChecklistItem, 'id'>[] = [
  { label: 'Välkomstsamtal', completed: false, weight: 2 },
  { label: 'Containerbeställning', completed: false, weight: 5 },
  { label: 'Ställningshantering', completed: false, weight: 5 },
  { label: 'Schedule construction team', completed: false, weight: 2 },
  { label: 'Boka boende', completed: false, weight: 2 },
  { label: 'Skapa WhatsApp grupp', completed: false, weight: 1 },
  { label: 'Materialbeställning', completed: false, weight: 5 },
  { label: 'Dagliga egenkontroller', completed: false, weight: 5 },
  { label: 'Boka hemtag av container', completed: false, weight: 3 },
  { label: 'Nedmontering av ställningar', completed: false, weight: 4 },
  { label: 'Slutsynbesiktning', completed: false, weight: 3 },
  { label: 'Avvarat material?', completed: false, weight: 2 },
  { label: 'Generera garantibevis', completed: false, weight: 3 },
  { label: 'Mark ready for invoice', completed: false, weight: 5 },
];

export const defaultWorkPhases: Omit<WorkPhaseItem, 'id'>[] = [
  { label: 'Rivning av pannor, läkt, nockregel', completed: false, weight: 10, estimatedDays: 1, requiresDailyInspection: true },
  { label: 'Montering av ny råspont', completed: false, weight: 10, estimatedDays: 1, requiresDailyInspection: true },
  { label: 'Montering av nockregel + trekantslist', completed: false, weight: 5, estimatedDays: 0.5, requiresDailyInspection: true },
  { label: 'Montering av underlagsduk', completed: false, weight: 5, estimatedDays: 0.5, requiresDailyInspection: true },
  { label: 'Montering av strö- & bärläkt', completed: false, weight: 5, estimatedDays: 0.5, requiresDailyInspection: true },
  { label: 'Montering av nockband, fotplåt', completed: false, weight: 5, estimatedDays: 0.5, requiresDailyInspection: true },
  { label: 'Montering av nya pannor', completed: false, weight: 15, estimatedDays: 1.5, requiresDailyInspection: true },
  { label: 'Skrapa & måla plåt, nya beslag', completed: false, weight: 5, estimatedDays: 0.5, requiresDailyInspection: true },
  { label: 'Montering av snörasskydd', completed: false, weight: 5, estimatedDays: 0.5, requiresDailyInspection: true },
  { label: 'Hängrännor & stuprör', completed: false, weight: 5, estimatedDays: 0.5, requiresDailyInspection: true },
  { label: 'Bortforsling och städning', completed: false, weight: 5, estimatedDays: 0.5, requiresDailyInspection: true },
];

export interface MaterialOrderItem {
  id: string;
  materialType: MaterialType | string; // Allow custom material names
  customMaterialType?: string; // For "Annat" option
  quantity: number;
  unit: string; // kvm², st, meter
  notes?: string;
  supplier?: string;
  supplierName?: string;
  unitPrice?: number;
  totalPrice?: number;
  estimatedCost?: number;
  color?: string; // Color selection for materials
}

export type MaterialOrderStatus = 'draft' | 'pending_review' | 'ready_to_order' | 'ordered' | 'delivered';

export interface MaterialOrder {
  id: string;
  projectId: string;
  projectAddress: string;
  createdBy: string; // Project manager who created the order
  createdByName: string; // Display name of who created the order
  createdAt: string;
  updatedAt: string;
  status: MaterialOrderStatus;
  items: MaterialOrderItem[];
  notes?: string;
  orderText?: string; // Generated email text
  appliedSalvagedMaterial?: MaterialItem[]; // Materials that were deducted from salvaged inventory
}

export interface AllocatedMaterial {
  id: string;
  sourceProjectId: string;
  sourceProjectName: string;
  materials: MaterialItem[];
  allocatedAt: string;
  allocatedBy: string;
  notes?: string;
}

// Helper function to check if all work phases are confirmed (completed + inspections confirmed)
export const areAllWorkPhasesConfirmed = (workPhases: WorkPhaseItem[]): boolean => {
  if (!workPhases || workPhases.length === 0) return false;
  
  return workPhases.every(phase => {
    if (!phase.completed) return false;
    if (phase.requiresDailyInspection && !phase.inspectionConfirmed) return false;
    return true;
  });
};