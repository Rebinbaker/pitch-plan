import { useState } from 'react';
import { Plus, Search, Truck, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScaffoldingTrailer, ScaffoldingStatus } from '@/types/scaffolding';
import { MobileAddScaffoldingModal } from './MobileAddScaffoldingModal';

interface MobileScaffoldingViewProps {
  scaffolding: ScaffoldingTrailer[];
  onUpdateScaffolding: (trailer: ScaffoldingTrailer) => void;
  onAddScaffolding: (trailer: ScaffoldingTrailer) => void;
  onDeleteScaffolding: (trailerId: string) => void;
  projects?: any[];
}

export function MobileScaffoldingView({ 
  scaffolding, 
  onUpdateScaffolding, 
  onAddScaffolding,
  onDeleteScaffolding,
  projects = [] 
}: MobileScaffoldingViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filteredScaffolding = scaffolding.filter(trailer =>
    trailer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trailer.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: ScaffoldingStatus) => {
    switch (status) {
      case 'Tillgänglig': return 'bg-green-100 text-green-800 border-green-200';
      case 'I bruk': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Under transport': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: ScaffoldingStatus) => {
    switch (status) {
      case 'Tillgänglig': return 'Tillgänglig';
      case 'I bruk': return 'I bruk';
      case 'Under transport': return 'Transport';
      default: return status;
    }
  };

  const quickStatusUpdate = (trailer: ScaffoldingTrailer, newStatus: ScaffoldingStatus) => {
    onUpdateScaffolding({ ...trailer, status: newStatus });
  };

  const availableCount = filteredScaffolding.filter(t => t.status === 'Tillgänglig').length;
  const inUseCount = filteredScaffolding.filter(t => t.status === 'I bruk').length;
  const totalCount = filteredScaffolding.length;

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      {/* Mobile Header */}
      <div className="flex items-center justify-between sticky top-4 bg-background/95 backdrop-blur-sm z-10 py-2 -mx-4 px-4 border-b">
        <div>
          <h1 className="text-xl font-bold">Ställningsvagnar</h1>
          <p className="text-sm text-muted-foreground">
            {availableCount} tillgängliga • {inUseCount} i bruk
          </p>
        </div>
        <Button 
          onClick={() => setIsAddModalOpen(true)}
          size="sm"
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-1" />
          Ny
        </Button>
      </div>

      {/* Quick Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Sök vagnar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3">
          <div className="text-center">
            <div className="text-xl font-bold text-green-600">{availableCount}</div>
            <div className="text-xs text-muted-foreground">Tillgängliga</div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">{inUseCount}</div>
            <div className="text-xs text-muted-foreground">I bruk</div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-center">
            <div className="text-xl font-bold text-gray-600">
              {filteredScaffolding.filter(t => t.status === 'Under transport').length}
            </div>
            <div className="text-xs text-muted-foreground">Transport</div>
          </div>
        </Card>
      </div>

      {/* Scaffolding List */}
      <div className="space-y-3">
        {filteredScaffolding.length === 0 ? (
          <Card className="p-6 text-center">
            <div className="text-muted-foreground">
              {searchTerm ? 'Inga vagnar matchar din sökning' : 'Inga vagnar än'}
            </div>
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              variant="outline" 
              className="mt-3"
            >
              <Plus className="h-4 w-4 mr-1" />
              Lägg till första vagnen
            </Button>
          </Card>
        ) : (
          filteredScaffolding.map((trailer) => (
            <Card key={trailer.id} className="border border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold text-base leading-tight">
                        {trailer.name}
                      </h3>
                    </div>
                    <Badge className={`text-xs ${getStatusColor(trailer.status)}`}>
                      {getStatusLabel(trailer.status)}
                    </Badge>
                  </div>
                </div>

                {/* Description */}
                {trailer.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {trailer.description}
                  </p>
                )}

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {trailer.status !== 'Tillgänglig' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => quickStatusUpdate(trailer, 'Tillgänglig')}
                      className="text-xs h-8"
                    >
                      Markera tillgänglig
                    </Button>
                  )}
                  {trailer.status !== 'I bruk' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => quickStatusUpdate(trailer, 'I bruk')}
                      className="text-xs h-8"
                    >
                      Markera i bruk
                    </Button>
                  )}
                  {trailer.status !== 'Under transport' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => quickStatusUpdate(trailer, 'Under transport')}
                      className="text-xs h-8"
                    >
                      Transport
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Scaffolding Modal */}
      <MobileAddScaffoldingModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={(trailer) => {
          onAddScaffolding(trailer);
          setIsAddModalOpen(false);
        }}
      />
    </div>
  );
}