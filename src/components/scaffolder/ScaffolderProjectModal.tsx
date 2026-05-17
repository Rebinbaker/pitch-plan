import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Truck, Hammer, CheckCircle2, Camera, X, Loader2, MapPin, User, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import type { Project } from '@/types/project';

type Step = 'booked' | 'transport' | 'assembled';

interface Confirmation {
  project_id: string;
  booked_at: string | null;
  booked_note: string | null;
  transport_booked_at: string | null;
  transport_booked_note: string | null;
  assembled_at: string | null;
  assembled_note: string | null;
  assembled_photo_url: string | null;
}

const STEPS: { key: Step; label: string; icon: typeof Calendar; needsPhoto: boolean; description: string }[] = [
  { key: 'booked', label: 'Ställningar bokade', icon: Calendar, needsPhoto: false, description: 'Bekräfta att ställningarna är beställda hos leverantör.' },
  { key: 'transport', label: 'Transport bokad', icon: Truck, needsPhoto: false, description: 'Bekräfta att transport är ordnad.' },
  { key: 'assembled', label: 'Ställningar uppmonterade', icon: Hammer, needsPhoto: true, description: 'Ta ett foto från platsen när ställningarna står uppe.' },
];

interface Props {
  project: Project | null;
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

export function ScaffolderProjectModal({ project, open, onClose, onChanged }: Props) {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState<Step | null>(null);
  const [activeStep, setActiveStep] = useState<Step | null>(null);
  const [note, setNote] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !project) return;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('scaffolding_confirmations' as any)
          .select('*')
          .eq('project_id', project.id)
          .maybeSingle();
        setConfirmation((data as any) || null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, project]);

  const closeStepForm = () => {
    setActiveStep(null);
    setNote('');
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
  };

  const onPhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  };

  const stepDone = (step: Step): string | null => {
    if (!confirmation) return null;
    if (step === 'booked') return confirmation.booked_at;
    if (step === 'transport') return confirmation.transport_booked_at;
    return confirmation.assembled_at;
  };

  const submitStep = async () => {
    if (!activeStep || !project || !user || !organizationId) return;
    const meta = STEPS.find(s => s.key === activeStep)!;
    if (meta.needsPhoto && !photoFile) {
      toast({ title: 'Foto krävs', description: 'Ta ett foto för att bekräfta uppmontering.', variant: 'destructive' });
      return;
    }
    setWorking(activeStep);
    try {
      let photoUrl: string | undefined;
      if (photoFile) {
        const ext = (photoFile.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${user.id}/scaffolding/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('worker-checkin-photos')
          .upload(path, photoFile, { contentType: photoFile.type || 'image/jpeg' });
        if (upErr) throw upErr;
        photoUrl = path;
      }

      const now = new Date().toISOString();
      const patch: any = { updated_at: now };
      if (activeStep === 'booked') {
        patch.booked_at = now;
        patch.booked_by = user.id;
        patch.booked_note = note || null;
      } else if (activeStep === 'transport') {
        patch.transport_booked_at = now;
        patch.transport_booked_by = user.id;
        patch.transport_booked_note = note || null;
      } else {
        patch.assembled_at = now;
        patch.assembled_by = user.id;
        patch.assembled_note = note || null;
        patch.assembled_photo_url = photoUrl;
      }

      if (confirmation) {
        const { error } = await supabase
          .from('scaffolding_confirmations' as any)
          .update(patch)
          .eq('project_id', project.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('scaffolding_confirmations' as any)
          .insert({
            project_id: project.id,
            organization_id: organizationId,
            ...patch,
          });
        if (error) throw error;
      }

      toast({ title: 'Bekräftat', description: meta.label });
      // reload
      const { data } = await supabase
        .from('scaffolding_confirmations' as any)
        .select('*')
        .eq('project_id', project.id)
        .maybeSingle();
      setConfirmation((data as any) || null);
      closeStepForm();
      onChanged?.();
    } catch (e: any) {
      toast({ title: 'Kunde inte spara', description: e.message, variant: 'destructive' });
    } finally {
      setWorking(null);
    }
  };

  if (!project) return null;

  const allDone = !!(confirmation?.booked_at && confirmation?.transport_booked_at && confirmation?.assembled_at);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { closeStepForm(); onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2 pr-6">
            <span>{project.name}</span>
            {allDone && <Badge className="bg-primary"><CheckCircle2 className="w-3 h-3 mr-1" />Allt klart</Badge>}
          </DialogTitle>
        </DialogHeader>

        {/* Project info */}
        <Card>
          <CardContent className="p-4 space-y-2 text-sm">
            {project.address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  {project.address}
                </a>
              </div>
            )}
            {project.customerName && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>{project.customerName}</span>
              </div>
            )}
            {project.customerPhone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <a href={`tel:${project.customerPhone}`} className="text-primary">{project.customerPhone}</a>
              </div>
            )}
            {(project.planerad_start_datum || project.startDate) && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>Start: {project.planerad_start_datum || project.startDate}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Checklist */}
        <div className="space-y-3 mt-2">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wide">Ställningschecklista</h3>

          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            STEPS.map(step => {
              const done = stepDone(step.key);
              const Icon = step.icon;
              const isActive = activeStep === step.key;
              return (
                <Card key={step.key} className={done ? 'border-primary/40 bg-primary/5' : ''}>
                  <CardContent className="p-3 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 rounded-full p-2 ${done ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-medium">{step.label}</div>
                          <div className="text-xs text-muted-foreground">{step.description}</div>
                          {done && (
                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-primary" />
                              Bekräftat {format(new Date(done), 'd MMM yyyy HH:mm', { locale: sv })}
                            </div>
                          )}
                        </div>
                      </div>
                      {!done && !isActive && (
                        <Button size="sm" onClick={() => setActiveStep(step.key)}>
                          Bekräfta
                        </Button>
                      )}
                    </div>

                    {isActive && !done && (
                      <div className="space-y-2 pl-11">
                        {step.needsPhoto && (
                          <>
                            <div className="rounded-lg border bg-muted/30 p-2 flex items-center justify-center min-h-[140px]">
                              {photoPreview ? (
                                <div className="relative w-full">
                                  <img src={photoPreview} alt="Förhandsvisning" className="w-full max-h-[220px] object-contain rounded" />
                                  <Button
                                    size="icon"
                                    variant="secondary"
                                    className="absolute top-2 right-2 h-7 w-7"
                                    onClick={() => {
                                      setPhotoFile(null);
                                      if (photoPreview) URL.revokeObjectURL(photoPreview);
                                      setPhotoPreview(null);
                                    }}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground py-4">Foto krävs</span>
                              )}
                            </div>
                            <input
                              ref={photoInputRef}
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              onChange={onPhotoSelected}
                            />
                            <Button variant="outline" size="sm" className="w-full" onClick={() => photoInputRef.current?.click()}>
                              <Camera className="w-4 h-4 mr-2" /> {photoPreview ? 'Ta nytt foto' : 'Ta foto'}
                            </Button>
                          </>
                        )}
                        <Textarea
                          placeholder="Anteckning (valfritt)"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          rows={2}
                        />
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="sm" onClick={closeStepForm} disabled={working === step.key}>
                            Avbryt
                          </Button>
                          <Button size="sm" onClick={submitStep} disabled={working === step.key}>
                            {working === step.key ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                            )}
                            Bekräfta
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
