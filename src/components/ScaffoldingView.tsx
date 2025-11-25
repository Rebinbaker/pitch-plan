import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Truck, MapPin, User, Plus, Trash2 } from 'lucide-react';
import { ScaffoldingTrailer, ScaffoldingStatus, ScaffoldingOwnership } from '@/types/scaffolding';
import { calculateRemainingTime, formatDaysRemaining } from '@/utils/timeCalculations';
import { formatInTimeZone } from 'date-fns-tz';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ScaffoldingViewProps {
  scaffolding: ScaffoldingTrailer[];
  onUpdateScaffolding: (updated: ScaffoldingTrailer) => void;
  onAddScaffolding: (trailer: ScaffoldingTrailer) => void;
  onDeleteScaffolding: (trailerId: string) => void;
  onReloadScaffolding?: () => void;
  projects?: any[]; // Add projects to calculate remaining time
}

export function ScaffoldingView({ scaffolding, onUpdateScaffolding, onAddScaffolding, onDeleteScaffolding, onReloadScaffolding, projects = [] }: ScaffoldingViewProps) {
  const [editingTrailer, setEditingTrailer] = useState<ScaffoldingTrailer | null>(null);
  const [filterStatus, setFilterStatus] = useState<ScaffoldingStatus | 'all'>('all');
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);

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

  const handleCleanupDuplicates = async () => {
    setIsCleaningDuplicates(true);
    try {
      // Fetch all scaffolding from Supabase
      const { data: allScaffolding, error: fetchError } = await supabase
        .from('scaffolding')
        .select('id, name, updated_at, created_at')
        .order('name');

      if (fetchError) throw fetchError;

      if (!allScaffolding || allScaffolding.length === 0) {
        toast({
          title: 'Inga dubletter',
          description: 'Inga släpvagnar hittades.',
        });
        return;
      }

      // Group by name (case-insensitive and trimmed)
      const groupedByName = new Map<string, any[]>();
      allScaffolding.forEach((record) => {
        const normalizedName = record.name.trim().toLowerCase();
        if (!groupedByName.has(normalizedName)) {
          groupedByName.set(normalizedName, []);
        }
        groupedByName.get(normalizedName)!.push(record);
      });

      // Find duplicates
      const idsToDelete: string[] = [];
      groupedByName.forEach((records) => {
        if (records.length > 1) {
          // Sort by updated_at DESC (most recent first)
          records.sort((a, b) => {
            const dateA = new Date(a.updated_at || a.created_at).getTime();
            const dateB = new Date(b.updated_at || b.created_at).getTime();
            return dateB - dateA;
          });

          // Keep the first, delete the rest
          const [, ...toDelete] = records;
          idsToDelete.push(...toDelete.map(r => r.id));
        }
      });

      if (idsToDelete.length === 0) {
        toast({
          title: 'Inga dubletter',
          description: 'Inga dubbletter hittades.',
        });
        return;
      }

      // Delete duplicates
      const { error: deleteError } = await supabase
        .from('scaffolding')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) throw deleteError;

      toast({
        title: 'Dubletter rensade',
        description: `${idsToDelete.length} dubbletter har tagits bort.`,
      });

      // Reload scaffolding
      if (onReloadScaffolding) {
        onReloadScaffolding();
      }
    } catch (error) {
      console.error('Error cleaning duplicates:', error);
      toast({
        variant: 'destructive',
        title: 'Fel vid rensning',
        description: 'Kunde inte rensa dubbletter. Försök igen.',
      });
    } finally {
      setIsCleaningDuplicates(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Scaffolding Logistics</h2>
          <p className="text-muted-foreground">Track and manage scaffolding trailers</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleCleanupDuplicates}
            disabled={isCleaningDuplicates}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {isCleaningDuplicates ? 'Rensar...' : 'Rensa dubletter'}
          </Button>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Nytt släp
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Lägg till nytt släp</DialogTitle>
              </DialogHeader>
              <NewTrailerForm onSave={onAddScaffolding} />
            </DialogContent>
          </Dialog>
          
          <Select value={filterStatus} onValueChange={(value: ScaffoldingStatus | 'all') => setFilterStatus(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla statusar</SelectItem>
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
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    {trailer.name}
                  </CardTitle>
                  {trailer.ownership && (
                    <span className="text-xs text-muted-foreground">
                      {trailer.ownership}
                    </span>
                  )}
                </div>
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
              
              {/* Time estimation for scaffolding availability */}
              {trailer.assignedProject && trailer.status === 'I bruk' && (
                (() => {
                  const project = projects.find(p => p.name === trailer.assignedProject);
                  if (project) {
                    const timeEstimate = calculateRemainingTime(project);
                    return (
                      <div className="bg-blue-50 dark:bg-blue-950/20 p-2 rounded border border-blue-200 dark:border-blue-800">
                        <div className="text-xs font-medium text-blue-700 dark:text-blue-300">
                          Ställning ledig om: {formatDaysRemaining(timeEstimate.scaffoldingRemainingDays)}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()
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
                    onDelete={onDeleteScaffolding}
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
  onDelete: (trailerId: string) => void;
}

function ScaffoldingEditForm({ trailer, onSave, onDelete }: ScaffoldingEditFormProps) {
  const [formData, setFormData] = useState(trailer);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      lastUpdated: formatInTimeZone(new Date(), 'Europe/Stockholm', 'yyyy-MM-dd HH:mm:ss'),
    });
  };

  const handleDelete = () => {
    onDelete(trailer.id);
    setShowDeleteConfirm(false);
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
        <label className="text-sm font-medium">Tilldelat projekt</label>
        <Input
          value={formData.assignedProject || ''}
          onChange={(e) => setFormData({ ...formData, assignedProject: e.target.value })}
          placeholder="Projektnamn"
        />
      </div>
      
      <div>
        <label className="text-sm font-medium">Plats</label>
        <Input
          value={formData.location || ''}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="Nuvarande plats"
        />
      </div>
      
      <div>
        <label className="text-sm font-medium">Transportanteckning</label>
        <Textarea
          value={formData.moverNote || ''}
          onChange={(e) => setFormData({ ...formData, moverNote: e.target.value })}
          placeholder="Vem ska flytta denna släpvagn?"
        />
      </div>
      
      <div className="flex gap-2">
        <Button type="submit" className="flex-1">
          Spara ändringar
        </Button>
        
        {!showDeleteConfirm ? (
          <Button 
            type="button"
            variant="destructive" 
            onClick={() => setShowDeleteConfirm(true)}
            className="flex-1"
          >
            Radera
          </Button>
        ) : (
          <Button 
            type="button"
            variant="destructive" 
            onClick={handleDelete}
            className="flex-1"
          >
            Bekräfta radering
          </Button>
        )}
      </div>
      
      {showDeleteConfirm && (
        <p className="text-sm text-destructive text-center">
          Klicka igen för att bekräfta radering
        </p>
      )}
    </form>
  );
}

interface NewTrailerFormProps {
  onSave: (trailer: ScaffoldingTrailer) => void;
}

function NewTrailerForm({ onSave }: NewTrailerFormProps) {
  const [trailerNumber, setTrailerNumber] = useState('');
  const [ownership, setOwnership] = useState<ScaffoldingOwnership>('Egna ställningar');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trailerNumber) return;

    const trailer: ScaffoldingTrailer = {
      id: crypto.randomUUID(),
      name: trailerNumber,
      status: 'Tillgänglig',
      ownership,
      moverNote: '',
      lastUpdated: formatInTimeZone(new Date(), 'Europe/Stockholm', 'yyyy-MM-dd HH:mm:ss'),
    };

    onSave(trailer);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Släp nummer</label>
        <Input
          value={trailerNumber}
          onChange={(e) => setTrailerNumber(e.target.value)}
          placeholder="t.ex. Släp-001"
          required
        />
      </div>
      
      <div>
        <label className="text-sm font-medium">Typ av ställningar</label>
        <Select value={ownership} onValueChange={(value: ScaffoldingOwnership) => setOwnership(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Egna ställningar">Egna ställningar</SelectItem>
            <SelectItem value="Inhyrda ställningar">Inhyrda ställningar</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Button type="submit" className="w-full" disabled={!trailerNumber}>
        Lägg till släp
      </Button>
    </form>
  );
}