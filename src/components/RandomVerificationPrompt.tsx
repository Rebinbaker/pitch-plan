import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PendingVerification {
  id: string;
  triggered_at: string;
  expires_at: string;
}

interface Props {
  pending: PendingVerification | null;
  deviceId: string | null;
  onComplete: () => void;
}

const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result));
  r.onerror = reject;
  r.readAsDataURL(file);
});

export const RandomVerificationPrompt = ({ pending, deviceId, onComplete }: Props) => {
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [submitting, setSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!pending) return;
    setPhotoFile(null);
    setPhotoPreview(null);
    const tick = () => {
      const s = Math.max(0, Math.floor((new Date(pending.expires_at).getTime() - Date.now()) / 1000));
      setSecondsLeft(s);
    };
    tick();
    const i = setInterval(tick, 1000);
    // Auto-open camera shortly after the modal mounts
    setTimeout(() => inputRef.current?.click(), 600);
    return () => clearInterval(i);
  }, [pending?.id]);

  const onPhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!pending || !photoFile) return;
    setSubmitting(true);
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 })
      );
      const b64 = await fileToBase64(photoFile);
      const { data, error } = await supabase.functions.invoke('submit-random-verification', {
        body: {
          verification_id: pending.id,
          selfie_base64: b64,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          device_id: deviceId,
        },
      });
      if (error) throw error;
      if (data?.status === 'passed') {
        toast({ title: 'Tack!', description: 'Närvaron är bekräftad.' });
      } else {
        toast({ title: 'Verifiering misslyckades', description: data?.failure_reason || 'Försök igen.', variant: 'destructive' });
      }
      onComplete();
    } catch (e: any) {
      toast({ title: 'Kunde inte skicka', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const min = Math.floor(secondsLeft / 60);
  const sec = secondsLeft % 60;

  return (
    <Dialog open={!!pending} onOpenChange={() => {}}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Bekräfta att du är på plats
          </DialogTitle>
          <DialogDescription>
            Ta en snabb selfie så vi vet att du fortfarande arbetar. Du har {min}:{String(sec).padStart(2, '0')} på dig.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {photoPreview ? (
            <img src={photoPreview} alt="Selfie" className="w-full rounded-lg border" />
          ) : (
            <div className="aspect-square rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground bg-muted/40">
              <div className="text-center">
                <Camera className="w-10 h-10 mx-auto mb-2" />
                <div className="text-sm">Tryck nedan för att ta selfie</div>
              </div>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={onPhotoSelected}
          />
          <Button variant="outline" className="w-full" onClick={() => inputRef.current?.click()} disabled={submitting}>
            <Camera className="w-4 h-4 mr-2" />
            {photoFile ? 'Ta om' : 'Öppna kamera'}
          </Button>
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={!photoFile || submitting || secondsLeft === 0} className="w-full">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
            Skicka bekräftelse
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
