export type RoofType = 'sadeltak' | 'valmat' | 'pulpettak' | 'mansard';
export type WindZone = 'inland' | 'vindutsatt' | 'kust';
export type CalculationMode = 'quick' | 'pro';

export interface TileProfile {
  id: string;
  name: string;
  supplier: string;
  tilesPerM2: number;
  battingSpacing: number; // mm
  ridgeTilesPerMeter: number;
  description?: string;
}

export interface MaterialCoefficients {
  roofType: RoofType;
  tileProfile: string;
  windZone: WindZone;
  
  // Tile system
  concreteTiles: number; // per m²
  ridgeTiles: number; // per m²
  ridgeScrews: number; // per m²
  tileFixingsField: number; // per m² (varies by wind zone)
  
  // Battens
  carryingBattens: number; // lm per m²
  counterBattens: number; // lm per m²
  battenFixings: number; // per m²
  
  // Underlayment
  underlaymentFelt: number; // rolls per m²
  feltClamps: number; // per m²
  sealingTape: number; // rolls per m²
  
  // Flashings
  eaveFlashing: number; // lm per m²
  vergeFlashing: number; // lm per m²
  birdGuard: number; // lm per m²
  
  // Drainage
  guttering: number; // lm per m²
  gutterBrackets: number; // per m²
  downpipe: number; // per corner
  
  // Sheathing (if new)
  sheathing: number; // m² per m²
  sheathingNails: number; // per m²
  
  // Safety
  roofLadders: number; // per linear meter to ridge
  safetyBrackets: number; // per ladder line
}

export interface RoofGeometry {
  area: number;
  ridgeLength?: number;
  roofPitch?: number;
  facadeHeight?: number;
  rafterSpacing?: number;
  numberOfCorners?: number;
  numberOfPenetrations?: number;
}

export interface RiskFactors {
  lowPitch: boolean; // < 18°
  highPitch: boolean; // > 35°
  complexRoof: boolean; // valmat/L/T-form
  coastalExposure: boolean;
  longRoofRuns: boolean; // > 7m
  manyPenetrations: boolean;
}

export interface MaterialQuantity {
  id: string;
  category: string;
  name: string;
  quantity: number;
  unit: string;
  packSize?: number;
  packQuantity?: number;
  notes?: string;
  isEstimate?: boolean;
}

export interface CalculationResult {
  materials: MaterialQuantity[];
  geometry: RoofGeometry;
  riskFactors: RiskFactors;
  warnings: string[];
  recommendations: string[];
  totalEstimatedCost?: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface RoofCalculatorInput {
  mode: CalculationMode;
  roofType: RoofType;
  area: number;
  tileProfile: string;
  newSheathing: boolean;
  windZone: WindZone;
  
  // Pro mode additional inputs
  ridgeLength?: number;
  roofPitch?: number;
  facadeHeight?: number;
  rafterSpacing?: number;
  numberOfPenetrations?: number;
}

export const defaultTileProfiles: TileProfile[] = [
  {
    id: 'benders-betong',
    name: 'Benders Betong',
    supplier: 'Benders',
    tilesPerM2: 10.7,
    battingSpacing: 350,
    ridgeTilesPerMeter: 3.3
  },
  {
    id: 'palema-classic',
    name: 'Palema Classic',
    supplier: 'Palema',
    tilesPerM2: 10.5,
    battingSpacing: 345,
    ridgeTilesPerMeter: 3.2
  },
  {
    id: 'monier-novo',
    name: 'Monier Novo',
    supplier: 'Monier',
    tilesPerM2: 11.2,
    battingSpacing: 330,
    ridgeTilesPerMeter: 3.4
  }
];

export const defaultCoefficients: MaterialCoefficients = {
  roofType: 'sadeltak',
  tileProfile: 'benders-betong',
  windZone: 'inland',
  
  // Tile system (includes ~7% waste)
  concreteTiles: 10.7,
  ridgeTiles: 0.33, // 3.3 per meter ridge, assuming ridge ≈ 0.1 * area
  ridgeScrews: 0.66,
  tileFixingsField: 0.5, // inland: 0.5, coast: 1.0
  
  // Battens (includes ~7% waste)
  carryingBattens: 3.4,
  counterBattens: 1.85,
  battenFixings: 7,
  
  // Underlayment (includes ~5-10% waste)
  underlaymentFelt: 0.038, // ~28 m² effective per roll
  feltClamps: 18,
  sealingTape: 0.02,
  
  // Flashings (includes ~5% waste)
  eaveFlashing: 0.20,
  vergeFlashing: 0.133,
  birdGuard: 0.20,
  
  // Drainage (rectangular house, saddle roof)
  guttering: 0.20,
  gutterBrackets: 0.333, // 600mm spacing
  downpipe: 1.5, // per corner, assuming 4 corners
  
  // Sheathing (includes 5% waste)
  sheathing: 1.05,
  sheathingNails: 30,
  
  // Safety
  roofLadders: 1.25, // per 0.8m height to ridge
  safetyBrackets: 1
};