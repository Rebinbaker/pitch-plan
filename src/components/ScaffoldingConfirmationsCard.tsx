import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Calendar, Truck, Hammer, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

interface Props {
  projectId: string;
}

interface Confirmation {
  booked_at: string | null;
  booked_note: string | null;
  transport_booked_at: string | null;
  transport_booked_note: string | null;
  assembled_at: string | null;
  assembled_note: string | null;
  assembled_photo_url: string | null;
}

const steps = [
  { key: 'booked', label: 'Ställning bokad', icon: Calendar },
  { key: 'transport', label: 'Transport bokad', icon: Truck },
  { key: 'assembled', label: 'Ställning uppmonterad', icon: Hammer },
] as const;

export function ScaffoldingConfirmationsCard({ projectId }: Props) {
  const [conf, setConf] = useState<Confirmation | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('scaffolding_confirmations' as any)
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();
      setConf((data as any) || null);
      setLoading(false);
      if ((data as any)?.assembled_photo_url) {
        const { data: signed } = await supabase.storage
          .from('worker-checkin-photos')
          .createSignedUrl((data as any).assembled_photo_url, 3600);
        setPhotoUrl(signed?.signedUrl || null);
      }
    })();
  }, [projectId]);

  if (loading) return null;

  const total = steps.length;
  const done = steps.filter((s) => {
    const key = `${s.key}${s.key === 'booked' ? '_at' : s.key === 'transport' ? '_booked_at' : '_at'}` as keyof Confirmation;
    return !!conf?.[key];
  }).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Ställningsmontör — bekräftelser
          </span>
          <Badge variant={done === total ? 'default' : 'secondary'}>
            {done}/{total} klara
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((s) => {
          const Icon = s.icon;
          const at =
            s.key === 'booked' ? conf?.booked_at :
            s.key === 'transport' ? conf?.transport_booked_at :
            conf?.assembled_at;
          const note =
            s.key === 'booked' ? conf?.booked_note :
            s.key === 'transport' ? conf?.transport_booked_note :
            conf?.assembled_note;
          return (
            <div key={s.key} className="flex items-start gap-3 p-2 rounded border bg-muted/30">
              {at ? <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" /> : <Circle className="w-4 h-4 text-muted-foreground mt-0.5" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Icon className="w-3 h-3 text-muted-foreground" />
                  {s.label}
                </div>
                {at ? (
                  <div className="text-xs text-muted-foreground">
                    Bekräftat {format(new Date(at), "d MMM yyyy 'kl' HH:mm", { locale: sv })}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">Inte bekräftat än</div>
                )}
                {note && <div className="text-xs mt-1 italic">"{note}"</div>}
                {s.key === 'assembled' && photoUrl && (
                  <a href={photoUrl} target="_blank" rel="noreferrer">
                    <img src={photoUrl} alt="Uppmonterad ställning" className="mt-2 max-h-32 rounded border" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
