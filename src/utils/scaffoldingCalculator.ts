// Auto-beräkning av ställningsmaterial baserat på mått.

export interface ScaffoldingInput {
  sides: number[]; // löpmeter per sida
  height: number; // total höjd i meter
  gables: number; // antal gavlar
  weatherProtection?: boolean;
  specials?: string;
}

export interface ScaffoldingCalc {
  totalLength: number;
  totalArea: number;
  floors: number;
  ramar: number;
  bomlag: number;
  diagonaler: number;
  fotplattor: number;
  racken: number;
  trappor: number;
  konsoler: number;
  vaderskydd: number;
}

export interface MaterialRow {
  id: string;
  type: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export function calculateScaffolding(input: ScaffoldingInput): ScaffoldingCalc {
  const totalLength = (input.sides || []).reduce((a, b) => a + (Number(b) || 0), 0);
  const height = Number(input.height) || 0;
  const floors = Math.max(1, Math.ceil(height / 2));
  const ramar = Math.ceil(totalLength / 3) * floors;
  const bomlag = ramar;
  const diagonaler = Math.ceil(ramar / 2);
  const fotplattor = ramar * 2;
  const racken = ramar;
  const trappor = Math.max(1, Math.floor(totalLength / 12));
  const konsoler = Math.round(ramar * 0.3);
  const totalArea = totalLength * height;
  const vaderskydd = input.weatherProtection ? Math.ceil(totalArea / 6) : 0;

  return {
    totalLength,
    totalArea,
    floors,
    ramar,
    bomlag,
    diagonaler,
    fotplattor,
    racken,
    trappor,
    konsoler,
    vaderskydd,
  };
}

export function calcToMaterialSpec(c: ScaffoldingCalc, gables: number): MaterialRow[] {
  const rows: MaterialRow[] = [
    { id: 'ramar', type: 'Ramar', quantity: c.ramar, unit: 'st' },
    { id: 'bomlag', type: 'Bomlag (plank)', quantity: c.bomlag, unit: 'st' },
    { id: 'diagonaler', type: 'Diagonaler', quantity: c.diagonaler, unit: 'st' },
    { id: 'fotplattor', type: 'Fotplattor', quantity: c.fotplattor, unit: 'st' },
    { id: 'racken', type: 'Räcken', quantity: c.racken, unit: 'st' },
    { id: 'trappor', type: 'Trappor', quantity: c.trappor, unit: 'st' },
    { id: 'konsoler', type: 'Konsoler', quantity: c.konsoler, unit: 'st' },
  ];
  if (gables > 0) rows.push({ id: 'gavlar', type: 'Gavelramar', quantity: gables, unit: 'st' });
  if (c.vaderskydd > 0) rows.push({ id: 'vaderskydd', type: 'Väderskyddsdukar', quantity: c.vaderskydd, unit: 'st' });
  return rows;
}
