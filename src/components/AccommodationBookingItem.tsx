import { useState } from 'react';
import { Hotel, Pencil, Calendar as CalendarIcon, Car, Loader2, AlertCircle } from 'lucide-react';
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
import { geocodeAddress } from '@/utils/geocoding';
import { getDrivingRoute } from '@/utils/travelDistance';
import { useToast } from '@/hooks/use-toast';

interface Props {
  project: Project;
  item: ChecklistItem;
  isEditable: boolean;
  onSave: (booking: AccommodationBooking) => void;
}

const formatDate = (d: Date) =>
  d.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' });

const todayISO = () => new Date().toISOString().split('T')[0];

const formatDistance = (km: number) =>
  km >= 10 ? `${km.toFixed(0)} km` : `${km.toFixed(1).replace('.', ',')} km`;

const formatDuration = (mins: number) => {
  const m = Math.round(mins);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h} h` : `${h} h ${rem} min`;
};

export function AccommodationBookingItem({ project, item, isEditable, onSave }: Props) {
  const existing = project.accommodationBooking;
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(existing?.name ?? '');
  const [address, setAddress] = useState(existing?.address ?? '');
  const [checkInDate, setCheckInDate] = useState(existing?.checkInDate ?? todayISO());
  const [nights, setNights] = useState<number>(existing?.nights ?? 1);
  const [route, setRoute] = useState<{
    distanceKm: number;
    travelMinutes: number;
    estimated: boolean;
    lat: number;
    lng: number;
  } | null>(
    existing?.distanceKm !== undefined &&
      existing?.travelMinutes !== undefined &&
      existing?.latitude !== undefined &&
      existing?.longitude !== undefined
      ? {
          distanceKm: existing.distanceKm,
          travelMinutes: existing.travelMinutes,
          estimated: !!existing.distanceEstimated,
          lat: existing.latitude,
          lng: existing.longitude,
        }
      : null,
  );
  const [calculating, setCalculating] = useState(false);

  const openDialog = () => {
    setName(existing?.name ?? '');
    setAddress(existing?.address ?? '');
    setCheckInDate(existing?.checkInDate ?? todayISO());
    setNights(existing?.nights ?? 1);
    setRoute(
      existing?.distanceKm !== undefined &&
        existing?.travelMinutes !== undefined &&
        existing?.latitude !== undefined &&
        existing?.longitude !== undefined
        ? {
            distanceKm: existing.distanceKm,
            travelMinutes: existing.travelMinutes,
            estimated: !!existing.distanceEstimated,
            lat: existing.latitude,
            lng: existing.longitude,
          }
        : null,
    );
    setOpen(true);
  };

  const safeNights = Math.max(1, Math.floor(Number(nights) || 1));
  const previewCheckOut = checkInDate
    ? getAccommodationCheckOutDate({ name, checkInDate, nights: safeNights })
    : null;

  const calculateRoute = async (): Promise<typeof route> => {
    if (!address.trim()) {
      toast({ title: 'Adress saknas', description: 'Fyll i boendets adress först.', variant: 'destructive' });
      return null;
    }
    if (!project.address) {
      toast({ title: 'Projektadress saknas', description: 'Projektet har ingen adress att räkna mot.', variant: 'destructive' });
      return null;
    }
    setCalculating(true);
    try {
      const [accCoords, projCoords] = await Promise.all([
        geocodeAddress(address.trim()),
        geocodeAddress(project.address),
      ]);
      if (!accCoords) {
        toast({ title: 'Kunde inte hitta boendets adress', variant: 'destructive' });
        return null;
      }
      if (!projCoords) {
        toast({ title: 'Kunde inte geokoda projektadressen', variant: 'destructive' });
        return null;
      }
      const r = await getDrivingRoute(accCoords, projCoords);
      const result = {
        distanceKm: r.distanceKm,
        travelMinutes: r.travelMinutes,
        estimated: r.estimated,
        lat: accCoords.lat,
        lng: accCoords.lng,
      };
      setRoute(result);
      return result;
    } finally {
      setCalculating(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !checkInDate || safeNights < 1) return;

    // If address provided but no route calculated yet, calculate now
    let finalRoute = route;
    const addressChanged = address.trim() !== (existing?.address ?? '');
    if (address.trim() && (!finalRoute || addressChanged)) {
      finalRoute = await calculateRoute();
    }

    onSave({
      name: name.trim(),
      checkInDate,
      nights: safeNights,
      bookedAt: new Date().toISOString(),
      address: address.trim() || undefined,
      latitude: finalRoute?.lat,
      longitude: finalRoute?.lng,
      distanceKm: finalRoute?.distanceKm,
      travelMinutes: finalRoute?.travelMinutes,
      distanceEstimated: finalRoute?.estimated,
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
              {existing.address && (
                <div className="text-muted-foreground truncate">{existing.address}</div>
              )}
              <div className="text-muted-foreground">
                {existing.nights} {existing.nights === 1 ? 'natt' : 'nätter'} · checkar ut{' '}
                {formatDate(getAccommodationCheckOutDate(existing))}
              </div>
              {existing.distanceKm !== undefined && existing.travelMinutes !== undefined && (
                <div className="flex items-center gap-1 mt-1 text-foreground">
                  <Car className="w-3 h-3" />
                  <span className="font-medium">
                    {formatDistance(existing.distanceKm)} · ~{formatDuration(existing.travelMinutes)}
                  </span>
                  <span className="text-muted-foreground">från objektet</span>
                  {existing.distanceEstimated && (
                    <span className="text-muted-foreground">(uppskattat)</span>
                  )}
                </div>
              )}
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
            <div className="space-y-1.5">
              <Label htmlFor="acc-address">Boendets adress</Label>
              <Input
                id="acc-address"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setRoute(null);
                }}
                placeholder="T.ex. Kungsgatan 10, Stockholm"
              />
              {project.address && (
                <p className="text-xs text-muted-foreground">
                  Avstånd räknas mot objektets adress: {project.address}
                </p>
              )}
            </div>

            {address.trim() && (
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => calculateRoute()}
                  disabled={calculating}
                  className="w-full"
                >
                  {calculating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Beräknar...
                    </>
                  ) : (
                    <>
                      <Car className="w-4 h-4 mr-2" />
                      Beräkna avstånd & restid
                    </>
                  )}
                </Button>
                {route && (
                  <div className="rounded-md border bg-muted/50 px-3 py-2 text-xs space-y-1">
                    <div className="flex items-center gap-2 text-foreground">
                      <Car className="w-3.5 h-3.5" />
                      <span className="font-medium">
                        {formatDistance(route.distanceKm)} · ~{formatDuration(route.travelMinutes)}
                      </span>
                      <span className="text-muted-foreground">från objektet</span>
                    </div>
                    {route.estimated && (
                      <div className="flex items-start gap-1.5 text-muted-foreground">
                        <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                        <span>Uppskattat värde (fågelvägen, vägnätet kunde inte nås).</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

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
            <Button
              onClick={handleSave}
              disabled={!name.trim() || !checkInDate || safeNights < 1 || calculating}
            >
              Spara bokning
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
