import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, MapPin, ChevronRight, ArrowLeft } from 'lucide-react';
import { useResources } from '@/hooks/useResources';
import { useUserRole } from '@/hooks/useUserRole';
import { SWEDISH_COUNTIES } from '@/data/swedishCounties';
import { RESOURCE_TYPES, getResourceTypeConfig } from '@/data/resourceTypes';
import { ResourceCard } from './ResourceCard';
import { AddEditResourceModal } from './AddEditResourceModal';
import { Resource } from '@/types/resource';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function ResourcesView() {
  const { resources, loading, addResource, updateResource, deleteResource, toggleFavorite } = useResources();
  const { isAdmin } = useUserRole();
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTypes, setActiveTypes] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Resource | null>(null);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    resources.forEach((r) => r.counties.forEach((c) => map.set(c, (map.get(c) || 0) + 1)));
    return map;
  }, [resources]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return resources.filter((r) => {
      if (selectedCounty && !r.counties.includes(selectedCounty)) return false;
      if (activeTypes.length > 0 && !r.resourceTypes.some((t) => activeTypes.includes(t))) return false;
      if (!q) return true;
      const hay = [r.name, r.company, r.contactPerson, r.city, r.notes, ...r.resourceTypes.map((t) => getResourceTypeConfig(t).label)]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    }).sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite) || a.name.localeCompare(b.name));
  }, [resources, selectedCounty, activeTypes, search]);

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (r: Resource) => { setEditing(r); setModalOpen(true); };

  const handleSave = (input: any) => {
    if (editing) updateResource(editing.id, input);
    else addResource(input);
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Laddar resurser...</div>;
  }

  // County overview
  if (!selectedCounty) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Resurser</h2>
            <p className="text-sm text-muted-foreground">Externa kontakter per län – transportörer, leverantörer, hantverkare m.m.</p>
          </div>
          <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Lägg till resurs</Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Sök bland alla resurser..." className="pl-9" />
        </div>

        {search && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{filtered.length} träffar</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map((r) => (
                <ResourceCard
                  key={r.id}
                  resource={r}
                  onEdit={() => openEdit(r)}
                  onDelete={isAdmin ? () => setPendingDelete(r) : undefined}
                  onToggleFavorite={() => toggleFavorite(r.id)}
                />
              ))}
            </div>
          </div>
        )}

        {!search && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {SWEDISH_COUNTIES.map((county) => {
              const count = counts.get(county) || 0;
              return (
                <Card
                  key={county}
                  className="cursor-pointer hover:shadow-md hover:border-primary transition-all"
                  onClick={() => setSelectedCounty(county)}
                >
                  <CardContent className="p-4 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                        <h3 className="font-semibold truncate">{county.replace(' län', '')}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground">{count} {count === 1 ? 'resurs' : 'resurser'}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <AddEditResourceModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} initial={editing} />
        <DeleteDialog resource={pendingDelete} onCancel={() => setPendingDelete(null)} onConfirm={() => { if (pendingDelete) deleteResource(pendingDelete.id); setPendingDelete(null); }} />
      </div>
    );
  }

  // County detail view
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelectedCounty(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" />Tillbaka
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{selectedCounty}</h2>
            <p className="text-sm text-muted-foreground">{filtered.length} resurser</p>
          </div>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Lägg till</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Sök i länet..." className="pl-9" />
      </div>

      <div className="flex flex-wrap gap-2">
        {RESOURCE_TYPES.map((t) => {
          const active = activeTypes.includes(t.value);
          const Icon = t.icon;
          return (
            <button
              key={t.value}
              onClick={() => setActiveTypes((cur) => cur.includes(t.value) ? cur.filter((v) => v !== t.value) : [...cur, t.value])}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border transition ${
                active ? t.color + ' border-transparent' : 'bg-background border-border hover:bg-muted'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
        {activeTypes.length > 0 && (
          <button onClick={() => setActiveTypes([])} className="text-xs text-muted-foreground hover:text-foreground underline">
            Rensa filter
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Inga resurser matchar. <Button variant="link" onClick={openAdd}>Lägg till en resurs</Button>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((r) => (
            <ResourceCard
              key={r.id}
              resource={r}
              onEdit={() => openEdit(r)}
              onDelete={isAdmin ? () => setPendingDelete(r) : undefined}
              onToggleFavorite={() => toggleFavorite(r.id)}
            />
          ))}
        </div>
      )}

      <AddEditResourceModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initial={editing}
        defaultCounty={selectedCounty}
      />
      <DeleteDialog resource={pendingDelete} onCancel={() => setPendingDelete(null)} onConfirm={() => { if (pendingDelete) deleteResource(pendingDelete.id); setPendingDelete(null); }} />
    </div>
  );
}

function DeleteDialog({ resource, onCancel, onConfirm }: { resource: Resource | null; onCancel: () => void; onConfirm: () => void }) {
  return (
    <AlertDialog open={!!resource} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Radera resurs?</AlertDialogTitle>
          <AlertDialogDescription>
            Vill du radera {resource?.name}? Detta går inte att ångra.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Avbryt</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Radera</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
