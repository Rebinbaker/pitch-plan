import { Project, defaultChecklist } from '@/types/project';

// Generate checklist with IDs
const generateChecklist = () => 
  defaultChecklist.map((item, index) => ({
    ...item,
    id: `checklist-${index + 1}`,
  }));

export const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Villa Andersson - Takbyte',
    address: 'Storgatan 15, 111 51 Stockholm',
    customerName: 'Erik Andersson',
    customerPhone: '+46 70 123 4567',
    responsibleSeller: 'Anna Lindberg',
    constructionTeam: 'Team Alpha',
    startDate: '2024-01-15',
    deadline: '2024-01-25',
    rotStatus: 'Yes',
    status: 'ongoing',
    region: 'Stockholm',
    notes: 'Kunden vill ha takpannor i antracitgrå. Extra försiktighet vid skorsten.',
    checklist: generateChecklist().map((item, index) => ({
      ...item,
      completed: index < 6, // First 6 items completed
      completedAt: index < 6 ? '2024-01-14' : undefined,
    })),
    completionPercentage: 55,
  },
  {
    id: '2',
    name: 'Företagsbyggnad - Plåttak',
    address: 'Industrivägen 42, 412 58 Göteborg',
    customerName: 'Göteborg Logistik AB',
    customerPhone: '+46 31 987 6543',
    responsibleSeller: 'Marcus Holm',
    constructionTeam: 'Team Beta',
    startDate: '2024-01-20',
    deadline: '2024-02-05',
    rotStatus: 'No',
    status: 'planned',
    region: 'Västra Götaland',
    notes: 'Stort projekt, behöver extra material. Koordinera med fastighetsskötare.',
    checklist: generateChecklist().map((item, index) => ({
      ...item,
      completed: index < 3, // First 3 items completed
      completedAt: index < 3 ? '2024-01-18' : undefined,
    })),
    completionPercentage: 27,
  },
  {
    id: '3',
    name: 'Radhus Karlsson - Takrenovering',
    address: 'Björkvägen 8, 113 25 Stockholm',
    customerName: 'Maria Karlsson',
    customerPhone: '+46 70 555 1234',
    responsibleSeller: 'Johan Svensson',
    constructionTeam: 'Team Gamma',
    startDate: '2024-01-10',
    deadline: '2024-01-18',
    rotStatus: 'Yes',
    status: 'completed',
    region: 'Stockholm',
    notes: 'Projekt avslutat framgångsrikt. Kunden mycket nöjd.',
    checklist: generateChecklist().map(item => ({
      ...item,
      completed: true,
      completedAt: '2024-01-17',
    })),
    completionPercentage: 100,
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
    completionPercentage: 100,
  },
];