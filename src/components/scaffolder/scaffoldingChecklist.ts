// Förenklad 4-stegs checklista för ställningsmontörens vy
export interface ScaffSimpleItem {
  key: string;
  label: string;
  description?: string;
}

export const SIMPLE_CHECKLIST: ScaffSimpleItem[] = [
  { key: 'ai_done', label: 'Foton + AI-analys klar', description: 'Bilder uppladdade och AI har föreslagit materiallista' },
  { key: 'material_ordered', label: 'Materiallista godkänd & beställd', description: 'PERI-materialet är granskat och beställt' },
  { key: 'transport_team', label: 'Transport bokad + montörer tilldelade', description: 'Leverans och bemanning klar' },
  { key: 'built_signed', label: 'Ställning byggd & säkerhetssignerad', description: 'Klar för bygglag' },
];

export type SimpleChecklistState = Record<string, { checked: boolean; at?: string; by?: string }>;

export function simpleProgress(state: SimpleChecklistState): number {
  const done = SIMPLE_CHECKLIST.filter((i) => state[i.key]?.checked).length;
  return Math.round((done / SIMPLE_CHECKLIST.length) * 100);
}
