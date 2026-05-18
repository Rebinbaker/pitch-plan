import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Upload, X, Image as ImageIcon, Wand2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { ScaffoldingPhotoMeasure } from './ScaffoldingPhotoMeasure';
import { ScaffoldingSectionsPanel } from './ScaffoldingSectionsPanel';
import { AIAssistPanel } from './AIAssistPanel';
import { ScaffoldingFullChecklist } from './ScaffoldingFullChecklist';

interface PhotoRef {
  storagePath?: string;   // worker-checkin-photos path
  publicUrl?: string;     // from project-files (public bucket) or signed URL
  source: 'upload' | 'project';
  signedUrl?: string;     // for preview & passing to AI
  name?: string;
}

interface AIAnalysis {
  estimated?: {
    sides_m?: number[];
    height_m?: number;
    floors?: number;
    roof_type?: string;
    total_area_m2?: number;
  };
  risks?: string[];
  materials?: Array<{ artnr: string; name: string; qty: number; unit: string }>;
  confidence?: number;
  notes?: string;
}

interface Props {
  projectId: string;
  initialAnalysis?: AIAnalysis;
  analyzedAt?: string | null;
  onAnalysisDone?: (a: AIAnalysis) => void;
  onApplyAsSpec: (rows: Array<{ id: string; type: string; quantity: number; unit: string; notes?: string }>) => void;
}

export function AIPhotoAnalysisTab({ projectId, initialAnalysis, analyzedAt, onAnalysisDone, onApplyAsSpec }: Props) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<PhotoRef[]>([]);
  const [notes, setNotes] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | undefined>(initialAnalysis);
  const [loadingProjectPics, setLoadingProjectPics] = useState(false);

  useEffect(() => setAnalysis(initialAnalysis), [initialAnalysis]);

  const upload = async (files: FileList) => {
    if (!user) return;
    for (const f of Array.from(files).slice(0, 10 - photos.length)) {
      const ext = (f.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${user.id}/scaffolding/${projectId}/ai-input/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const { error } = await supabase.storage.from('worker-checkin-photos').upload(path, f, { contentType: f.type || 'image/jpeg' });
      if (error) { toast({ title: 'Uppladdning misslyckades', description: error.message, variant: 'destructive' }); continue; }
      const { data } = await supabase.storage.from('worker-checkin-photos').createSignedUrl(path, 3600);
      setPhotos((p) => [...p, { storagePath: path, signedUrl: data?.signedUrl, source: 'upload', name: f.name }]);
    }
  };

  const loadProjectPhotos = async () => {
    setLoadingProjectPics(true);
    try {
      const { data, error } = await supabase.from('files').select('id, name, url, type')
        .eq('project_id', projectId)
        .ilike('type', 'image/%')
        .order('uploaded_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      if (!data?.length) { toast({ title: 'Inga bilder hittades på projektet' }); return; }
      const incoming = data.map((f) => ({
        publicUrl: f.url, signedUrl: f.url, source: 'project' as const, name: f.name,
      }));
      setPhotos((p) => [...p, ...incoming].slice(0, 10));
    } catch (e: any) {
      toast({ title: 'Kunde inte hämta bilder', description: e.message, variant: 'destructive' });
    } finally { setLoadingProjectPics(false); }
  };

  const removePhoto = (i: number) => setPhotos((p) => p.filter((_, ix) => ix !== i));

  const runAnalysis = async () => {
    if (photos.length === 0) { toast({ title: 'Lägg till minst en bild först', variant: 'destructive' }); return; }
    setAnalyzing(true);
    try {
      const photo_urls = photos.map((p) => p.signedUrl || p.publicUrl).filter(Boolean) as string[];
      const { data, error } = await supabase.functions.invoke('analyze-scaffolding-photos', {
        body: { project_id: projectId, photo_urls, notes: notes || undefined },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const a = (data as any).analysis as AIAnalysis;
      setAnalysis(a);
      onAnalysisDone?.(a);
      toast({ title: 'AI-analys klar', description: `${a.materials?.length || 0} artiklar föreslagna` });
    } catch (e: any) {
      toast({ title: 'AI-analys misslyckades', description: e.message, variant: 'destructive' });
    } finally { setAnalyzing(false); }
  };

  const applyAsSpec = () => {
    if (!analysis?.materials?.length) return;
    const rows = analysis.materials.map((m, i) => ({
      id: m.artnr || `ai-${i}`,
      type: `${m.artnr ? m.artnr + ' · ' : ''}${m.name}`,
      quantity: m.qty,
      unit: m.unit || 'st',
    }));
    onApplyAsSpec(rows);
    toast({ title: 'Materialspec uppdaterad från AI-förslag' });
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />AI-foto-analys (PERI)</h3>
              <p className="text-xs text-muted-foreground">Lägg till bilder på huset så föreslår AI:n materiallista och uppskattad höjd/längd.</p>
            </div>
            <Badge variant="outline">{photos.length}/10 bilder</Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={loadProjectPhotos} disabled={loadingProjectPics || photos.length >= 10}>
              {loadingProjectPics ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <ImageIcon className="w-4 h-4 mr-1" />}
              Använd projektets bilder
            </Button>
            <label>
              <Button asChild variant="outline" size="sm" disabled={photos.length >= 10}>
                <span><Upload className="w-4 h-4 mr-1" />Ladda upp bilder</span>
              </Button>
              <input type="file" accept="image/*" multiple className="hidden"
                onChange={(e) => e.target.files && upload(e.target.files)} />
            </label>
          </div>

          {photos.length > 0 && (
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {photos.map((p, i) => (
                <div key={i} className="relative border rounded overflow-hidden">
                  {p.signedUrl ? <img src={p.signedUrl} alt={p.name || 'foto'} className="w-full h-20 object-cover" /> : <div className="w-full h-20 bg-muted" />}
                  <Button size="icon" variant="secondary" className="absolute top-1 right-1 h-5 w-5" onClick={() => removePhoto(i)}>
                    <X className="w-3 h-3" />
                  </Button>
                  <div className="text-[10px] px-1 truncate bg-background/80">{p.source === 'project' ? '📁' : '⬆️'} {p.name}</div>
                </div>
              ))}
            </div>
          )}

          <div>
            <Label>Extra info till AI (frivilligt)</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="T.ex. 'tvåvåningshus, tegeltak, behov av väderskydd'..." />
          </div>

          <div className="flex justify-end">
            <Button onClick={runAnalysis} disabled={analyzing || photos.length === 0}>
              {analyzing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1" />}
              Analysera med AI
            </Button>
          </div>
        </CardContent>
      </Card>

      {analysis && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-semibold">AI-resultat</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {typeof analysis.confidence === 'number' && (
                  <Badge variant={analysis.confidence > 0.7 ? 'default' : 'secondary'}>
                    Konfidens: {Math.round((analysis.confidence || 0) * 100)}%
                  </Badge>
                )}
                {analyzedAt && <span>Analyserad {new Date(analyzedAt).toLocaleString('sv-SE')}</span>}
              </div>
            </div>

            <div className="grid sm:grid-cols-4 gap-2 text-sm">
              <Stat label="Höjd" value={analysis.estimated?.height_m ? `${analysis.estimated.height_m} m` : '–'} />
              <Stat label="Våningar" value={analysis.estimated?.floors ?? '–'} />
              <Stat label="Total yta" value={analysis.estimated?.total_area_m2 ? `${analysis.estimated.total_area_m2} m²` : '–'} />
              <Stat label="Taktyp" value={analysis.estimated?.roof_type ?? '–'} />
            </div>

            {analysis.estimated?.sides_m?.length ? (
              <div className="text-sm">
                <Label className="text-xs">Sidor (m):</Label>{' '}
                {analysis.estimated.sides_m.map((s, i) => <Badge key={i} variant="outline" className="mr-1">Sida {i + 1}: {s} m</Badge>)}
              </div>
            ) : null}

            {analysis.risks?.length ? (
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-yellow-600" />Risker / observationer</Label>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                  {analysis.risks.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            ) : null}

            <div>
              <Label className="text-xs">Föreslagen PERI-materiallista</Label>
              <div className="border rounded overflow-hidden mt-1">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr><th className="text-left p-2">Art.nr</th><th className="text-left p-2">Namn</th><th className="text-right p-2">Antal</th><th className="text-left p-2">Enhet</th></tr>
                  </thead>
                  <tbody>
                    {(analysis.materials || []).map((m, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2 font-mono text-xs">{m.artnr}</td>
                        <td className="p-2">{m.name}</td>
                        <td className="p-2 text-right font-medium">{m.qty}</td>
                        <td className="p-2 text-muted-foreground">{m.unit}</td>
                      </tr>
                    ))}
                    {!analysis.materials?.length && (
                      <tr><td colSpan={4} className="p-3 text-center text-muted-foreground">Inga artiklar föreslagna</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {analysis.notes && <p className="text-xs text-muted-foreground italic">{analysis.notes}</p>}
            <p className="text-xs text-muted-foreground">⚠️ AI-uppskattning — granska och justera vid behov innan beställning.</p>

            {photos[0]?.signedUrl || photos[0]?.publicUrl ? (
              <ScaffoldingPhotoMeasure
                projectId={projectId}
                photoUrl={(photos[0]?.signedUrl || photos[0]?.publicUrl) as string}
                analysis={analysis}
                notes={notes}
              />
            ) : (
              <p className="text-xs text-muted-foreground border-t pt-3">Lägg till en bild av huset ovan för att kunna rita och visualisera ställningen.</p>
            )}

            <AIAssistPanel projectId={projectId} analysis={analysis} />

            <ScaffoldingSectionsPanel projectId={projectId} />

            <div className="flex justify-end">
              <Button onClick={applyAsSpec} disabled={!analysis.materials?.length}>
                Använd som materialspecifikation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <ScaffoldingFullChecklist projectId={projectId} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="border rounded p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
