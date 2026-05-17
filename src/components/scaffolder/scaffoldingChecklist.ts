export interface ScaffChecklistItem {
  key: string;
  label: string;
}
export interface ScaffChecklistSection {
  id: string;
  title: string;
  items: ScaffChecklistItem[];
}

export const SCAFFOLDING_CHECKLIST: ScaffChecklistSection[] = [
  {
    id: 'planering',
    title: '1. Planering',
    items: [
      { key: 'planering_bilder', label: 'Kontrollera bilder på huset' },
      { key: 'planering_hojd', label: 'Kontrollera höjd och taktyp' },
      { key: 'planering_atkomst', label: 'Kontrollera åtkomst / parkering' },
      { key: 'planering_mark', label: 'Kontrollera markförhållanden' },
      { key: 'planering_lift', label: 'Kontrollera om lift krävs' },
      { key: 'planering_special', label: 'Kontrollera om specialställning krävs' },
      { key: 'planering_byggstart', label: 'Kontrollera byggstartdatum' },
      { key: 'planering_container', label: 'Kontrollera om container blockerar plats' },
    ],
  },
  {
    id: 'material',
    title: '2. Materialberäkning',
    items: [{ key: 'material_godkand', label: 'Materiallista godkänd' }],
  },
  {
    id: 'transport',
    title: '3. Transport',
    items: [
      { key: 'transport_bokad', label: 'Transport bokad' },
      { key: 'transport_datum', label: 'Datum satt' },
      { key: 'transport_chauffor', label: 'Chaufför tilldelad' },
      { key: 'transport_adress', label: 'Leveransadress verifierad' },
      { key: 'transport_kontakt', label: 'Kontaktperson verifierad' },
    ],
  },
  {
    id: 'bemanning',
    title: '4. Bemanning',
    items: [
      { key: 'bem_montorer', label: 'Montörer tilldelade' },
      { key: 'bem_starttid', label: 'Starttid satt' },
      { key: 'bem_boende', label: 'Boende klart (om borta)' },
      { key: 'bem_verktyg', label: 'Verktyg kontrollerade' },
      { key: 'bem_lastbil', label: 'Lastbil tilldelad' },
    ],
  },
  {
    id: 'utforande',
    title: '5. Utförande',
    items: [
      { key: 'utf_paborjad', label: 'Ställning påbörjad' },
      { key: 'utf_fardig', label: 'Ställning färdigbyggd' },
      { key: 'utf_sakerhet', label: 'Säkerhetskontroll utförd' },
      { key: 'utf_bilder', label: 'Bilder uppladdade' },
      { key: 'utf_signering', label: 'Signering klar' },
    ],
  },
  {
    id: 'slutfort',
    title: '6. Slutfört',
    items: [
      { key: 'slut_notifierad', label: 'Projektledare notifierad' },
      { key: 'slut_bygglag', label: 'Bygglag kan starta' },
      { key: 'slut_klar', label: 'Klar markerad' },
    ],
  },
];

export const REQUIRED_PHOTOS = {
  before: [
    { key: 'before_hus', label: 'Hus (helbild)' },
    { key: 'before_mark', label: 'Mark / underlag' },
    { key: 'before_placering', label: 'Placering' },
  ],
  after: [
    { key: 'after_sidor', label: 'Alla sidor' },
    { key: 'after_infastningar', label: 'Infästningar' },
    { key: 'after_atkomst', label: 'Åtkomst' },
    { key: 'after_helhet', label: 'Helhetsbild' },
  ],
} as const;

export type ChecklistState = Record<string, { checked: boolean; at?: string; by?: string }>;

export function progressOfSection(section: ScaffChecklistSection, state: ChecklistState): number {
  const total = section.items.length;
  const done = section.items.filter((i) => state[i.key]?.checked).length;
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

export function progressOverall(state: ChecklistState): number {
  const all = SCAFFOLDING_CHECKLIST.flatMap((s) => s.items);
  const done = all.filter((i) => state[i.key]?.checked).length;
  return all.length === 0 ? 0 : Math.round((done / all.length) * 100);
}
