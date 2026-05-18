import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Loader2, Ruler, Move3d, Construction, RotateCcw, Download, Plus, Trash2,
  AlertTriangle, Save, Mountain, Ban, ArrowUpDown, Building2, Eye, EyeOff,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { splitIntoBays, DEFAULT_LIFT } from '@/utils/peri/scaffoldingEngine';

interface Line { x1: number; y1: number; x2: number; y2: number }
interface CalibRef {
  id: string;
  label: string;
  meters: number;
  axis: 'vertical' | 'horizontal' | 'free';
  line: Line | null;
}
interface ExtraLine {
  id: string;
  type: 'eave' | 'obstacle' | 'bridging' | 'level_diff';
  line: Line;
  section_id?: string | null;
  comment?: string;
  saved_id?: string;
}
interface SectionLite {
  id: string;
  name: string;
  length_m: number | null;
  height_m: number | null;
  width_m: number | null;
  lift_height_m: number | null;
  work_levels: number | null;
}

type Mode =
  | { kind: 'calibrate'; refId: string }
  | { kind: 'height' }
  | { kind: 'length' }
  | { kind: 'eave' }
  | { kind: 'obstacle' }
  | { kind: 'bridging' }
  | { kind: 'level_diff' }
  | null;

interface Props {
  projectId: string;
  photoUrl: string;
  analysis?: any;
  notes?: string;
}

const HEIGHT_COLOR = '#ef4444';
const LENGTH_COLOR = '#f59e0b';
const EAVE_COLOR = '#0ea5e9';
const OBSTACLE_COLOR = '#dc2626';
const BRIDGING_COLOR = '#a855f7';
const LEVEL_COLOR = '#14b8a6';
const OVERLAY_COLOR = '#22c55e';
const CALIB_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#ec4899', '#06b6d4'];

const TYPE_COLOR: Record<ExtraLine['type'], string> = {
  eave: EAVE_COLOR, obstacle: OBSTACLE_COLOR, bridging: BRIDGING_COLOR, level_diff: LEVEL_COLOR,
};
const TYPE_LABEL: Record<ExtraLine['type'], string> = {
  eave: 'Takfot', obstacle: 'Hinder', bridging: 'Överbryggning', level_diff: 'Nivåskillnad',
};

const STANDARDS: Array<{ label: string; meters: number; axis: 'vertical' | 'horizontal' }> = [
  { label: 'Ytterdörr höjd (2,10 m)', meters: 2.10, axis: 'vertical' },
  { label: 'Ytterdörr bredd (0,90 m)', meters: 0.90, axis: 'horizontal' },
  { label: 'Fönster höjd (1,20 m)', meters: 1.20, axis: 'vertical' },
  { label: 'Fönster bredd (1,00 m)', meters: 1.00, axis: 'horizontal' },
  { label: 'Garageport höjd (2,10 m)', meters: 2.10, axis: 'vertical' },
  { label: 'Våningshöjd (2,70 m)', meters: 2.70, axis: 'vertical' },
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
  const [extras, setExtras] = useState<ExtraLine[]>([]);

  const [sections, setSections] = useState<SectionLite[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [overlaySectionId, setOverlaySectionId] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);

  const [visualizing, setVisualizing] = useState(false);
  const [vizUrl, setVizUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Load sections
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('scaffolding_sections')
        .select('id,name,length_m,height_m,width_m,lift_height_m,work_levels')
        .eq('project_id', projectId).order('sort_order');
      setSections((data as any) || []);
    })();
  }, [projectId]);

  // Load existing measurements for this photo
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('scaffolding_measurements')
        .select('*').eq('project_id', projectId).eq('photo_url', photoUrl);
      if (!data) return;
      const loaded: ExtraLine[] = [];
      for (const r of data as any[]) {
        const c = r.coords || {};
        if (!c.x1 && c.x1 !== 0) continue;
        const line: Line = { x1: c.x1, y1: c.y1, x2: c.x2, y2: c.y2 };
        if (r.type === 'length') setLengthLine(line);
        else if (r.type === 'height') setHeightLine(line);
        else if (['eave', 'obstacle', 'bridging', 'level_diff'].includes(r.type)) {
          loaded.push({
            id: rid(), type: r.type, line, section_id: r.section_id,
            comment: r.comment, saved_id: r.id,
          });
        }
      }
      if (loaded.length) setExtras(loaded);
    })();
  }, [projectId, photoUrl]);

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

  const refScales = refs
    .filter((r) => r.line && r.meters > 0)
    .map((r) => ({ ref: r, px: pxLen(r.line!), mpp: r.meters / pxLen(r.line!) }));

  const metersPerPx = (() => {
    if (refScales.length === 0) return 0;
    const w = refScales.map((s) => s.px);
    const tw = w.reduce((a, b) => a + b, 0);
    return refScales.reduce((acc, s, i) => acc + s.mpp * w[i], 0) / tw;
  })();

  const spread = (() => {
    if (refScales.length < 2) return 0;
    const vals = refScales.map((s) => s.mpp);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    return Math.max(...vals.map((v) => Math.abs(v - mean) / mean));
  })();

  const toM = (l: Line | null) => (l && metersPerPx ? +(pxLen(l) * metersPerPx).toFixed(2) : null);
  const heightM = toM(heightLine);
  const lengthM = toM(lengthLine);

  const pos = (e: React.PointerEvent) => {
    const r = wrapRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const currentAxis = (): 'vertical' | 'horizontal' | 'free' => {
    if (!mode) return 'free';
    if (shiftKey) return 'free';
    if (mode.kind === 'height' || mode.kind === 'eave' || mode.kind === 'level_diff') return 'vertical';
    if (mode.kind === 'length' || mode.kind === 'bridging') return 'horizontal';
    if (mode.kind === 'obstacle') return 'free';
    const r = refs.find((x) => x.id === (mode as any).refId);
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
    setDrawing(snap({ x: drawing.x1, y: drawing.y1 }, pos(e)));
  };
  const onUp = () => {
    if (!drawing || !mode) return;
    if (pxLen(drawing) < 8) { setDrawing(null); return; }
    if (mode.kind === 'calibrate') {
      setRefs((rs) => rs.map((r) => r.id === mode.refId ? { ...r, line: drawing } : r));
    } else if (mode.kind === 'height') setHeightLine(drawing);
    else if (mode.kind === 'length') setLengthLine(drawing);
    else {
      setExtras((xs) => [...xs, {
        id: rid(), type: mode.kind as ExtraLine['type'], line: drawing, section_id: activeSectionId,
      }]);
    }
    setDrawing(null); setMode(null);
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

  const removeExtra = async (id: string) => {
    const e = extras.find((x) => x.id === id);
    if (e?.saved_id) await supabase.from('scaffolding_measurements').delete().eq('id', e.saved_id);
    setExtras((xs) => xs.filter((x) => x.id !== id));
  };

  const clearAll = () => {
    setRefs([{ id: rid(), label: 'Ytterdörr höjd', meters: 2.10, axis: 'vertical', line: null }]);
    setHeightLine(null); setLengthLine(null); setExtras([]); setMode(null);
  };

  const saveAllMeasurements = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: proj } = await supabase.from('projects').select('organization_id').eq('id', projectId).maybeSingle();
      if (!user || !proj) throw new Error('Saknar projekt/organisation');
      const org_id = proj.organization_id;

      // Wipe basic length/height for this photo and re-insert (simpler than upsert)
      await supabase.from('scaffolding_measurements').delete()
        .eq('project_id', projectId).eq('photo_url', photoUrl)
        .in('type', ['length', 'height']);

      const rows: any[] = [];
      if (lengthLine && lengthM) rows.push({
        project_id: projectId, organization_id: org_id, photo_url: photoUrl,
        type: 'length', meters: lengthM, px_length: pxLen(lengthLine),
        coords: lengthLine, source: 'manual',
        confidence: spread > 0 ? +(1 - Math.min(spread, 1)).toFixed(2) : 1,
      });
      if (heightLine && heightM) rows.push({
        project_id: projectId, organization_id: org_id, photo_url: photoUrl,
        type: 'height', meters: heightM, px_length: pxLen(heightLine),
        coords: heightLine, source: 'manual',
        confidence: spread > 0 ? +(1 - Math.min(spread, 1)).toFixed(2) : 1,
      });

      // Extras: insert new ones, update existing ones (section / comment changes)
      const newExtras = extras.filter((e) => !e.saved_id);
      const oldExtras = extras.filter((e) => e.saved_id);
      for (const e of newExtras) {
        rows.push({
          project_id: projectId, organization_id: org_id, photo_url: photoUrl,
          type: e.type, meters: metersPerPx ? +(pxLen(e.line) * metersPerPx).toFixed(2) : null,
          px_length: pxLen(e.line), coords: e.line, section_id: e.section_id || null,
          comment: e.comment || null, source: 'manual',
        });
      }
      for (const e of oldExtras) {
        await supabase.from('scaffolding_measurements').update({
          section_id: e.section_id || null, comment: e.comment || null,
        }).eq('id', e.saved_id!);
      }
      if (rows.length) {
        const { error } = await supabase.from('scaffolding_measurements').insert(rows);
        if (error) throw error;
      }

      // Update status to "measured"
      await supabase.from('scaffolding_jobs').update({
        project_status: 'measured',
        calibration: {
          meters_per_px: metersPerPx,
          spread,
          refs: refScales.map((s) => ({ label: s.ref.label, meters: s.ref.meters, px: s.px })),
        },
      }).eq('project_id', projectId);

      toast({ title: 'Mätningar sparade', description: `${rows.length} linjer` });
    } catch (e: any) {
      toast({ title: 'Kunde inte spara', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const visualize = async () => {
    if (!heightM || !lengthM) {
      toast({ title: 'Rita höjd och längd först', variant: 'destructive' }); return;
    }
    setVisualizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('visualize-scaffolding', {
        body: {
          project_id: projectId, photo_url: photoUrl, analysis, notes,
          measurements: {
            height_m: heightM, length_m: lengthM,
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

  // ============ SVG overlay calculation ============
  const overlaySection = useMemo(
    () => sections.find((s) => s.id === overlaySectionId) || null,
    [sections, overlaySectionId],
  );

  const overlayGeometry = useMemo(() => {
    if (!showOverlay || !overlaySection || !lengthLine || !metersPerPx) return null;
    if (!overlaySection.length_m || !overlaySection.height_m) return null;

    // Use length line as base anchor (along the wall). Compute perpendicular up for height.
    const dx = lengthLine.x2 - lengthLine.x1;
    const dy = lengthLine.y2 - lengthLine.y1;
    const lenPx = Math.hypot(dx, dy) || 1;
    const ux = dx / lenPx; const uy = dy / lenPx;            // along wall
    // perpendicular (assume up = negative y; choose perp that points "up" toward heightLine if any)
    let nx = -uy; let ny = ux;
    if (heightLine) {
      const refDx = heightLine.x2 - heightLine.x1;
      const refDy = heightLine.y2 - heightLine.y1;
      // ensure perp points roughly along height line direction
      if (nx * refDx + ny * refDy < 0) { nx = -nx; ny = -ny; }
    } else if (ny > 0) { nx = -nx; ny = -ny; }

    const pxPerM = 1 / metersPerPx;
    const bays = splitIntoBays(overlaySection.length_m);
    const lift = overlaySection.lift_height_m || DEFAULT_LIFT;
    const nLifts = Math.max(1, Math.ceil(overlaySection.height_m / lift));

    // bay vertical lines (along wall)
    const bayPoints: number[] = [0];
    let acc = 0;
    for (const b of bays) { acc += b; bayPoints.push(acc); }

    const base = { x: lengthLine.x1, y: lengthLine.y1 };
    const totalLen = bayPoints[bayPoints.length - 1];
    const totalHeight = overlaySection.height_m;

    const project = (mAlong: number, mUp: number) => ({
      x: base.x + ux * mAlong * pxPerM + nx * mUp * pxPerM,
      y: base.y + uy * mAlong * pxPerM + ny * mUp * pxPerM,
    });

    return { bayPoints, nLifts, lift, totalLen, totalHeight, project };
  }, [showOverlay, overlaySection, lengthLine, heightLine, metersPerPx]);

  const renderOverlay = () => {
    if (!overlayGeometry) return null;
    const { bayPoints, nLifts, lift, totalLen, totalHeight, project } = overlayGeometry;
    const verticals = bayPoints.map((m, i) => {
      const a = project(m, 0); const b = project(m, totalHeight);
      return <line key={`v${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={OVERLAY_COLOR} strokeWidth={2} opacity={0.85} />;
    });
    const horizontals: JSX.Element[] = [];
    for (let i = 0; i <= nLifts; i++) {
      const h = Math.min(i * lift, totalHeight);
      const a = project(0, h); const b = project(totalLen, h);
      horizontals.push(<line key={`h${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
        stroke={OVERLAY_COLOR} strokeWidth={2} opacity={i === nLifts ? 0.95 : 0.6}
        strokeDasharray={i === 0 || i === nLifts ? '' : '4 3'} />);
    }
    // Diagonal in first bay
    const diag = bayPoints.length > 1 ? (() => {
      const a = project(0, 0); const b = project(bayPoints[1], lift);
      return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={OVERLAY_COLOR} strokeWidth={1.5} opacity={0.6} strokeDasharray="2 3" />;
    })() : null;
    // Label
    const labelPos = project(totalLen / 2, totalHeight + 0.4);
    return (
      <g>
        {verticals}{horizontals}{diag}
        <rect x={labelPos.x - 60} y={labelPos.y - 12} width={120} height={20} rx={4} fill={OVERLAY_COLOR} />
        <text x={labelPos.x} y={labelPos.y + 3} fontSize={11} fontWeight="700" fill="white" textAnchor="middle">
          {bayPoints.length - 1} fack × {nLifts} lag
        </text>
      </g>
    );
  };

  const renderLine = (l: Line | null, color: string, label?: string) => {
    if (!l) return null;
    const midX = (l.x1 + l.x2) / 2; const midY = (l.y1 + l.y2) / 2;
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

  const modeBtn = (kind: Exclude<Mode, null>['kind'], icon: JSX.Element, label: string, color: string) => (
    <Button
      size="sm"
      variant={mode?.kind === kind ? 'default' : 'outline'}
      onClick={() => setMode({ kind } as Mode)}
      disabled={!metersPerPx}
    >
      <span className="mr-1" style={{ color }}>{icon}</span>{label}
    </Button>
  );

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold flex items-center gap-2">
            <Ruler className="w-4 h-4 text-primary" />Rita, mät & visualisera ställningen
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
                  {STANDARDS.map((s, i) => <SelectItem key={i} value={String(i)}>{s.label}</SelectItem>)}
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
            const cm = drawn && metersPerPx ? +(pxLen(r.line!) * metersPerPx).toFixed(2) : null;
            return (
              <div key={r.id} className="flex items-center gap-2 flex-wrap text-xs bg-background rounded p-2 border">
                <div className="w-3 h-3 rounded" style={{ background: color }} />
                <Input className="h-7 w-36" value={r.label}
                  onChange={(e) => updateRef(r.id, { label: e.target.value })} />
                <Input type="number" step="0.01" min="0.05" className="h-7 w-20" value={r.meters}
                  onChange={(e) => updateRef(r.id, { meters: parseFloat(e.target.value) || 0 })} />
                <span>m</span>
                <Select value={r.axis} onValueChange={(v: any) => updateRef(r.id, { axis: v })}>
                  <SelectTrigger className="h-7 w-[110px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vertical">Lodrätt</SelectItem>
                    <SelectItem value="horizontal">Vågrätt</SelectItem>
                    <SelectItem value="free">Fri</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm"
                  variant={mode?.kind === 'calibrate' && mode.refId === r.id ? 'default' : 'outline'}
                  className="h-7"
                  onClick={() => setMode({ kind: 'calibrate', refId: r.id })}>
                  <Ruler className="w-3 h-3 mr-1" />{drawn ? 'Rita om' : 'Rita'}
                </Button>
                {drawn && <Badge variant="secondary" className="text-[10px]">≈ {cm} m</Badge>}
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
              {spread > 0.10 && <AlertTriangle className="w-3 h-3" />}{confidenceLabel.text}
            </div>
          )}
        </div>

        {/* Mode buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {modeBtn('height', <Move3d className="w-4 h-4 inline" />, `Höjd${heightM ? ` · ${heightM} m` : ''}`, HEIGHT_COLOR)}
          {modeBtn('length', <Move3d className="w-4 h-4 inline rotate-90" />, `Längd${lengthM ? ` · ${lengthM} m` : ''}`, LENGTH_COLOR)}
          {modeBtn('eave', <Mountain className="w-4 h-4 inline" />, 'Takfot', EAVE_COLOR)}
          {modeBtn('obstacle', <Ban className="w-4 h-4 inline" />, 'Hinder', OBSTACLE_COLOR)}
          {modeBtn('bridging', <Building2 className="w-4 h-4 inline" />, 'Överbryggning', BRIDGING_COLOR)}
          {modeBtn('level_diff', <ArrowUpDown className="w-4 h-4 inline" />, 'Nivåskillnad', LEVEL_COLOR)}
          <Button size="sm" variant="ghost" onClick={clearAll}><RotateCcw className="w-4 h-4 mr-1" />Rensa</Button>
          {mode && (
            <Badge variant="outline" className="text-[10px]">
              {axisHint === 'vertical' && '⇕ Lodrätt'}
              {axisHint === 'horizontal' && '⇔ Vågrätt'}
              {axisHint === 'free' && '✥ Fri'}
              {' '}(Shift för fri)
            </Badge>
          )}
        </div>

        {/* Section context */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <Label className="text-xs">Knyt nya mått till sektion:</Label>
          <Select value={activeSectionId || 'none'} onValueChange={(v) => setActiveSectionId(v === 'none' ? null : v)}>
            <SelectTrigger className="h-7 w-[180px] text-xs"><SelectValue placeholder="(ingen)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">(ingen)</SelectItem>
              {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <span className="mx-2 text-muted-foreground">|</span>
          <Label className="text-xs">Visa ställning för:</Label>
          <Select value={overlaySectionId || 'none'} onValueChange={(v) => setOverlaySectionId(v === 'none' ? null : v)}>
            <SelectTrigger className="h-7 w-[180px] text-xs"><SelectValue placeholder="(ingen)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">(ingen)</SelectItem>
              {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" className="h-7" onClick={() => setShowOverlay((v) => !v)}>
            {showOverlay ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </Button>
        </div>

        {/* Canvas */}
        <div
          ref={wrapRef}
          className="relative border rounded overflow-hidden bg-muted select-none touch-none"
          style={{ cursor: mode ? 'crosshair' : 'default' }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}
        >
          <img ref={imgRef} src={photoUrl} alt="Hus"
            className="w-full h-auto block pointer-events-none"
            onLoad={() => imgRef.current && setSize({ w: imgRef.current.clientWidth, h: imgRef.current.clientHeight })} />
          {size.w > 0 && (
            <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${size.w} ${size.h}`}>
              {refs.map((r, i) => renderLine(r.line, CALIB_COLORS[i % CALIB_COLORS.length], `${r.meters} m`))}
              {renderLine(heightLine, HEIGHT_COLOR, heightM ? `H ${heightM} m` : undefined)}
              {renderLine(lengthLine, LENGTH_COLOR, lengthM ? `L ${lengthM} m` : undefined)}
              {extras.map((e) => {
                const m = metersPerPx ? +(pxLen(e.line) * metersPerPx).toFixed(2) : null;
                const label = `${TYPE_LABEL[e.type]}${m ? ' ' + m + ' m' : ''}`;
                return <g key={e.id}>{renderLine(e.line, TYPE_COLOR[e.type], label)}</g>;
              })}
              {drawing && mode && renderLine(
                drawing,
                mode.kind === 'height' ? HEIGHT_COLOR :
                mode.kind === 'length' ? LENGTH_COLOR :
                ['eave', 'obstacle', 'bridging', 'level_diff'].includes(mode.kind) ? TYPE_COLOR[(mode as any).kind] :
                CALIB_COLORS[refs.findIndex((x) => x.id === (mode as any).refId) % CALIB_COLORS.length],
              )}
              {renderOverlay()}
            </svg>
          )}
        </div>

        {/* Extras list (link sections / delete) */}
        {extras.length > 0 && (
          <div className="border rounded p-2 space-y-1">
            <Label className="text-xs">Extra mätlinjer ({extras.length})</Label>
            {extras.map((e) => {
              const m = metersPerPx ? +(pxLen(e.line) * metersPerPx).toFixed(2) : null;
              return (
                <div key={e.id} className="flex items-center gap-2 text-xs flex-wrap">
                  <div className="w-3 h-3 rounded" style={{ background: TYPE_COLOR[e.type] }} />
                  <span className="font-medium w-24">{TYPE_LABEL[e.type]}</span>
                  <span className="text-muted-foreground">{m ? `${m} m` : '–'}</span>
                  <Select value={e.section_id || 'none'}
                    onValueChange={(v) => setExtras((xs) => xs.map((x) => x.id === e.id ? { ...x, section_id: v === 'none' ? null : v } : x))}>
                    <SelectTrigger className="h-7 w-[160px] text-xs"><SelectValue placeholder="(ingen sektion)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">(ingen sektion)</SelectItem>
                      {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input className="h-7 text-xs flex-1 min-w-[120px]" placeholder="Kommentar"
                    value={e.comment || ''}
                    onChange={(ev) => setExtras((xs) => xs.map((x) => x.id === e.id ? { ...x, comment: ev.target.value } : x))} />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeExtra(e.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t">
          <div className="text-sm">
            {heightM && lengthM ? (
              <>Fasad: <b>{lengthM} m</b> × <b>{heightM} m</b> = <b>{(heightM * lengthM).toFixed(1)} m²</b></>
            ) : (
              <span className="text-muted-foreground">Rita höjd och längd för att räkna ytan.</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={saveAllMeasurements} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Spara mätningar
            </Button>
            <Button onClick={visualize} disabled={visualizing || !heightM || !lengthM}>
              {visualizing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Construction className="w-4 h-4 mr-1" />}
              {vizUrl ? 'Bygg om (AI-bild)' : 'AI-rendera ställning'}
            </Button>
          </div>
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
