import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MaterialOrderItem } from '@/types/project';
import { Calculator, TrendingUp, AlertTriangle } from 'lucide-react';

interface MaterialPriceData {
  materialType: string;
  currentPrice: number;
  priceChange: number; // Percentage change from last month
  priceWarning?: string;
}

const mockPriceData: MaterialPriceData[] = [
  { materialType: 'Takpannor', currentPrice: 85, priceChange: 2.5, priceWarning: 'Pris stigande p.g.a. råvarubrist' },
  { materialType: 'Takpapp', currentPrice: 25, priceChange: -1.2 },
  { materialType: 'Underlag/Reglar', currentPrice: 18, priceChange: 5.8, priceWarning: 'Kraftig prisökning senaste månaden' },
  { materialType: 'Isolering', currentPrice: 45, priceChange: 0.5 },
  { materialType: 'Plåt', currentPrice: 120, priceChange: 8.2, priceWarning: 'Historiskt hög prisnivå' }
];

interface MaterialCostCalculatorProps {
  items: MaterialOrderItem[];
  onUpdateItem: (id: string, updates: Partial<MaterialOrderItem>) => void;
}

export function MaterialCostCalculator({ items, onUpdateItem }: MaterialCostCalculatorProps) {
  const [priceData] = useState<MaterialPriceData[]>(mockPriceData);
  const [totalCost, setTotalCost] = useState(0);
  const [estimatedDeliveryDays, setEstimatedDeliveryDays] = useState(0);

  useEffect(() => {
    const total = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    setTotalCost(total);
    
    // Calculate estimated delivery time (mock logic)
    const maxDeliveryDays = items.reduce((max, item) => {
      const deliveryDays = getEstimatedDeliveryDays(item.materialType);
      return Math.max(max, deliveryDays);
    }, 0);
    setEstimatedDeliveryDays(maxDeliveryDays);
  }, [items]);

  const getEstimatedDeliveryDays = (materialType: string): number => {
    const deliveryTimes: Record<string, number> = {
      'Takpannor': 14,
      'Takpapp': 3,
      'Underlag/Reglar': 7,
      'Isolering': 5,
      'Plåt': 21,
      'Annat': 10
    };
    return deliveryTimes[materialType] || 10;
  };

  const getPriceInfo = (materialType: string) => {
    return priceData.find(p => p.materialType === materialType);
  };

  const updateItemWithCurrentPrice = (item: MaterialOrderItem) => {
    const priceInfo = getPriceInfo(item.materialType);
    if (priceInfo && priceInfo.currentPrice !== item.unitPrice) {
      const newTotalPrice = item.quantity * priceInfo.currentPrice;
      onUpdateItem(item.id, {
        unitPrice: priceInfo.currentPrice,
        totalPrice: newTotalPrice
      });
    }
  };

  const getPriceChangeColor = (change: number) => {
    if (change > 5) return 'destructive';
    if (change > 0) return 'secondary';
    return 'completed';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Kostnadskalkyl & Marknadsinfo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-primary/10 rounded-lg">
            <div className="text-sm text-muted-foreground">Total kostnad</div>
            <div className="text-2xl font-bold text-primary">
              {totalCost.toLocaleString('sv-SE')} kr
            </div>
          </div>
          <div className="p-4 bg-warning/10 rounded-lg">
            <div className="text-sm text-muted-foreground">Beräknad leveranstid</div>
            <div className="text-2xl font-bold text-warning">
              {estimatedDeliveryDays} dagar
            </div>
          </div>
        </div>

        {/* Price information per item */}
        <div className="space-y-3">
          <h4 className="font-medium">Aktuella marknadspriser</h4>
          {items.map((item) => {
            const priceInfo = getPriceInfo(item.materialType);
            if (!priceInfo) return null;

            const isCurrentPrice = item.unitPrice === priceInfo.currentPrice;
            const deliveryDays = getEstimatedDeliveryDays(item.materialType);

            return (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{item.materialType}</div>
                  <div className="text-sm text-muted-foreground">
                    {item.quantity} {item.unit} × {priceInfo.currentPrice} kr
                  </div>
                  {priceInfo.priceWarning && (
                    <div className="flex items-center gap-1 text-xs text-warning mt-1">
                      <AlertTriangle className="w-3 h-3" />
                      {priceInfo.priceWarning}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant={getPriceChangeColor(priceInfo.priceChange)}>
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {priceInfo.priceChange > 0 ? '+' : ''}{priceInfo.priceChange}%
                  </Badge>
                  
                  <div className="text-sm text-muted-foreground">
                    {deliveryDays} dagar
                  </div>
                  
                  {!isCurrentPrice && (
                    <button
                      onClick={() => updateItemWithCurrentPrice(item)}
                      className="text-xs text-primary hover:underline"
                    >
                      Uppdatera pris
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Seasonal warnings */}
        <div className="p-3 bg-info/10 border border-info/20 rounded-lg">
          <div className="flex items-center gap-2 text-info font-medium mb-1">
            <AlertTriangle className="w-4 h-4" />
            Säsongsinfo
          </div>
          <div className="text-sm text-muted-foreground">
            Vintersäsong (nov-feb): Takpannor och plåt kan ha förlängda leveranstider. 
            Planera beställningar i god tid.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}