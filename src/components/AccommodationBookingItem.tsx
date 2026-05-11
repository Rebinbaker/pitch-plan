import { useState } from 'react';
import { Hotel, Pencil, Calendar as CalendarIcon } from 'lucide-react';
import { Project, ChecklistItem, AccommodationBooking, getAccommodationCheckOutDate } from '@/types/project';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  project: Project;
  item: ChecklistItem;
  isEditable: boolean;
  onSave: (booking: AccommodationBooking) => void;
}

const formatDate = (d: Date) =>
  d.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' });

const todayISO = () => new Date().toISOString().split('T')[0];

export function AccommodationBookingItem({ project, item, isEditable, onSave }: Props) {
  const existing = project.accommodationBooking;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(existing?.name ?? '');
  const [checkInDate, setCheckInDate] = useState(existing?.checkInDate ?? todayISO());
  const [nights, setNights] = useState<number>(existing?.nights ?? 1);

  const openDialog = () => {
    setName(existing?.name ?? '');
    setCheckInDate(existing?.checkInDate ?? todayISO());
    setNights(existing?.nights ?? 1);
    setOpen(true);
  };

  const safeNights = Math.max(1, Math.floor(Number(nights) || 1));
  const previewCheckOut = checkInDate
    ? getAccommodationCheckOutDate({ name, checkInDate, nights: safeNights })
    : null;

  const handleSave = () => {
    if (!name.trim() || !checkInDate || safeNights < 1) return;
    onSave({
      name: name.trim(),
      checkInDate,
      nights: safeNights,
      bookedAt: new Date().toISOString(),
    });
    setOpen(false);
  };

  return (
    <div className="mt-2 space-y-2">
      {existing ? (
        <div className="flex items-center justify-between gap-2 rounded-md border bg-card p-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Hotel className="w-4 h-4 text-primary shrink-0" />
            <div className="min-w-0">
              <div className="font-medium text-card-foreground truncate">{existing.name}</div>
              <div className="text-muted-foreground">
                {existing.nights} {existing.nights === 1 ? 'natt' : 'nätter'} · checkar ut{' '}
                {formatDate(getAccommodationCheckOutDate(existing))}
              </div>
            </div>
          </div>
          {isEditable && (
            <Button variant="ghost" size="sm" onClick={openDialog} className="shrink-0">
              <Pencil className="w-3 h-3 mr-1" />
              Redigera
            </Button>
          )}
        </div>
      ) : (
        isEditable && (
          <Button variant="outline" size="sm" onClick={openDialog}>
            <Hotel className="w-4 h-4 mr-1" />
            Boka boende
          </Button>
        )
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Boka boende</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="acc-name">Boendets namn</Label>
              <Input
                id="acc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="T.ex. Scandic Hotell"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="acc-checkin">Incheckning</Label>
                <Input
                  id="acc-checkin"
                  type="date"
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acc-nights">Antal nätter</Label>
                <Input
                  id="acc-nights"
                  type="number"
                  min={1}
                  value={nights}
                  onChange={(e) => setNights(Number(e.target.value))}
                />
              </div>
            </div>
            {previewCheckOut && (
              <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>
                  Beräknad utcheckning:{' '}
                  <span className="font-medium text-foreground">{formatDate(previewCheckOut)}</span>
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={handleSave} disabled={!name.trim() || !checkInDate || safeNights < 1}>
              Spara bokning
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
