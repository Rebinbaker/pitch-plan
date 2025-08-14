import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Calculator, AlertTriangle, CheckCircle, Settings, Download, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  RoofCalculatorInput,
  CalculationResult,
  MaterialQuantity,
  RoofType,
  WindZone,
  CalculationMode,
  defaultTileProfiles,
  TileProfile
} from '@/types/roofCalculator';
import { RoofCalculatorEngine } from '@/utils/roofCalculatorEngine';

interface RoofMaterialCalculatorProps {
  onAddToOrder?: (materials: MaterialQuantity[]) => void;
  onSaveTemplate?: (template: any) => void;
}

export function RoofMaterialCalculator({ onAddToOrder, onSaveTemplate }: RoofMaterialCalculatorProps) {
  const { toast } = useToast();
  const [input, setInput] = useState<RoofCalculatorInput>({
    mode: 'quick',
    roofType: 'sadeltak',
    area: 150,
    tileProfile: 'benders-betong',
    newSheathing: false,
    windZone: 'inland'
  });
  
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [tileProfiles] = useState<TileProfile[]>(defaultTileProfiles);

  const calculator = new RoofCalculatorEngine();

  useEffect(() => {
    // Auto-calculate when input changes
    if (input.area > 0) {
      handleCalculate();
    }
  }, [input]);

  const handleCalculate = async () => {
    setIsCalculating(true);
    try {
      const calculationResult = calculator.calculate(input);
      setResult(calculationResult);
    } catch (error) {
      toast({
        title: "Beräkningsfel",
        description: "Ett fel uppstod vid beräkningen. Kontrollera dina indata.",
        variant: "destructive"
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const updateInput = (updates: Partial<RoofCalculatorInput>) => {
    setInput(prev => ({ ...prev, ...updates }));
  };

  const switchToProMode = () => {
    updateInput({ mode: 'pro' });
    toast({
      title: "Pro-läge aktiverat",
      description: "Fyll i extra fält för mer exakta resultat."
    });
  };

  const handleAddToMaterialOrder = () => {
    if (!result || !onAddToOrder) return;
    
    onAddToOrder(result.materials);
    toast({
      title: "Material tillagt",
      description: `${result.materials.length} materialposter har lagts till i beställningen.`
    });
  };

  const selectedTileProfile = tileProfiles.find(p => p.id === input.tileProfile);

  const shouldShowProPrompt = result?.riskFactors && (
    result.riskFactors.lowPitch ||
    result.riskFactors.highPitch ||
    result.riskFactors.complexRoof ||
    result.riskFactors.coastalExposure ||
    result.riskFactors.longRoofRuns
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Automatisk Takberäkning
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={input.mode === 'quick' ? 'default' : 'secondary'}>
              {input.mode === 'quick' ? 'Quick-läge' : 'Pro-läge'}
            </Badge>
            {result && (
              <Badge variant={
                result.confidence === 'high' ? 'default' : 
                result.confidence === 'medium' ? 'secondary' : 'destructive'
              }>
                {result.confidence === 'high' ? 'Hög precision' : 
                 result.confidence === 'medium' ? 'Medium precision' : 'Låg precision'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="input" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="input">Indata</TabsTrigger>
              <TabsTrigger value="results">Resultat</TabsTrigger>
              <TabsTrigger value="admin">Inställningar</TabsTrigger>
            </TabsList>

            <TabsContent value="input" className="space-y-6">
              {/* Basic Input */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="roofType">Taktyp</Label>
                  <Select
                    value={input.roofType}
                    onValueChange={(value: RoofType) => updateInput({ roofType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sadeltak">Sadeltak</SelectItem>
                      <SelectItem value="valmat">Valmat</SelectItem>
                      <SelectItem value="pulpettak">Pulpettak</SelectItem>
                      <SelectItem value="mansard">Mansard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="area">Takyta (m²)</Label>
                  <Input
                    id="area"
                    type="number"
                    value={input.area}
                    onChange={(e) => updateInput({ area: Number(e.target.value) })}
                    min="1"
                    step="1"
                  />
                </div>

                <div>
                  <Label htmlFor="tileProfile">Pannmodell</Label>
                  <Select
                    value={input.tileProfile}
                    onValueChange={(value) => updateInput({ tileProfile: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tileProfiles.map(profile => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.name} ({profile.supplier})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTileProfile && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {selectedTileProfile.tilesPerM2} pannor/m² • Läktavstånd: {selectedTileProfile.battingSpacing}mm
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="windZone">Vindzon</Label>
                  <Select
                    value={input.windZone}
                    onValueChange={(value: WindZone) => updateInput({ windZone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inland">Inland</SelectItem>
                      <SelectItem value="vindutsatt">Vindutsatt</SelectItem>
                      <SelectItem value="kust">Kust</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="newSheathing"
                    checked={input.newSheathing}
                    onCheckedChange={(checked) => updateInput({ newSheathing: checked as boolean })}
                  />
                  <Label htmlFor="newSheathing">Ny råspont</Label>
                </div>
              </div>

              {/* Pro Mode Fields */}
              {input.mode === 'pro' && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Pro-läge: Exakta mått</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="ridgeLength">Nocklängd (m)</Label>
                        <Input
                          id="ridgeLength"
                          type="number"
                          value={input.ridgeLength || ''}
                          onChange={(e) => updateInput({ ridgeLength: Number(e.target.value) || undefined })}
                          placeholder="Automatisk beräkning"
                          step="0.1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="roofPitch">Taklutning (°)</Label>
                        <Input
                          id="roofPitch"
                          type="number"
                          value={input.roofPitch || ''}
                          onChange={(e) => updateInput({ roofPitch: Number(e.target.value) || undefined })}
                          placeholder="Standard 25°"
                          min="5"
                          max="60"
                          step="1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="facadeHeight">Fasadhöjd (m)</Label>
                        <Input
                          id="facadeHeight"
                          type="number"
                          value={input.facadeHeight || ''}
                          onChange={(e) => updateInput({ facadeHeight: Number(e.target.value) || undefined })}
                          placeholder="Standard 6m"
                          step="0.1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="rafterSpacing">Takstolsavstånd (mm)</Label>
                        <Input
                          id="rafterSpacing"
                          type="number"
                          value={input.rafterSpacing || ''}
                          onChange={(e) => updateInput({ rafterSpacing: Number(e.target.value) || undefined })}
                          placeholder="Standard 600mm"
                          step="50"
                        />
                      </div>

                      <div>
                        <Label htmlFor="penetrations">Antal genomföringar</Label>
                        <Input
                          id="penetrations"
                          type="number"
                          value={input.numberOfPenetrations || ''}
                          onChange={(e) => updateInput({ numberOfPenetrations: Number(e.target.value) || undefined })}
                          placeholder="0"
                          min="0"
                          step="1"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Risk Warnings */}
              {shouldShowProPrompt && input.mode === 'quick' && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    För exakt resultat rekommenderas Pro-läge för detta projekt.
                    <Button variant="link" className="p-0 ml-1 h-auto" onClick={switchToProMode}>
                      Växla till Pro-läge
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="results" className="space-y-6">
              {result ? (
                <>
                  {/* Warnings */}
                  {result.warnings.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          {result.warnings.map((warning, index) => (
                            <div key={index}>• {warning}</div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Recommendations */}
                  {result.recommendations.length > 0 && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          {result.recommendations.map((rec, index) => (
                            <div key={index}>• {rec}</div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Material List */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Materiallista</h3>
                    
                    {/* Group materials by category */}
                    {Object.entries(
                      result.materials.reduce((groups, material) => {
                        const category = material.category;
                        if (!groups[category]) groups[category] = [];
                        groups[category].push(material);
                        return groups;
                      }, {} as Record<string, MaterialQuantity[]>)
                    ).map(([category, materials]) => (
                      <Card key={category}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">{category}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-2">
                            {materials.map(material => (
                              <div key={material.id} className="flex justify-between items-center">
                                <div className="flex-1">
                                  <div className="font-medium">{material.name}</div>
                                  {material.notes && (
                                    <div className="text-xs text-muted-foreground">{material.notes}</div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold">
                                    {material.quantity.toLocaleString('sv-SE')} {material.unit}
                                  </div>
                                  {material.packQuantity && (
                                    <div className="text-xs text-muted-foreground">
                                      ({material.packQuantity} {material.packSize ? `paket à ${material.packSize}` : 'paket'})
                                    </div>
                                  )}
                                  {material.isEstimate && (
                                    <Badge variant="outline" className="text-xs">Uppskattning</Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3">
                    {onAddToOrder && (
                      <Button onClick={handleAddToMaterialOrder}>
                        <Save className="w-4 h-4 mr-2" />
                        Lägg till i beställning
                      </Button>
                    )}
                    
                    <Button variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Exportera PDF
                    </Button>

                    {onSaveTemplate && (
                      <Button variant="outline" onClick={() => onSaveTemplate({
                        name: `${input.roofType} ${input.area}m²`,
                        input,
                        materials: result.materials
                      })}>
                        <Save className="w-4 h-4 mr-2" />
                        Spara som mall
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {isCalculating ? 'Beräknar...' : 'Fyll i takdata för att se resultat'}
                </div>
              )}
            </TabsContent>

            <TabsContent value="admin" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Koefficientinställningar
                </h3>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Administratörsfunktioner för att justera beräkningskoefficienter kommer här.
                    Denna sektion kräver administratörsbehörighet.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}