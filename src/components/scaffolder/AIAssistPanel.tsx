import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Check, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AIAnalysis {
  estimated?: {
    sides_m?: number[];
    height_m?: number;
    floors?: number;
    roof_type?: string;
    total_area_m2?: number;
  };
  risks?: string[];
  confidence?: number;
  notes?: string;
}

interface Props {
  projectId: string;
  analysis?: AIAnalysis;
  onApplied?: () => void;
}

function confidenceTone(c?: number) {
  if (c == null) return 'secondary' as const;
  if (c >= 0.75) return 'default' as const;
  if (c >= 0.5) return 'secondary' as const;
  return 'destructive' as const;
}

export function AIAssistPanel({ projectId, analysis, onApplied }: Props) {
  if (!analysis?.estimated) return null;
  const est = analysis.estimated;
  const conf = analysis.confidence;

  const acceptAsSection = async (length_m: number, label: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: proj } = await supabase.from('projects').select('organization_id').eq('id', projectId).maybeSingle();
    if (!user || !proj) return;
    const { count } = await supabase.from('scaffolding_sections')
      .select('id', { count: 'exact', head: true }).eq('project_id', projectId);
    const { error } = await supabase.from('scaffolding_sections').insert({
      project_id: projectId,
      organization_id: proj.organization_id,
      name: label,
      sort_order: count || 0,
      length_m,
      height_m: est.height_m || null,
      width_m: 0.67,
      lift_height_m: 2.0,
      work_levels: 1,
    });
    if (error) toast({ title: 'Fel', description: error.message, variant: 'destructive' });
    else { toast({ title: `${label} skapad`, description: `${length_m} m × ${est.height_m || '?'} m` }); onApplied?.(); }
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />AI-förslag (ej låsta)
          </h3>
          {conf != null && (
            <Badge variant={confidenceTone(conf)}>
              Konfidens: {Math.round(conf * 100)}%
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Detta är AI:ns första gissning. Acceptera som sektioner eller justera själv.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <Stat label="Höjd" value={est.height_m ? `${est.height_m} m` : '–'} />
          <Stat label="Våningar" value={est.floors ?? '–'} />
          <Stat label="Total yta" value={est.total_area_m2 ? `${est.total_area_m2} m²` : '–'} />
          <Stat label="Taktyp" value={est.roof_type ?? '–'} />
        </div>

        {est.sides_m?.length ? (
          <div className="space-y-1">
            <div className="text-xs font-medium">Föreslagna sidor</div>
            {est.sides_m.map((s, i) => (
              <div key={i} className="flex items-center justify-between border rounded p-2 bg-background">
                <div className="text-sm">Sida {i + 1}: <b>{s} m</b> × {est.height_m || '?'} m</div>
                <Button size="sm" variant="outline" onClick={() => acceptAsSection(s, `Sida ${i + 1}`)}>
                  <Check className="w-3 h-3 mr-1" />Skapa sektion
                </Button>
              </div>
            ))}
          </div>
        ) : null}

        {analysis.risks?.length ? (
          <div className="space-y-1">
            <div className="text-xs font-medium flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-yellow-600" />Risker / observationer
            </div>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
              {analysis.risks.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        ) : null}

        {analysis.notes && <p className="text-xs italic text-muted-foreground">{analysis.notes}</p>}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="border rounded p-2 bg-background">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
