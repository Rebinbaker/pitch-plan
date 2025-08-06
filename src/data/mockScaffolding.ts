import { ScaffoldingTrailer } from '@/types/scaffolding';

export const mockScaffolding: ScaffoldingTrailer[] = [
  {
    id: 'trailer-1',
    name: 'Trailer ST-001',
    status: 'In use',
    assignedProject: 'Villa Andersson - Takbyte',
    location: 'Storgatan 15, Stockholm',
    moverNote: 'Team Alpha will move after completion',
    lastUpdated: '2024-01-20',
  },
  {
    id: 'trailer-2',
    name: 'Trailer ST-002',
    status: 'Available',
    location: 'Warehouse Stockholm',
    lastUpdated: '2024-01-18',
  },
  {
    id: 'trailer-3',
    name: 'Trailer GB-001',
    status: 'Being moved',
    assignedProject: 'Företagsbyggnad - Plåttak',
    moverNote: 'External contractor moving to Göteborg',
    lastUpdated: '2024-01-19',
  },
  {
    id: 'trailer-4',
    name: 'Trailer GB-002',
    status: 'Available',
    location: 'Warehouse Göteborg',
    lastUpdated: '2024-01-17',
  },
  {
    id: 'trailer-5',
    name: 'Trailer ST-003',
    status: 'In use',
    assignedProject: 'Radhus Karlsson - Takrenovering',
    location: 'Björkvägen 8, Stockholm',
    moverNote: 'Team Gamma handles pickup',
    lastUpdated: '2024-01-16',
  },
];