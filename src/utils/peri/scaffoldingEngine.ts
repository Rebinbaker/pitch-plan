// PERI UP regelmotor — räknar material från sektionsmått (ej AI-gissning)
// Output mappas mot peri_catalog via rule_mapping-fältet.

export interface PeriCatalogItem {
  artnr: string;
  name: string;
  unit: string;
  rule_mapping?: {
    kind?: string;          // 'spire' | 'top_spire' | 'ledger' | 'transom' | 'deck' | ...
    length_m?: number;      // för bay-baserade artiklar
    [k: string]: any;
  } | null;
}

export interface ScaffoldingSectionInput {
  id: string;
  name: string;
  length_m: number;
  height_m: number;
  width_m?: number;       // 0.67 default
  lift_height_m?: number; // 2.0 default
  work_levels?: number;   // antal arbetsnivåer (default 1, översta planet)
  bridging?: { span_m?: number };
  obstacles?: Array<{ type: string }>;
  // hörn med nästa sektion (för returmaterial)
  has_corner?: boolean;
}

export interface MaterialLine {
  rule_id: string;
  section_id: string;
  artnr: string;
  name: string;
  qty: number;
  unit: string;
  source: 'auto' | 'manual';
  note?: string;
  warning?: string;
}

// PERI UP standardfacklängder (m), störst först
export const BAY_LENGTHS = [3.07, 2.57, 2.07, 1.57, 1.09, 0.73];
export const DEFAULT_LIFT = 2.0;
export const DEFAULT_WIDTH = 0.67;
export const ANCHOR_AREA = 16; // m² per förankringspunkt (≈4×4)

// Girigt: dela total längd i fackbitar
export function splitIntoBays(length_m: number): number[] {
  const bays: number[] = [];
  let remaining = length_m;
  const eps = 0.01;
  while (remaining > eps) {
    const bay = BAY_LENGTHS.find((b) => b <= remaining + eps) ?? BAY_LENGTHS[BAY_LENGTHS.length - 1];
    bays.push(bay);
    remaining -= bay;
    if (remaining < eps) break;
  }
  return bays;
}

interface RuleNeed {
  rule_id: string;
  kind: string;
  length_m?: number;
  qty: number;
  note?: string;
}

function needsForSection(s: ScaffoldingSectionInput): RuleNeed[] {
  const length = Math.max(0, s.length_m || 0);
  const height = Math.max(0, s.height_m || 0);
  const lift = s.lift_height_m ?? DEFAULT_LIFT;
  const width = s.width_m ?? DEFAULT_WIDTH;
  const workLevels = Math.max(1, s.work_levels ?? 1);

  const bays = splitIntoBays(length);
  const nBays = bays.length;
  const nStandards = nBays + 1; // spirelinjer
  const nLifts = Math.max(1, Math.ceil(height / lift));
  const area = length * height;
  const nAnchors = Math.max(0, Math.ceil(area / ANCHOR_AREA));
  const nDiagonals = Math.max(1, Math.ceil(nBays / 5)) * nLifts;

  const out: RuleNeed[] = [];

  // Mark
  out.push({ rule_id: 'base_jack', kind: 'base_jack', qty: nStandards });
  out.push({ rule_id: 'sole_board', kind: 'sole_board', qty: nStandards });

  // Spiror (välj 2 m som default-modul)
  out.push({ rule_id: 'standard', kind: 'spire', length_m: 2.0, qty: nStandards * nLifts });
  out.push({ rule_id: 'top_standard', kind: 'top_spire', qty: nStandards });

  // Bommar per bomlag
  bays.forEach((b) => {
    out.push({ rule_id: `ledger_${b}`, kind: 'ledger', length_m: b, qty: nLifts });
  });
  // Tvärbalkar (en per spirelinje × bomlag)
  out.push({ rule_id: 'transom', kind: 'transom', length_m: width, qty: nStandards * nLifts });

  // Arbetsplan (stålplan) per fack och arbetsnivå
  bays.forEach((b) => {
    out.push({ rule_id: `deck_${b}`, kind: 'deck', length_m: b, qty: workLevels });
  });

  // Räcken översta planet (dubbla)
  bays.forEach((b) => {
    out.push({ rule_id: `guardrail_${b}`, kind: 'guardrail', length_m: b, qty: 2 });
  });
  out.push({ rule_id: 'end_guardrail', kind: 'end_guardrail', qty: 2 });

  // Fotlister runt arbetsplan
  bays.forEach((b) => {
    out.push({ rule_id: `toeboard_${b}`, kind: 'toeboard', length_m: b, qty: workLevels });
  });
  out.push({ rule_id: 'toeboard_end', kind: 'toeboard_end', qty: 2 * workLevels });

  // Diagonaler
  out.push({ rule_id: 'diagonal', kind: 'diagonal', qty: nDiagonals });

  // Förankringar
  out.push({ rule_id: 'anchor_tube', kind: 'anchor_tube', qty: nAnchors });
  out.push({ rule_id: 'anchor_eye_bolt', kind: 'eye_bolt', qty: nAnchors });
  out.push({ rule_id: 'anchor_plug', kind: 'expansion_plug', qty: nAnchors });
  out.push({ rule_id: 'anchor_coupling', kind: 'coupling', qty: nAnchors });

  // Överbryggning (fackverksbalk)
  const span = s.bridging?.span_m ?? 0;
  if (span > 0) {
    out.push({ rule_id: 'lattice_girder', kind: 'lattice_girder', length_m: span, qty: 2, note: `Spann ${span} m` });
    out.push({ rule_id: 'extra_standard', kind: 'spire', length_m: 2.0, qty: 2, note: 'Landning fackverksbalk' });
  }

  // Hörn-/returmaterial
  if (s.has_corner) {
    out.push({ rule_id: 'corner_standard', kind: 'spire', length_m: 2.0, qty: 1, note: 'Hörn' });
    out.push({ rule_id: 'corner_coupling', kind: 'coupling', qty: 4, note: 'Hörn' });
  }

  return out;
}

// Hitta bästa katalogartikel
function matchCatalog(need: RuleNeed, catalog: PeriCatalogItem[]): PeriCatalogItem | undefined {
  // exakt kind+length match
  if (need.length_m != null) {
    const exact = catalog.find(
      (c) => c.rule_mapping?.kind === need.kind &&
        c.rule_mapping?.length_m != null &&
        Math.abs((c.rule_mapping.length_m as number) - need.length_m!) < 0.05,
    );
    if (exact) return exact;
    // närmaste längd
    const sameKind = catalog
      .filter((c) => c.rule_mapping?.kind === need.kind && c.rule_mapping?.length_m != null)
      .sort((a, b) => Math.abs((a.rule_mapping!.length_m as number) - need.length_m!) - Math.abs((b.rule_mapping!.length_m as number) - need.length_m!));
    if (sameKind[0]) return sameKind[0];
  }
  return catalog.find((c) => c.rule_mapping?.kind === need.kind);
}

export function computeMaterials(
  sections: ScaffoldingSectionInput[],
  catalog: PeriCatalogItem[],
): MaterialLine[] {
  const lines: MaterialLine[] = [];
  for (const s of sections) {
    const needs = needsForSection(s);
    for (const n of needs) {
      const item = matchCatalog(n, catalog);
      lines.push({
        rule_id: n.rule_id,
        section_id: s.id,
        artnr: item?.artnr ?? `?-${n.kind}${n.length_m ? '-' + n.length_m : ''}`,
        name: item?.name ?? `[saknas i katalog] ${n.kind}${n.length_m ? ' ' + n.length_m + ' m' : ''}`,
        qty: n.qty,
        unit: item?.unit ?? 'st',
        source: 'auto',
        note: n.note,
        warning: item ? undefined : 'Ingen matchande PERI-artikel i katalogen',
      });
    }
  }
  return lines;
}

export interface MergedLine extends MaterialLine {
  sections: string[];
}

// Summera över sektioner (totallista)
export function summarizeMaterials(lines: MaterialLine[]): MergedLine[] {
  const map = new Map<string, MergedLine>();
  for (const l of lines) {
    const key = l.artnr + '|' + l.name;
    const existing = map.get(key);
    if (existing) {
      existing.qty += l.qty;
      if (!existing.sections.includes(l.section_id)) existing.sections.push(l.section_id);
    } else {
      map.set(key, { ...l, sections: [l.section_id] });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'sv'));
}
