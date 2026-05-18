import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MapPin, User, Phone, Calendar, AlertTriangle, Sparkles, Hammer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Project } from '@/types/project';
import { simpleProgress, SimpleChecklistState } from './scaffoldingChecklist';

interface Props {
  project: Project;
  onOpen: (p: Project) => void;
}

export function ScaffolderProjectCard({ project, onOpen }: Props) {
  const [state, setState] = useState<SimpleChecklistState>({});
  const [risk, setRisk] = useState<'green' | 'yellow' | 'red'>('green');
  const [aiDone, setAiDone] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('scaffolding_jobs' as any)
        .select('simple_checklist, risk_level, ai_analyzed_at')
        .eq('project_id', project.id).maybeSingle();
      if (data) {
        setState((data as any).simple_checklist || {});
        setRisk((data as any).risk_level || 'green');
        setAiDone(!!(data as any).ai_analyzed_at);
      }
    })();
  }, [project.id]);

  const pct = simpleProgress(state);

  return (
    <Card
      className={`cursor-pointer hover:shadow-hover hover:scale-[1.02] transition-all duration-300 group ${
        risk === 'red' ? 'ring-2 ring-destructive/50' : risk === 'yellow' ? 'ring-1 ring-yellow-500/40' : ''
      }`}
      onClick={() => onOpen(project)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <h3 className="font-semibold truncate group-hover:text-primary">{project.name}</h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 shrink-0" /><span className="truncate">{project.address}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {risk === 'red' && <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />Akut</Badge>}
            {risk === 'yellow' && <Badge className="bg-yellow-500 text-white gap-1"><AlertTriangle className="w-3 h-3" />Risk</Badge>}
            {risk === 'green' && <Badge className="bg-emerald-600 text-white">OK</Badge>}
            {aiDone && <Badge variant="outline" className="gap-1 text-primary border-primary"><Sparkles className="w-3 h-3" />AI</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1"><User className="w-3 h-3" /><span className="truncate">{project.customerName}</span></div>
          <div className="flex items-center gap-1"><Phone className="w-3 h-3" /><span className="truncate">{project.customerPhone || '—'}</span></div>
          <div className="flex items-center gap-1 col-span-2"><Calendar className="w-3 h-3" /><span>{project.constructionStartWeek || project.startDate || '—'}</span></div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Framdrift</span>
            <span className="font-medium">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={(e) => { e.stopPropagation(); onOpen(project); }}>
          <Hammer className="w-4 h-4 mr-1" />Öppna ställningskort
        </Button>
      </CardContent>
    </Card>
  );
}
