import { ConstructionTeam } from '@/types/team';

export const mockTeams: ConstructionTeam[] = [
  {
    id: 'team-alpha',
    name: 'Team Alpha',
    type: 'Internt',
    currentJob: 'Villa Andersson - Takbyte',
    availabilityNextWeek: 'Upptagen',
    performanceNotes: 'Utmärkt arbetskvalitet, alltid i tid',
    contactInfo: 'Lars Nilsson: +46 70 123 4567',
    skills: ['Tile roofing', 'Sheet metal', 'Repairs'],
    sellers: [
      {
        id: 'seller-erik',
        firstName: 'Erik',
        lastName: 'Lundström',
        region: 'Stockholm'
      },
      {
        id: 'seller-anna',
        firstName: 'Anna',
        lastName: 'Karlsson',
        region: 'Stockholm'
      }
    ]
  },
  {
    id: 'team-beta',
    name: 'Team Beta',
    type: 'Internt',
    currentJob: 'Planeringsfas',
    availabilityNextWeek: 'Tillgänglig',
    performanceNotes: 'Bra på komplexa kommersiella projekt',
    contactInfo: 'Maria Ekström: +46 70 987 6543',
    skills: ['Commercial roofing', 'Flat roofs', 'Industrial'],
    sellers: [
      {
        id: 'seller-johan',
        firstName: 'Johan',
        lastName: 'Petersson',
        region: 'Stockholm'
      }
    ]
  },
  {
    id: 'team-gamma',
    name: 'Team Gamma',
    type: 'Internt',
    currentJob: 'Radhus Karlsson - Takrenovering',
    availabilityNextWeek: 'Begränsad',
    performanceNotes: 'Specialister på bostadsarbete',
    contactInfo: 'Erik Johansson: +46 70 555 1234',
    skills: ['Residential', 'Renovations', 'ROT work'],
    sellers: [
      {
        id: 'seller-magnus',
        firstName: 'Magnus',
        lastName: 'Svensson',
        region: 'Västra Götaland'
      }
    ]
  },
  {
    id: 'contractor-1',
    name: 'Nordic Roof Solutions',
    type: 'Underentreprenör',
    availabilityNextWeek: 'Tillgänglig',
    performanceNotes: 'Pålitlig underentreprenör, bra för överskottsarbete',
    contactInfo: 'Contract manager: +46 31 444 5678',
    skills: ['All roof types', 'Emergency repairs'],
    sellers: [
      {
        id: 'seller-sofia',
        firstName: 'Sofia',
        lastName: 'Andersson',
        region: 'Västra Götaland'
      }
    ]
  },
  {
    id: 'contractor-2',
    name: 'Göteborg Takspecialister',
    type: 'Underentreprenör',
    currentJob: 'Externt projekt',
    availabilityNextWeek: 'Upptagen',
    performanceNotes: 'Lokal expertis i Västra Götalands regionen',
    contactInfo: 'Main office: +46 31 222 3333',
    skills: ['Regional expertise', 'Commercial', 'Industrial'],
    sellers: []
  },
];