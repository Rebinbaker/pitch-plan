import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Package, Info, CheckCircle } from 'lucide-react';
import { Project, AllocatedMaterial, getMaterialUnit } from '@/types/project';

interface AllocatedMaterialsViewProps {
  project: Project;
}

export function AllocatedMaterialsView({ project }: AllocatedMaterialsViewProps) {
  const allocatedMaterials = project.allocatedMaterials || [];
  
  if (allocatedMaterials.length === 0) {
    return null;
  }

  return (
    <Card className="border-success/20 bg-success/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-success">
          <Package className="w-5 h-5" />
          Tillgängligt Material
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-info/20 bg-info/5">
          <Info className="h-4 w-4 text-info" />
          <AlertDescription className="text-info-foreground">
            <strong>OBS!</strong> Detta projekt har tillgängligt material från tidigare projekt. 
            Ta hänsyn till detta när du beställer nytt material.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-3">
          {allocatedMaterials.map((allocation) => (
            <div key={allocation.id} className="p-3 border rounded-lg bg-background">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Från projekt: {allocation.sourceProjectName}</span>
                  <Badge variant="secondary" className="bg-success/20 text-success border-success/30 text-xs">
                    Allokerat
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(allocation.allocatedAt).toLocaleDateString('sv-SE')}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Tillgängligt material:</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {allocation.materials.map((material, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-3 h-3 text-success" />
                      <span>
                        {material.materialType === 'Annat' && material.customMaterialType 
                          ? material.customMaterialType 
                          : material.materialType}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {material.squareMeters} {getMaterialUnit(material.materialType)}
                      </Badge>
                    </div>
                  ))}
                </div>
                
                {allocation.notes && (
                  <div className="mt-2 p-2 bg-muted/30 rounded text-xs text-muted-foreground">
                    <strong>Anteckning:</strong> {allocation.notes}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
          <div className="flex items-center gap-2 text-warning-foreground">
            <Info className="w-4 h-4" />
            <span className="text-sm font-medium">Påminnelse</span>
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Kontrollera att detta material verkligen kan användas i detta projekt innan du beställer nytt.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}