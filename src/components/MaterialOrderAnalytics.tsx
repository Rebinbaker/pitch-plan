import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Project } from '@/types/project';
import { BarChart, TrendingUp, Package, DollarSign, Recycle } from 'lucide-react';

interface MaterialOrderAnalyticsProps {
  projects: Project[];
}

export function MaterialOrderAnalytics({ projects }: MaterialOrderAnalyticsProps) {
  // Calculate analytics data
  const projectsWithOrders = projects.filter(p => p.materialOrder);
  const totalOrderValue = projectsWithOrders.reduce((sum, p) => {
    return sum + (p.materialOrder?.items.reduce((itemSum, item) => itemSum + (item.totalPrice || 0), 0) || 0);
  }, 0);

  const materialCounts = new Map<string, { quantity: number; value: number; count: number }>();
  const supplierCounts = new Map<string, { orders: number; value: number }>();
  const projectsWithSalvagedMaterial = projects.filter(p => 
    p.allocatedMaterials && p.allocatedMaterials.length > 0
  );

  projectsWithOrders.forEach(project => {
    project.materialOrder?.items.forEach(item => {
      // Material statistics
      const current = materialCounts.get(item.materialType) || { quantity: 0, value: 0, count: 0 };
      materialCounts.set(item.materialType, {
        quantity: current.quantity + item.quantity,
        value: current.value + (item.totalPrice || 0),
        count: current.count + 1
      });

      // Supplier statistics
      if (item.supplierName || item.supplier) {
        const supplierName = item.supplierName || item.supplier || 'Okänd leverantör';
        const supplierCurrent = supplierCounts.get(supplierName) || { orders: 0, value: 0 };
        supplierCounts.set(supplierName, {
          orders: supplierCurrent.orders + 1,
          value: supplierCurrent.value + (item.totalPrice || 0)
        });
      }
    });
  });

  const salvagedMaterialValue = projectsWithSalvagedMaterial.reduce((sum, project) => {
    return sum + (project.allocatedMaterials?.reduce((allocSum, alloc) => {
      return allocSum + alloc.materials.reduce((matSum, mat) => matSum + (mat.squareMeters * 50), 0); // 50 kr per kvm estimated
    }, 0) || 0);
  }, 0);

  const topMaterials = Array.from(materialCounts.entries())
    .sort((a, b) => b[1].value - a[1].value)
    .slice(0, 5);

  const topSuppliers = Array.from(supplierCounts.entries())
    .sort((a, b) => b[1].value - a[1].value)
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart className="w-5 h-5" />
          Materialbeställnings-analys
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Översikt</TabsTrigger>
            <TabsTrigger value="materials">Material</TabsTrigger>
            <TabsTrigger value="suppliers">Leverantörer</TabsTrigger>
            <TabsTrigger value="savings">Besparingar</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-primary/10 rounded-lg text-center">
                <Package className="w-8 h-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{projectsWithOrders.length}</div>
                <div className="text-sm text-muted-foreground">Aktiva beställningar</div>
              </div>
              
              <div className="p-4 bg-success/10 rounded-lg text-center">
                <DollarSign className="w-8 h-8 mx-auto mb-2 text-success" />
                <div className="text-2xl font-bold">{totalOrderValue.toLocaleString('sv-SE')} kr</div>
                <div className="text-sm text-muted-foreground">Total ordervolym</div>
              </div>
              
              <div className="p-4 bg-warning/10 rounded-lg text-center">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 text-warning" />
                <div className="text-2xl font-bold">{Math.round(totalOrderValue / projectsWithOrders.length).toLocaleString('sv-SE')} kr</div>
                <div className="text-sm text-muted-foreground">Snitt per projekt</div>
              </div>
              
              <div className="p-4 bg-info/10 rounded-lg text-center">
                <Recycle className="w-8 h-8 mx-auto mb-2 text-info" />
                <div className="text-2xl font-bold">{salvagedMaterialValue.toLocaleString('sv-SE')} kr</div>
                <div className="text-sm text-muted-foreground">Värde avvarat material</div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="materials" className="space-y-4">
            <h4 className="font-medium">Mest beställda material (värde)</h4>
            <div className="space-y-3">
              {topMaterials.map(([material, data]) => (
                <div key={material} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{material}</div>
                    <div className="text-sm text-muted-foreground">
                      {data.quantity.toLocaleString('sv-SE')} enheter • {data.count} beställningar
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {data.value.toLocaleString('sv-SE')} kr
                  </Badge>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="suppliers" className="space-y-4">
            <h4 className="font-medium">Största leverantörer (ordervolym)</h4>
            <div className="space-y-3">
              {topSuppliers.map(([supplier, data]) => (
                <div key={supplier} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{supplier}</div>
                    <div className="text-sm text-muted-foreground">
                      {data.orders} beställningar
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {data.value.toLocaleString('sv-SE')} kr
                  </Badge>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="savings" className="space-y-4">
            <div className="grid gap-4">
              <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                <h4 className="font-medium text-success mb-2">Besparingar genom avvarat material</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Projekt med allokerat material:</span>
                    <span className="font-medium">{projectsWithSalvagedMaterial.length} st</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Uppskattat värde:</span>
                    <span className="font-medium text-success">{salvagedMaterialValue.toLocaleString('sv-SE')} kr</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Miljöbesparing:</span>
                    <span className="font-medium text-success">
                      {Math.round(salvagedMaterialValue * 0.15).toLocaleString('sv-SE')} kg CO₂
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-info/10 border border-info/20 rounded-lg">
                <h4 className="font-medium text-info mb-2">Rekommendationer</h4>
                <ul className="space-y-1 text-sm">
                  <li>• Kontrollera Linköpingsparken innan nya beställningar</li>
                  <li>• Förhandla volymrabatter med toppleverantörer</li>
                  <li>• Planera beställningar för att undvika expressleveranser</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}