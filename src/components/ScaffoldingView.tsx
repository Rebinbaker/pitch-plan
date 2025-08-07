import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Truck, MapPin, User, Plus } from 'lucide-react';
import { ScaffoldingTrailer, ScaffoldingStatus } from '@/types/scaffolding';

interface ScaffoldingViewProps {
  scaffolding: ScaffoldingTrailer[];
  onUpdateScaffolding: (updated: ScaffoldingTrailer) => void;
}

export function ScaffoldingView({ scaffolding, onUpdateScaffolding }: ScaffoldingViewProps) {
  const [editingTrailer, setEditingTrailer] = useState<ScaffoldingTrailer | null>(null);
  const [filterStatus, setFilterStatus] = useState<ScaffoldingStatus | 'all'>('all');

  const filteredScaffolding = scaffolding.filter(trailer => 
    filterStatus === 'all' || trailer.status === filterStatus
  );

  const getStatusColor = (status: ScaffoldingStatus) => {
    switch (status) {
      case 'Tillgänglig': return 'bg-green-500';
      case 'I bruk': return 'bg-blue-500';
      case 'Under transport': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const handleUpdateTrailer = (trailer: ScaffoldingTrailer) => {
    onUpdateScaffolding(trailer);
    setEditingTrailer(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Scaffolding Logistics</h2>
          <p className="text-muted-foreground">Track and manage scaffolding trailers</p>
        </div>
        
        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={(value: ScaffoldingStatus | 'all') => setFilterStatus(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Tillgänglig">Tillgänglig</SelectItem>
              <SelectItem value="I bruk">I bruk</SelectItem>
              <SelectItem value="Under transport">Under transport</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {scaffolding.filter(s => s.status === 'Tillgänglig').length}
            </div>
            <div className="text-sm text-muted-foreground">Tillgänglig</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {scaffolding.filter(s => s.status === 'I bruk').length}
            </div>
            <div className="text-sm text-muted-foreground">I bruk</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {scaffolding.filter(s => s.status === 'Under transport').length}
            </div>
            <div className="text-sm text-muted-foreground">Under transport</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">
              {scaffolding.length}
            </div>
            <div className="text-sm text-muted-foreground">Total Trailers</div>
          </CardContent>
        </Card>
      </div>

      {/* Scaffolding List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredScaffolding.map(trailer => (
          <Card key={trailer.id} className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  {trailer.name}
                </CardTitle>
                <Badge variant="secondary" className={`${getStatusColor(trailer.status)} text-white`}>
                  {trailer.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {trailer.assignedProject && (
                <div className="space-y-1">
                  <div className="text-sm font-medium text-foreground">Assigned Project</div>
                  <div className="text-sm text-muted-foreground">{trailer.assignedProject}</div>
                </div>
              )}
              
              {trailer.location && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">{trailer.location}</div>
                </div>
              )}
              
              {trailer.moverNote && (
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">{trailer.moverNote}</div>
                </div>
              )}
              
              <div className="text-xs text-muted-foreground">
                Updated: {trailer.lastUpdated}
              </div>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    Edit Details
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit {trailer.name}</DialogTitle>
                  </DialogHeader>
                  <ScaffoldingEditForm
                    trailer={trailer}
                    onSave={handleUpdateTrailer}
                  />
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

interface ScaffoldingEditFormProps {
  trailer: ScaffoldingTrailer;
  onSave: (trailer: ScaffoldingTrailer) => void;
}

function ScaffoldingEditForm({ trailer, onSave }: ScaffoldingEditFormProps) {
  const [formData, setFormData] = useState(trailer);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      lastUpdated: new Date().toISOString().split('T')[0],
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Status</label>
        <Select 
          value={formData.status} 
          onValueChange={(value: ScaffoldingStatus) => 
            setFormData({ ...formData, status: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Tillgänglig">Tillgänglig</SelectItem>
            <SelectItem value="I bruk">I bruk</SelectItem>
            <SelectItem value="Under transport">Under transport</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <label className="text-sm font-medium">Assigned Project</label>
        <Input
          value={formData.assignedProject || ''}
          onChange={(e) => setFormData({ ...formData, assignedProject: e.target.value })}
          placeholder="Project name"
        />
      </div>
      
      <div>
        <label className="text-sm font-medium">Location</label>
        <Input
          value={formData.location || ''}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="Current location"
        />
      </div>
      
      <div>
        <label className="text-sm font-medium">Mover Note</label>
        <Textarea
          value={formData.moverNote || ''}
          onChange={(e) => setFormData({ ...formData, moverNote: e.target.value })}
          placeholder="Who will move this trailer?"
        />
      </div>
      
      <Button type="submit" className="w-full">
        Save Changes
      </Button>
    </form>
  );
}