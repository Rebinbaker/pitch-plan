import { Project, defaultChecklist, defaultWorkPhases, ActivityLogEntry } from '@/types/project';

// Generate checklist with IDs
const generateChecklist = () => 
  defaultChecklist.map((item, index) => ({
    ...item,
    id: `checklist-${index + 1}`,
  }));

// Generate work phases with IDs - includes all 10 work phases
const generateWorkPhases = (completedCount = 0) => 
  defaultWorkPhases.map((item, index) => ({
    ...item,
    id: `workphase-${index + 1}`,
    completed: index < completedCount,
    completedAt: index < completedCount ? '2024-01-14' : undefined,
    imagesReceived: false, // Initialize as not received
    inspectionConfirmed: false, // Initialize as not confirmed
  }));

// Generate sample activity log entries
const generateActivityLog = (projectId: string, completedTasks: number): ActivityLogEntry[] => {
  const baseDate = new Date('2025-08-01');
  const entries: ActivityLogEntry[] = [];
  
  // Project creation
  entries.push({
    id: `activity-${projectId}-1`,
    timestamp: new Date(baseDate.getTime() + 0 * 24 * 60 * 60 * 1000).toISOString(),
    user: 'Anna Lindberg',
    action: 'Projekt skapat',
    description: 'Nytt takprojekt registrerat i systemet',
    category: 'general',
  });

  // Initial planning activities
  if (completedTasks > 0) {
    entries.push({
      id: `activity-${projectId}-2`,
      timestamp: new Date(baseDate.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      user: 'Marcus Holm',
      action: 'Containerbeställning genomförd',
      description: 'Container beställd för avfall och material',
      category: 'checklist',
      oldValue: 'Ej klar',
      newValue: 'Klar',
    });
  }

  if (completedTasks > 1) {
    entries.push({
      id: `activity-${projectId}-3`,
      timestamp: new Date(baseDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      user: 'Erik Andersson',
      action: 'Ställning konfigurerad',
      description: 'Ställningshantering planerad och genomförd',
      category: 'checklist',
      oldValue: 'Ej klar',
      newValue: 'Klar',
    });
  }

  if (completedTasks > 2) {
    entries.push({
      id: `activity-${projectId}-4`,
      timestamp: new Date(baseDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      user: 'Anna Lindberg',
      action: 'Projektstatus ändrad',
      description: 'Projekt övergick från planerad till pågående',
      category: 'status',
      oldValue: 'Planerad',
      newValue: 'Pågående',
    });
  }

  if (completedTasks > 3) {
    entries.push({
      id: `activity-${projectId}-5`,
      timestamp: new Date(baseDate.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      user: 'Team Alpha',
      action: 'Rivning påbörjad',
      description: 'Rivning av pannor, läkt och nockregel slutförd',
      category: 'workphase',
      oldValue: 'Ej klar',
      newValue: 'Klar',
    });
  }

  if (completedTasks > 4) {
    entries.push({
      id: `activity-${projectId}-6`,
      timestamp: new Date(baseDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      user: 'Erik Andersson',
      action: 'Kvalitetskontroll',
      description: 'Daglig egenkontroll genomförd utan anmärkningar',
      category: 'checklist',
    });
  }

  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Villa Andersson - Takbyte',
    address: 'Storgatan 15, 111 51 Stockholm',
    customerName: 'Erik Andersson',
    customerPhone: '+46 70 123 4567',
    responsibleSeller: 'Anna Lindberg',
    constructionTeam: 'Team Alpha',
    startDate: '2025-08-04',
    deadline: '2025-08-08',
    rotStatus: 'Yes',
    status: 'ongoing',
    region: 'Stockholm',
    notes: 'Kunden vill ha takpannor i antracitgrå. Extra försiktighet vid skorsten.',
    assignedTrailer: 'trailer-1',
    scaffoldingResponsible: 'Lars Nilsson',
    checklist: generateChecklist().map((item, index) => ({
      ...item,
      completed: index < 6, // First 6 items completed
      completedAt: index < 6 ? '2025-08-03' : undefined,
    })),
    workPhases: generateWorkPhases(4), // 4 of 10 work phases completed
    completionPercentage: 55,
    activityLog: generateActivityLog('1', 6),
  },
  {
    id: '2',
    name: 'Företagsbyggnad - Plåttak',
    address: 'Industrivägen 42, 412 58 Göteborg',
    customerName: 'Göteborg Logistik AB',
    customerPhone: '+46 31 987 6543',
    responsibleSeller: 'Marcus Holm',
    constructionTeam: 'Team Beta',
    startDate: '2025-08-06',
    deadline: '2025-08-12',
    rotStatus: 'No',
    status: 'planned',
    region: 'Västra Götaland',
    notes: 'Stort projekt, behöver extra material. Koordinera med fastighetsskötare.',
    checklist: generateChecklist().map((item, index) => ({
      ...item,
      completed: index < 3, // First 3 items completed
      completedAt: index < 3 ? '2025-08-05' : undefined,
    })),
    workPhases: generateWorkPhases(0), // No work phases completed yet
    completionPercentage: 27,
    activityLog: generateActivityLog('2', 3),
  },
  {
    id: '3',
    name: 'Radhus Karlsson - Takrenovering',
    address: 'Björkvägen 8, 113 25 Stockholm',
    customerName: 'Maria Karlsson',
    customerPhone: '+46 70 555 1234',
    responsibleSeller: 'Johan Svensson',
    constructionTeam: 'Team Gamma',
    startDate: '2025-08-02',
    deadline: '2025-08-09',
    rotStatus: 'Yes',
    status: 'ongoing',
    region: 'Stockholm',
    notes: 'Pågående projekt, nästan klart denna vecka.',
    checklist: generateChecklist().map(item => ({
      ...item,
      completed: true,
      completedAt: '2025-08-07',
    })),
    workPhases: generateWorkPhases(8), // 8 of 10 work phases completed
    completionPercentage: 85,
    activityLog: generateActivityLog('3', 8),
  },
  {
    id: '4',
    name: 'Affärslokal - Akut takrepartion',
    address: 'Centralgatan 22, 411 03 Göteborg',
    customerName: 'City Mall AB',
    customerPhone: '+46 31 444 5678',
    responsibleSeller: 'Lisa Pettersson',
    constructionTeam: 'Team Alpha',
    startDate: '2024-01-08',
    deadline: '2024-01-12',
    rotStatus: 'No',
    status: 'invoiced',
    region: 'Västra Götaland',
    notes: 'Akut reparation efter storm. Faktura skickad 2024-01-15.',
    checklist: generateChecklist().map(item => ({
      ...item,
      completed: true,
      completedAt: '2024-01-11',
    })),
    workPhases: generateWorkPhases(10), // All work phases completed
    completionPercentage: 100,
    activityLog: generateActivityLog('4', 10),
  },
];