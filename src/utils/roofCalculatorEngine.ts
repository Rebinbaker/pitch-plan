import {
  RoofCalculatorInput,
  CalculationResult,
  MaterialQuantity,
  RoofGeometry,
  RiskFactors,
  MaterialCoefficients,
  defaultCoefficients,
  defaultTileProfiles
} from '@/types/roofCalculator';

export class RoofCalculatorEngine {
  private coefficients: MaterialCoefficients;

  constructor(customCoefficients?: Partial<MaterialCoefficients>) {
    this.coefficients = { ...defaultCoefficients, ...customCoefficients };
  }

  calculate(input: RoofCalculatorInput): CalculationResult {
    // Step 1: Calculate or estimate geometry
    const geometry = this.calculateGeometry(input);
    
    // Step 2: Assess risk factors
    const riskFactors = this.assessRiskFactors(input, geometry);
    
    // Step 3: Adjust coefficients based on risk factors and wind zone
    const adjustedCoefficients = this.adjustCoefficients(input, riskFactors);
    
    // Step 4: Calculate material quantities
    const materials = this.calculateMaterials(input, geometry, adjustedCoefficients);
    
    // Step 5: Apply package rounding
    const packagedMaterials = this.applyPackageRounding(materials);
    
    // Step 6: Generate warnings and recommendations
    const warnings = this.generateWarnings(input, geometry, riskFactors);
    const recommendations = this.generateRecommendations(input, geometry, riskFactors);
    
    // Step 7: Determine confidence level
    const confidence = this.calculateConfidence(input, riskFactors);

    return {
      materials: packagedMaterials,
      geometry,
      riskFactors,
      warnings,
      recommendations,
      confidence
    };
  }

  private calculateGeometry(input: RoofCalculatorInput): RoofGeometry {
    const { area, ridgeLength, roofPitch, facadeHeight, rafterSpacing } = input;
    
    let calculatedRidgeLength: number;
    let calculatedFacadeHeight: number;
    let numberOfCorners: number;

    if (input.mode === 'pro' && ridgeLength) {
      calculatedRidgeLength = ridgeLength;
    } else {
      // Quick mode estimation for saddle roof
      // Assume length:width ratio of 1.6:1
      calculatedRidgeLength = Math.sqrt(area) * 1.25;
    }

    if (input.mode === 'pro' && facadeHeight) {
      calculatedFacadeHeight = facadeHeight;
    } else {
      calculatedFacadeHeight = 6; // Default facade height
    }

    // Estimate number of corners based on roof type
    switch (input.roofType) {
      case 'sadeltak':
        numberOfCorners = 4;
        break;
      case 'valmat':
        numberOfCorners = 4;
        break;
      case 'pulpettak':
        numberOfCorners = 4;
        break;
      case 'mansard':
        numberOfCorners = 8;
        break;
      default:
        numberOfCorners = 4;
    }

    return {
      area,
      ridgeLength: calculatedRidgeLength,
      roofPitch: roofPitch || 25, // Default pitch
      facadeHeight: calculatedFacadeHeight,
      rafterSpacing: rafterSpacing || 600,
      numberOfCorners,
      numberOfPenetrations: input.numberOfPenetrations || 0
    };
  }

  private assessRiskFactors(input: RoofCalculatorInput, geometry: RoofGeometry): RiskFactors {
    const roofRunLength = geometry.area / (2 * geometry.ridgeLength!);
    
    return {
      lowPitch: geometry.roofPitch! < 18,
      highPitch: geometry.roofPitch! > 35,
      complexRoof: input.roofType !== 'sadeltak',
      coastalExposure: input.windZone === 'kust',
      longRoofRuns: roofRunLength > 7,
      manyPenetrations: geometry.numberOfPenetrations! > 2
    };
  }

  private adjustCoefficients(
    input: RoofCalculatorInput,
    riskFactors: RiskFactors
  ): MaterialCoefficients {
    const adjusted = { ...this.coefficients };

    // Adjust for wind zone
    switch (input.windZone) {
      case 'kust':
        adjusted.tileFixingsField = 1.0; // Double fixings for coastal areas
        adjusted.battenFixings *= 1.3;
        break;
      case 'vindutsatt':
        adjusted.tileFixingsField = 0.75;
        adjusted.battenFixings *= 1.15;
        break;
      default:
        adjusted.tileFixingsField = 0.5;
    }

    // Adjust for roof type
    if (input.roofType === 'valmat') {
      adjusted.ridgeTiles *= 1.4; // Additional ridge tiles for hips
      adjusted.ridgeScrews *= 1.4;
    }

    // Adjust for risk factors
    if (riskFactors.highPitch) {
      adjusted.tileFixingsField *= 1.2;
      adjusted.battenFixings *= 1.1;
    }

    if (riskFactors.longRoofRuns) {
      adjusted.underlaymentFelt *= 1.05; // Extra overlap
      adjusted.sealingTape *= 1.2;
    }

    return adjusted;
  }

  private calculateMaterials(
    input: RoofCalculatorInput,
    geometry: RoofGeometry,
    coefficients: MaterialCoefficients
  ): MaterialQuantity[] {
    const { area } = geometry;
    const materials: MaterialQuantity[] = [];

    // Get tile profile
    const tileProfile = defaultTileProfiles.find(p => p.id === input.tileProfile);
    const tilesPerM2 = tileProfile?.tilesPerM2 || coefficients.concreteTiles;

    // Tile system
    materials.push({
      id: 'concrete-tiles',
      category: 'Pannsystem',
      name: 'Betongpannor',
      quantity: Math.ceil(area * tilesPerM2),
      unit: 'st'
    });

    materials.push({
      id: 'ridge-tiles',
      category: 'Pannsystem',
      name: 'Nockpannor',
      quantity: Math.ceil(area * coefficients.ridgeTiles),
      unit: 'st'
    });

    materials.push({
      id: 'ridge-screws',
      category: 'Pannsystem',
      name: 'Nockskruvar',
      quantity: Math.ceil(area * coefficients.ridgeScrews),
      unit: 'st'
    });

    materials.push({
      id: 'tile-fixings',
      category: 'Pannsystem',
      name: 'Panninfästning i fält',
      quantity: Math.ceil(area * coefficients.tileFixingsField),
      unit: 'st',
      notes: `Vindzon: ${input.windZone}`
    });

    // Battens
    materials.push({
      id: 'carrying-battens',
      category: 'Läkt',
      name: 'Bärläkt',
      quantity: Math.ceil(area * coefficients.carryingBattens),
      unit: 'lm'
    });

    materials.push({
      id: 'counter-battens',
      category: 'Läkt',
      name: 'Ströläkt',
      quantity: Math.ceil(area * coefficients.counterBattens),
      unit: 'lm'
    });

    materials.push({
      id: 'batten-fixings',
      category: 'Läkt',
      name: 'Läktfästdon',
      quantity: Math.ceil(area * coefficients.battenFixings),
      unit: 'st'
    });

    // Underlayment
    materials.push({
      id: 'underlayment',
      category: 'Underlagstak',
      name: 'Underlagsduk',
      quantity: area * coefficients.underlaymentFelt,
      unit: 'rullar',
      notes: '~28 m² per rulle'
    });

    materials.push({
      id: 'felt-clamps',
      category: 'Underlagstak',
      name: 'Klammer för duk',
      quantity: Math.ceil(area * coefficients.feltClamps),
      unit: 'st'
    });

    materials.push({
      id: 'sealing-tape',
      category: 'Underlagstak',
      name: 'Tätningstejp',
      quantity: area * coefficients.sealingTape,
      unit: 'rullar'
    });

    // Flashings
    materials.push({
      id: 'eave-flashing',
      category: 'Plåt & kanter',
      name: 'Fotplåt',
      quantity: Math.ceil(area * coefficients.eaveFlashing),
      unit: 'lm'
    });

    materials.push({
      id: 'verge-flashing',
      category: 'Plåt & kanter',
      name: 'Vindskiveplåt',
      quantity: Math.ceil(area * coefficients.vergeFlashing),
      unit: 'lm'
    });

    materials.push({
      id: 'bird-guard',
      category: 'Plåt & kanter',
      name: 'Fågelband',
      quantity: Math.ceil(area * coefficients.birdGuard),
      unit: 'lm'
    });

    // Drainage
    materials.push({
      id: 'guttering',
      category: 'Avvattning',
      name: 'Hängränna',
      quantity: Math.ceil(area * coefficients.guttering),
      unit: 'lm'
    });

    materials.push({
      id: 'gutter-brackets',
      category: 'Avvattning',
      name: 'Rännkrokar',
      quantity: Math.ceil(area * coefficients.gutterBrackets),
      unit: 'st',
      notes: '600mm c/c'
    });

    const downpipeLength = geometry.facadeHeight! * geometry.numberOfCorners!;
    materials.push({
      id: 'downpipe',
      category: 'Avvattning',
      name: 'Stuprör',
      quantity: Math.ceil(downpipeLength),
      unit: 'lm',
      notes: `${geometry.numberOfCorners} hörn × ${geometry.facadeHeight}m`
    });

    // Sheathing (if required)
    if (input.newSheathing) {
      materials.push({
        id: 'sheathing',
        category: 'Råspont & infästning',
        name: 'Råspont',
        quantity: area * coefficients.sheathing,
        unit: 'm²'
      });

      materials.push({
        id: 'sheathing-nails',
        category: 'Råspont & infästning',
        name: 'Råspontspik/skruv',
        quantity: Math.ceil(area * coefficients.sheathingNails),
        unit: 'st'
      });
    }

    // Safety equipment
    const roofHeight = geometry.facadeHeight! + (geometry.area / (2 * geometry.ridgeLength!)) * Math.sin(geometry.roofPitch! * Math.PI / 180);
    const ladderLines = Math.ceil(roofHeight / 0.8);
    
    materials.push({
      id: 'roof-ladders',
      category: 'Säkerhet',
      name: 'Taksteg',
      quantity: ladderLines,
      unit: 'st',
      notes: `${roofHeight.toFixed(1)}m höjd`
    });

    materials.push({
      id: 'safety-brackets',
      category: 'Säkerhet',
      name: 'Glidskydd',
      quantity: ladderLines,
      unit: 'st'
    });

    return materials;
  }

  private applyPackageRounding(materials: MaterialQuantity[]): MaterialQuantity[] {
    const packageSizes: Record<string, { size: number; unit: string }> = {
      'ridge-screws': { size: 250, unit: 'pack' },
      'tile-fixings': { size: 250, unit: 'pack' },
      'batten-fixings': { size: 2000, unit: 'pack' },
      'felt-clamps': { size: 500, unit: 'pack' },
      'sheathing-nails': { size: 2000, unit: 'pack' }
    };

    return materials.map(material => {
      const packageInfo = packageSizes[material.id];
      if (packageInfo) {
        const packQuantity = Math.ceil(material.quantity / packageInfo.size);
        return {
          ...material,
          packSize: packageInfo.size,
          packQuantity,
          quantity: packQuantity * packageInfo.size, // Round up to full packages
          notes: material.notes ? `${material.notes} • ${packageInfo.size}/pack` : `${packageInfo.size}/pack`
        };
      }
      return material;
    });
  }

  private generateWarnings(
    input: RoofCalculatorInput,
    geometry: RoofGeometry,
    riskFactors: RiskFactors
  ): string[] {
    const warnings: string[] = [];

    if (riskFactors.lowPitch) {
      warnings.push('Låg taklutning (<18°) kan kräva extra tätning och särskild underlagsduk.');
    }

    if (riskFactors.highPitch) {
      warnings.push('Hög taklutning (>35°) kräver extra infästningar och säkerhetsåtgärder.');
    }

    if (riskFactors.coastalExposure) {
      warnings.push('Kustnära läge - ökade vindlaster kräver förstärkt infästning.');
    }

    if (riskFactors.longRoofRuns) {
      warnings.push('Långa takfall (>7m) kan kräva extra tätningsmaterial och dilatationsfogar.');
    }

    if (riskFactors.manyPenetrations) {
      warnings.push('Många genomföringar kräver extra tätningsprodukter och specialdetaljer.');
    }

    if (input.mode === 'quick' && (riskFactors.complexRoof || riskFactors.coastalExposure)) {
      warnings.push('Rekommenderar Pro-läge för detta projekt för mer exakta beräkningar.');
    }

    // Sanity checks
    const gutterRatio = (geometry.area * 0.20) / geometry.area;
    if (gutterRatio < 0.15 || gutterRatio > 0.25) {
      warnings.push('Ovanlig hängrännslängd vs takyta - kontrollera husgeometri.');
    }

    return warnings;
  }

  private generateRecommendations(
    input: RoofCalculatorInput,
    geometry: RoofGeometry,
    riskFactors: RiskFactors
  ): string[] {
    const recommendations: string[] = [];

    if (input.windZone === 'kust') {
      recommendations.push('Överväg rostfria fästdon för kustmiljö.');
    }

    if (geometry.roofPitch! > 30) {
      recommendations.push('Snörasskydd rekommenderas för brant tak.');
    }

    if (geometry.area > 200) {
      recommendations.push('Stort tak - överväg dilatationsfogar och extra säkerhetsåtgärder.');
    }

    if (riskFactors.manyPenetrations) {
      recommendations.push('Beställ extra manschetter och tätningsprodukter för genomföringar.');
    }

    recommendations.push('Lägg alltid till 2-3% extra läkt och duk för osäkra mått.');

    return recommendations;
  }

  private calculateConfidence(
    input: RoofCalculatorInput,
    riskFactors: RiskFactors
  ): 'high' | 'medium' | 'low' {
    if (input.mode === 'pro' && input.ridgeLength && input.facadeHeight) {
      if (Object.values(riskFactors).filter(Boolean).length <= 1) {
        return 'high';
      }
      return 'medium';
    }

    if (input.mode === 'quick') {
      if (Object.values(riskFactors).filter(Boolean).length === 0) {
        return 'medium';
      }
      return 'low';
    }

    return 'medium';
  }
}