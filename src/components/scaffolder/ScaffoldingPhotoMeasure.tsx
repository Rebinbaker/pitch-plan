import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Ruler, Move3d, Construction, RotateCcw, Download, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Line { x1: number; y1: number; x2: number; y2: number }
interface CalibRef {
  id: string;
  label: string;
  meters: number;
  axis: 'vertical' | 'horizontal' | 'free';
  line: Line | null;
}

type Mode =
  | { kind: 'calibrate'; refId: string }
  | { kind: 'height' }
  | { kind: 'length' }
  | null;

interface Props {
  projectId: string;
  photoUrl: string;
  analysis?: any;
  notes?: string;
}

const HEIGHT_COLOR = '#ef4444';
const LENGTH_COLOR = '#f59e0b';
const CALIB_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#ec4899', '#06b6d4'];

const STANDARDS: Array<{ label: string; meters: number; axis: 'vertical' | 'horizontal' }> = [
  { label: 'Ytterdörr höjd (2,10 m)', meters: 2.10, axis: 'vertical' },
  { label: 'Ytterdörr bredd (0,90 m)', meters: 0.90, axis: 'horizontal' },
  { label: 'Fönster höjd (1,20 m)', meters: 1.20, axis: 'vertical' },
  { label: 'Fönster bredd (1,00 m)', meters: 1.00, axis: 'horizontal' },
  { label: 'Garageport höjd (2,10 m)', meters: 2.10, axis: 'vertical' },
  { label: 'Våningshöjd (2,70 m)', meters: 2.70, axis: 'vertical' },
  { label: 'Takfotshöjd 1-plan (2,70 m)', meters: 2.70, axis: 'vertical' },
  { label: 'Takfotshöjd 2-plan (5,40 m)', meters: 5.40, axis: 'vertical' },
  { label: 'Tegelpannrad (0,32 m)', meters: 0.32, axis: 'vertical' },
];

const pxLen = (l: Line) => Math.hypot(l.x2 - l.x1, l.y2 - l.y1);
const rid = () => Math.random().toString(36).slice(2, 9);

export function ScaffoldingPhotoMeasure({ projectId, photoUrl, analysis, notes }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [mode, setMode] = useState<Mode>(null);
  const [drawing, setDrawing] = useState<Line | null>(null);
  const [shiftKey, setShiftKey] = useState(false);

  const [refs, setRefs] = useState<CalibRef[]>([
    { id: rid(), label: 'Ytterdörr höjd', meters: 2.10, axis: 'vertical', line: null },
  ]);
  const [heightLine, setHeightLine] = useState<Line | null>(null);
  const [lengthLine, setLengthLine] = useState<Line | null>(null);
  const [visualizing, setVisualizing] = useState(false);
  const [vizUrl, setVizUrl] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      if (imgRef.current) setSize({ w: imgRef.current.clientWidth, h: imgRef.current.clientHeight });
    };
    update();
    window.addEventListener('resize', update);
    const kd = (e: KeyboardEvent) => e.key === 'Shift' && setShiftKey(true);
    const ku = (e: KeyboardEvent) => e.key === 'Shift' && setShiftKey(false);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    };
  }, [photoUrl]);

  // Compute weighted scale from all calibration refs with drawn lines
  const refScales = refs
    .filter((r) => r.line && r.meters > 0)
    .map((r) => ({ ref: r, px: pxLen(r.line!), mpp: r.meters / pxLen(r.line!) }));

  const metersPerPx = (() => {
    if (refScales.length === 0) return 0;
    const weights = refScales.map((s) => s.px); // longer line = more reliable
    const totalW = weights.reduce((a, b) => a + b, 0);
    return refScales.reduce((acc, s, i) => acc + s.mpp * weights[i], 0) / totalW;
  })();

  // Spread / confidence
  const spread = (() => {
    if (refScales.length < 2) return 0;
    const vals = refScales.map((s) => s.mpp);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const maxDev = Math.max(...vals.map((v) => Math.abs(v - mean) / mean));
    return maxDev;
  })();

  const heightM = heightLine && metersPerPx ? +(pxLen(heightLine) * metersPerPx).toFixed(2) : null;
  const lengthM = lengthLine && metersPerPx ? +(pxLen(lengthLine) * metersPerPx).toFixed(2) : null;

  const pos = (e: React.PointerEvent) => {
    const r = wrapRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const currentAxis = (): 'vertical' | 'horizontal' | 'free' => {
    if (!mode) return 'free';
    if (shiftKey) return 'free';
    if (mode.kind === 'height') return 'vertical';
    if (mode.kind === 'length') return 'horizontal';
    const r = refs.find((x) => x.id === mode.refId);
    return r?.axis || 'free';
  };

  const snap = (start: { x: number; y: number }, end: { x: number; y: number }): Line => {
    const a = currentAxis();
    if (a === 'vertical') return { x1: start.x, y1: start.y, x2: start.x, y2: end.y };
    if (a === 'horizontal') return { x1: start.x, y1: start.y, x2: end.x, y2: start.y };
    return { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
  };

  const onDown = (e: React.PointerEvent) => {
    if (!mode) return;
    const p = pos(e);
    setDrawing({ x1: p.x, y1: p.y, x2: p.x, y2: p.y });
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drawing) return;
    const p = pos(e);
    setDrawing(snap({ x: drawing.x1, y: drawing.y1 }, p));
  };
  const onUp = () => {
    if (!drawing || !mode) return;
    if (pxLen(drawing) < 8) { setDrawing(null); return; }
    if (mode.kind === 'calibrate') {
      setRefs((rs) => rs.map((r) => r.id === mode.refId ? { ...r, line: drawing } : r));
    } else if (mode.kind === 'height') {
      setHeightLine(drawing);
    } else if (mode.kind === 'length') {
      setLengthLine(drawing);
    }
    setDrawing(null);
    setMode(null);
  };

  const addCustomRef = () => setRefs((rs) => [...rs, {
    id: rid(), label: 'Egen referens', meters: 1.0, axis: 'free', line: null,
  }]);
  const addStandardRef = (idx: number) => {
    const s = STANDARDS[idx];
    setRefs((rs) => [...rs, { id: rid(), label: s.label, meters: s.meters, axis: s.axis, line: null }]);
  };
  const updateRef = (id: string, patch: Partial<CalibRef>) =>
    setRefs((rs) => rs.map((r) => r.id === id ? { ...r, ...patch } : r));
  const removeRef = (id: string) => setRefs((rs) => rs.filter((r) => r.id !== id));

  const clearAll = () => {
    setRefs([{ id: rid(), label: 'Ytterdörr höjd', meters: 2.10, axis: 'vertical', line: null }]);
    setHeightLine(null); setLengthLine(null); setMode(null);
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
          analysis, notes,
          measurements: {
            height_m: heightM,
            length_m: lengthM,
            scale_confidence: spread > 0 ? +(1 - Math.min(spread, 1)).toFixed(2) : 1,
            calibration_sources: refScales.map((s) => ({
              label: s.ref.label, meters: s.ref.meters, px: +s.px.toFixed(1),
            })),
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
    const w = Math.max(40, (label?.length || 0) * 7 + 14);
    return (
      <g>
        <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={color} strokeWidth={4} strokeLinecap="round" />
        <circle cx={l.x1} cy={l.y1} r={5} fill={color} />
        <circle cx={l.x2} cy={l.y2} r={5} fill={color} />
        {label && (
          <g>
            <rect x={midX - w / 2} y={midY - 11} width={w} height={20} rx={4} fill={color} />
            <text x={midX} y={midY + 3} fontSize={11} fontWeight="700" fill="white" textAnchor="middle">{label}</text>
          </g>
        )}
      </g>
    );
  };

  const confidenceLabel = (() => {
    if (refScales.length === 0) return null;
    if (refScales.length === 1) return { text: 'Endast 1 referens — lägg till fler för bättre noggrannhet', color: 'bg-yellow-100 text-yellow-800' };
    const pct = (spread * 100).toFixed(0);
    if (spread > 0.20) return { text: `Stor spridning ±${pct}% — kontrollera referenserna`, color: 'bg-red-100 text-red-800' };
    if (spread > 0.10) return { text: `Måttlig spridning ±${pct}%`, color: 'bg-yellow-100 text-yellow-800' };
    return { text: `Bra konsistens ±${pct}% (${refScales.length} referenser)`, color: 'bg-green-100 text-green-800' };
  })();

  const axisHint = currentAxis();

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold flex items-center gap-2">
            <Ruler className="w-4 h-4 text-primary" />
            Rita & mät – ställningens höjd och längd
          </h3>
          <Badge variant="outline">
            Skala: {metersPerPx ? `${(metersPerPx * 100).toFixed(2)} cm/px` : 'okalibrerad'}
          </Badge>
        </div>

        {/* Calibration refs */}
        <div className="border rounded p-3 bg-muted/30 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Label className="text-xs font-semibold">Kalibreringsreferenser ({refScales.length}/{refs.length} ritade)</Label>
            <div className="flex gap-1">
              <Select onValueChange={(v) => addStandardRef(parseInt(v))}>
                <SelectTrigger className="h-7 w-[200px] text-xs">
                  <SelectValue placeholder="+ Lägg till standardmått" />
                </SelectTrigger>
                <SelectContent>
                  {STANDARDS.map((s, i) => (
                    <SelectItem key={i} value={String(i)}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-7" onClick={addCustomRef}>
                <Plus className="w-3 h-3 mr-1" />Egen
              </Button>
            </div>
          </div>

          {refs.map((r, idx) => {
            const color = CALIB_COLORS[idx % CALIB_COLORS.length];
            const drawn = !!r.line;
            const computedM = drawn && metersPerPx ? +(pxLen(r.line!) * metersPerPx).toFixed(2) : null;
            return (
              <div key={r.id} className="flex items-center gap-2 flex-wrap text-xs bg-background rounded p-2 border">
                <div className="w-3 h-3 rounded" style={{ background: color }} />
                <Input
                  className="h-7 w-36" value={r.label}
                  onChange={(e) => updateRef(r.id, { label: e.target.value })}
                />
                <Input
                  type="number" step="0.01" min="0.05" className="h-7 w-20"
                  value={r.meters}
                  onChange={(e) => updateRef(r.id, { meters: parseFloat(e.target.value) || 0 })}
                />
                <span>m</span>
                <Select value={r.axis} onValueChange={(v: any) => updateRef(r.id, { axis: v })}>
                  <SelectTrigger className="h-7 w-[110px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vertical">Lodrätt</SelectItem>
                    <SelectItem value="horizontal">Vågrätt</SelectItem>
                    <SelectItem value="free">Fri</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm" variant={mode?.kind === 'calibrate' && mode.refId === r.id ? 'default' : 'outline'}
                  className="h-7"
                  onClick={() => setMode({ kind: 'calibrate', refId: r.id })}
                >
                  <Ruler className="w-3 h-3 mr-1" />{drawn ? 'Rita om' : 'Rita'}
                </Button>
                {drawn && (
                  <Badge variant="secondary" className="text-[10px]">≈ {computedM} m beräknat</Badge>
                )}
                {refs.length > 1 && (
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeRef(r.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            );
          })}

          {confidenceLabel && (
            <div className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${confidenceLabel.color}`}>
              {spread > 0.10 && <AlertTriangle className="w-3 h-3" />}
              {confidenceLabel.text}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            💡 Tips: Rita längs något så långt som möjligt, på <b>samma avstånd som fasaden</b> där ställningen ska stå. Fler referenser = mer pålitlig skala.
          </p>
        </div>

        {/* Height/Length buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm" variant={mode?.kind === 'height' ? 'default' : 'outline'}
            onClick={() => setMode({ kind: 'height' })} disabled={!metersPerPx}
          >
            <Move3d className="w-4 h-4 mr-1" style={{ color: HEIGHT_COLOR }} />
            Rita höjd (lodrätt) {heightM ? `· ${heightM} m` : ''}
          </Button>
          <Button
            size="sm" variant={mode?.kind === 'length' ? 'default' : 'outline'}
            onClick={() => setMode({ kind: 'length' })} disabled={!metersPerPx}
          >
            <Move3d className="w-4 h-4 mr-1 rotate-90" style={{ color: LENGTH_COLOR }} />
            Rita längd (vågrätt) {lengthM ? `· ${lengthM} m` : ''}
          </Button>
          <Button size="sm" variant="ghost" onClick={clearAll}>
            <RotateCcw className="w-4 h-4 mr-1" />Rensa allt
          </Button>
          {mode && (
            <Badge variant="outline" className="text-[10px]">
              {axisHint === 'vertical' && '⇕ Låst lodrätt'}
              {axisHint === 'horizontal' && '⇔ Låst vågrätt'}
              {axisHint === 'free' && '✥ Fri linje'}
              {' '}(håll Shift för fri)
            </Badge>
          )}
        </div>

        {/* Drawing canvas */}
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
              {refs.map((r, i) => renderLine(r.line, CALIB_COLORS[i % CALIB_COLORS.length], `${r.meters} m`))}
              {renderLine(heightLine, HEIGHT_COLOR, heightM ? `H ${heightM} m` : undefined)}
              {renderLine(lengthLine, LENGTH_COLOR, lengthM ? `L ${lengthM} m` : undefined)}
              {drawing && mode && renderLine(
                drawing,
                mode.kind === 'height' ? HEIGHT_COLOR :
                mode.kind === 'length' ? LENGTH_COLOR :
                CALIB_COLORS[refs.findIndex((x) => x.id === (mode as any).refId) % CALIB_COLORS.length],
              )}
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
