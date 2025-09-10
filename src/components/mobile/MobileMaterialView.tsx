import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, TrendingUp, AlertTriangle, Search, Plus, Truck } from 'lucide-react';

interface MobileMaterialViewProps {
  projects?: any[];
}

export function MobileMaterialView({ projects = [] }: MobileMaterialViewProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Mock material data
  const materialStats = {
    totalOrders: 24,
    pendingOrders: 5,
    totalValue: 145000,
    lowStock: 3
  };

  const recentOrders = [
    {
      id: '1',
      project: 'Villa Andersson',
      material: 'Takpannor',
      quantity: '150 st',
      status: 'delivered',
      date: '2024-01-15',
      value: 25000
    },
    {
      id: '2',
      project: 'Kontor Stockholm',
      material: 'Isolering',
      quantity: '200 m²',
      status: 'pending',
      date: '2024-01-12',
      value: 18000
    },
    {
      id: '3',
      project: 'Lager Göteborg',
      material: 'Plåt',
      quantity: '50 m²',
      status: 'ordered',
      date: '2024-01-10',
      value: 12000
    }
  ];

  const lowStockItems = [
    { name: 'Takpannor Röd', stock: 25, minimum: 100, unit: 'st' },
    { name: 'Isolering 100mm', stock: 45, minimum: 200, unit: 'm²' },
    { name: 'Takplåt Antracit', stock: 8, minimum: 50, unit: 'm²' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-success text-success-foreground';
      case 'ordered': return 'bg-info text-info-foreground';
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'cancelled': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'delivered': return 'Levererad';
      case 'ordered': return 'Beställd';
      case 'pending': return 'Väntande';
      case 'cancelled': return 'Avbruten';
      default: return status;
    }
  };

  const filteredOrders = recentOrders.filter(order =>
    order.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.material.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Material</h2>
          <p className="text-sm text-muted-foreground">Översikt och beställningar</p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Beställ
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Package className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{materialStats.totalOrders}</p>
            <p className="text-xs text-muted-foreground">Totala beställningar</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">
              {(materialStats.totalValue / 1000).toFixed(0)}k
            </p>
            <p className="text-xs text-muted-foreground">SEK totalt värde</p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {materialStats.lowStock > 0 && (
        <Card className="border-warning bg-warning/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Lågt lager ({materialStats.lowStock} artiklar)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {lowStockItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-card rounded">
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.stock} {item.unit} kvar (min {item.minimum})
                    </p>
                  </div>
                  <Button size="sm" variant="outline">
                    Beställ
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Sök beställningar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Senaste beställningar</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {filteredOrders.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              Inga beställningar hittades
            </p>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <div key={order.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{order.material}</h4>
                      <p className="text-xs text-muted-foreground">{order.project}</p>
                    </div>
                    <Badge className={`text-xs ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3 text-muted-foreground" />
                        <span>{order.quantity}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Truck className="h-3 w-3 text-muted-foreground" />
                        <span>{order.date}</span>
                      </div>
                    </div>
                    <p className="font-semibold">
                      {(order.value / 1000).toFixed(0)}k SEK
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}