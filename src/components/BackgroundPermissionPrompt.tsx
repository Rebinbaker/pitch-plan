import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, ShieldCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { BackgroundGeolocation } from '@/lib/backgroundGeolocation';

const STORAGE_KEY = 'bg_location_permission_prompted_v1';

/**
 * On first launch (native iOS/Android only), prompts the user to grant
 * "Always Allow" background location so GPS tracking keeps working when
 * the app is closed or the phone is locked. Required for cheat-proof
 * worker time tracking.
 */
export const BackgroundPermissionPrompt = () => {
  const [open, setOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const alreadyPrompted = localStorage.getItem(STORAGE_KEY);
    if (alreadyPrompted) return;
    // small delay so it doesn't compete with splash
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const requestPermission = async () => {
    setRequesting(true);
    try {
      // Adding a watcher with requestPermissions:true triggers the native
      // permission dialog (iOS shows "Allow While Using" first; user must then
      // upgrade to "Always" in Settings — we explain that below).
      const id = await BackgroundGeolocation.addWatcher(
        {
          backgroundMessage: 'Tidrapportering aktiv – platsen spåras',
          backgroundTitle: 'Incheckad på arbetsplats',
          requestPermissions: true,
          stale: false,
          distanceFilter: 50,
        },
        () => {
          // we only need the prompt; immediately remove watcher
        },
      );
      // remove right away — useGeofenceTracker manages the real watcher
      setTimeout(() => {
        try { BackgroundGeolocation.removeWatcher({ id }); } catch {}
      }, 500);

      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
      toast({
        title: 'Tack!',
        description: 'För full funktion: välj "Tillåt alltid" i telefonens inställningar.',
      });
      setOpen(false);
    } catch (e: any) {
      console.error('bg permission err', e);
      toast({
        title: 'Kunde inte aktivera bakgrundsplats',
        description: e?.message ?? 'Försök igen från telefonens inställningar.',
        variant: 'destructive',
      });
    } finally {
      setRequesting(false);
    }
  };

  const skip = () => {
    localStorage.setItem(STORAGE_KEY, 'skipped');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) skip(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Tillåt platsåtkomst i bakgrunden
          </DialogTitle>
          <DialogDescription className="pt-2">
            För att tidrapporteringen ska fungera även när skärmen är släckt eller
            appen är stängd behöver appen tillgång till din plats i bakgrunden.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-2">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p>
              Platsen används endast när du är incheckad på en arbetsplats — för att
              räkna ut din lönegrundande tid inom 50 m från projektet.
            </p>
          </div>
          <div className="rounded-md bg-muted p-3 text-xs">
            <p className="font-medium text-foreground mb-1">Viktigt:</p>
            <p>
              När telefonen frågar — välj <strong>"Tillåt alltid"</strong> (iOS) eller
              <strong> "Tillåt hela tiden"</strong> (Android). Annars stoppas
              tidräkningen när du låser telefonen.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={skip} disabled={requesting}>
            Inte nu
          </Button>
          <Button onClick={requestPermission} disabled={requesting}>
            {requesting ? 'Frågar…' : 'Aktivera bakgrundsplats'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
