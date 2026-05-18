import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Ruler, Move3d, Construction, RotateCcw, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type Mode = 'calibrate' | 'height' | 'length' | null;
interface Line { x1: number; y1: number; x2: number; y2: number }

interface Props {
  projectId: string;
  photoUrl: string;
  analysis?: any;
  notes?: string;
}

const COLORS: Record<Exclude<Mode, null>, string> = {
  calibrate: '#3b82f6',
  height: '#ef4444',
  length: '#f59e0b',
};

export function ScaffoldingPhotoMeasure({ projectId, photoUrl, analysis, notes }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [mode, setMode] = useState<Mode>(null);
  const [drawing, setDrawing] = useState<Line | null>(null);
  const [calib, setCalib] = useState<Line | null>(null);
  const [calibMeters, setCalibMeters] = useState<number>(2.1); // standard dörrhöjd
  const [heightLine, setHeightLine] = useState<Line | null>(null);
  const [lengthLine, setLengthLine] = useState<Line | null>(null);
  const [visualizing, setVisualizing] = useState(false);
  const [vizUrl, setVizUrl] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      if (imgRef.current) {
        setSize({ w: imgRef.current.clientWidth, h: imgRef.current.clientHeight });
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [photoUrl]);

  const pxLen = (l: Line) => Math.hypot(l.x2 - l.x1, l.y2 - l.y1);
  const calibPx = calib ? pxLen(calib) : 0;
  const metersPerPx = calibPx > 0 ? calibMeters / calibPx : 0;
  const heightM = heightLine && metersPerPx ? +(pxLen(heightLine) * metersPerPx).toFixed(2) : null;
  const lengthM = lengthLine && metersPerPx ? +(pxLen(lengthLine) * metersPerPx).toFixed(2) : null;

  const pos = (e: React.PointerEvent) => {
    const r = wrapRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onDown = (e: React.PointerEvent) => {
    if (!mode) return;
    const p = pos(e);
    setDrawing({ x1: p.x, y1: p.y, x2: p.x, y2: p.y });
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drawing) return;
    const p = pos(e);
    setDrawing({ ...drawing, x2: p.x, y2: p.y });
  };
  const onUp = () => {
    if (!drawing || !mode) return;
    if (pxLen(drawing) < 8) { setDrawing(null); return; }
    if (mode === 'calibrate') setCalib(drawing);
    else if (mode === 'height') setHeightLine(drawing);
    else if (mode === 'length') setLengthLine(drawing);
    setDrawing(null);
    setMode(null);
  };

  const visualize = async () => {
    if (!heightM || !lengthM) {
      toast({ title: 'Rita höjd och längd först', variant: 'destructive' });
      return;
    }
    setVisualizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('visualize-scaffolding', {
        body: {
          project_id: projectId,
          photo_url: photoUrl,
          analysis,
          notes,
          measurements: {
            height_m: heightM,
            length_m: lengthM,
            calibration_reference_m: calibMeters,
          },
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setVizUrl((data as any).image_url);
      toast({ title: 'Visualisering klar' });
    } catch (e: any) {
      toast({ title: 'Visualisering misslyckades', description: e.message, variant: 'destructive' });
    } finally { setVisualizing(false); }
  };

  const renderLine = (l: Line | null, color: string, label?: string) => {
    if (!l) return null;
    const midX = (l.x1 + l.x2) / 2;
    const midY = (l.y1 + l.y2) / 2;
    return (
      <g>
        <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={color} strokeWidth={4} strokeLinecap="round" />
        <circle cx={l.x1} cy={l.y1} r={5} fill={color} />
        <circle cx={l.x2} cy={l.y2} r={5} fill={color} />
        {label && (
          <g>
            <rect x={midX - 32} y={midY - 12} width={64} height={20} rx={4} fill={color} />
            <text x={midX} y={midY + 2} fontSize={12} fontWeight="700" fill="white" textAnchor="middle">{label}</text>
          </g>
        )}
      </g>
    );
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold flex items-center gap-2">
            <Ruler className="w-4 h-4 text-primary" />
            Rita & mät – ställningens höjd och längd
          </h3>
          <Badge variant="outline">Skala: {metersPerPx ? `${(metersPerPx * 100).toFixed(2)} cm/px` : 'okalibrerad'}</Badge>
        </div>

        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
          <li><b>Kalibrera</b>: rita ett streck längs något med känd höjd/längd (t.ex. en dörr ≈ 2,1 m).</li>
          <li>Rita <b style={{ color: COLORS.height }}>höjd</b> från mark till takfot.</li>
          <li>Rita <b style={{ color: COLORS.length }}>längd</b> längs fasaden där ställningen ska stå.</li>
          <li>Tryck <b>Bygg ställning</b> – AI ritar in den efter dina mått.</li>
        </ol>

        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label className="text-xs">Referensmått (m)</Label>
            <Input
              type="number" step="0.1" min="0.1"
              value={calibMeters}
              onChange={(e) => setCalibMeters(parseFloat(e.target.value) || 0)}
              className="h-8 w-24"
            />
          </div>
          <Button size="sm" variant={mode === 'calibrate' ? 'default' : 'outline'} onClick={() => setMode('calibrate')}>
            <Ruler className="w-4 h-4 mr-1" />1. Kalibrera
          </Button>
          <Button size="sm" variant={mode === 'height' ? 'default' : 'outline'} onClick={() => setMode('height')} disabled={!calib}>
            <Move3d className="w-4 h-4 mr-1" />2. Rita höjd {heightM ? `(${heightM} m)` : ''}
          </Button>
          <Button size="sm" variant={mode === 'length' ? 'default' : 'outline'} onClick={() => setMode('length')} disabled={!calib}>
            <Move3d className="w-4 h-4 mr-1 rotate-90" />3. Rita längd {lengthM ? `(${lengthM} m)` : ''}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setCalib(null); setHeightLine(null); setLengthLine(null); setMode(null); }}>
            <RotateCcw className="w-4 h-4 mr-1" />Rensa
          </Button>
        </div>

        <div
          ref={wrapRef}
          className="relative border rounded overflow-hidden bg-muted select-none touch-none"
          style={{ cursor: mode ? 'crosshair' : 'default' }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
        >
          <img
            ref={imgRef}
            src={photoUrl}
            alt="Hus"
            className="w-full h-auto block pointer-events-none"
            onLoad={() => imgRef.current && setSize({ w: imgRef.current.clientWidth, h: imgRef.current.clientHeight })}
          />
          {size.w > 0 && (
            <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${size.w} ${size.h}`}>
              {renderLine(calib, COLORS.calibrate, `${calibMeters} m`)}
              {renderLine(heightLine, COLORS.height, heightM ? `${heightM} m` : undefined)}
              {renderLine(lengthLine, COLORS.length, lengthM ? `${lengthM} m` : undefined)}
              {drawing && mode && renderLine(drawing, COLORS[mode])}
            </svg>
          )}
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t">
          <div className="text-sm">
            {heightM && lengthM ? (
              <>Fasad: <b>{lengthM} m</b> × höjd <b>{heightM} m</b> = <b>{(heightM * lengthM).toFixed(1)} m²</b></>
            ) : (
              <span className="text-muted-foreground">Rita höjd och längd för att räkna ytan.</span>
            )}
          </div>
          <Button onClick={visualize} disabled={visualizing || !heightM || !lengthM}>
            {visualizing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Construction className="w-4 h-4 mr-1" />}
            {vizUrl ? 'Bygg om ställning' : 'Bygg ställning med AI'}
          </Button>
        </div>

        {vizUrl && (
          <div className="relative border rounded overflow-hidden bg-muted">
            <img src={vizUrl} alt="Visualiserad ställning" className="w-full max-h-[600px] object-contain" />
            <a href={vizUrl} target="_blank" rel="noreferrer"
               className="absolute top-2 right-2 bg-background/90 border rounded px-2 py-1 text-xs flex items-center gap-1 hover:bg-background">
              <Download className="w-3 h-3" /> Öppna
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
