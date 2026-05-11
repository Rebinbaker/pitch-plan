import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useRegions } from '@/hooks/useRegions';
import { useToast } from '@/hooks/use-toast';

interface RegionSelectProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  includeAddNew?: boolean;
  triggerClassName?: string;
}

const ADD_NEW_VALUE = '__add_new_region__';

export function RegionSelect({
  value,
  onChange,
  placeholder = 'Välj region',
  includeAddNew = true,
  triggerClassName,
}: RegionSelectProps) {
  const { regions, addRegion, loading } = useRegions();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSelect = (val: string) => {
    if (val === ADD_NEW_VALUE) {
      setDialogOpen(true);
      return;
    }
    onChange(val);
  };

  const handleSave = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setSaving(true);
    const created = await addRegion(trimmed);
    setSaving(false);
    if (created) {
      onChange(created);
      setNewName('');
      setDialogOpen(false);
      toast({ title: 'Region tillagd', description: created });
    } else {
      toast({
        title: 'Kunde inte lägga till region',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Select value={value} onValueChange={handleSelect}>
        <SelectTrigger className={triggerClassName}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {loading && (
            <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> Laddar...
            </div>
          )}
          {!loading && regions.length === 0 && (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              Inga regioner än
            </div>
          )}
          {regions.map((r) => (
            <SelectItem key={r} value={r}>
              {r}
            </SelectItem>
          ))}
          {includeAddNew && (
            <SelectItem
              value={ADD_NEW_VALUE}
              className="text-primary font-medium"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-3.5 h-3.5" /> Lägg till ny region
              </span>
            </SelectItem>
          )}
        </SelectContent>
      </Select>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Lägg till ny region</DialogTitle>
            <DialogDescription>
              Den nya regionen blir tillgänglig för alla i din organisation.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="t.ex. Skåne"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSave();
              }
            }}
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Avbryt
            </Button>
            <Button onClick={handleSave} disabled={saving || !newName.trim()}>
              {saving && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
              Spara
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
