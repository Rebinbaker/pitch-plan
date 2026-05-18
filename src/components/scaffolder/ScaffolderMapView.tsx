import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Truck, MapPin as MapPinIcon, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { batchGeocodeAddresses } from '@/utils/geocoding';
import type { Project } from '@/types/project';
import { simpleProgress, SimpleChecklistState } from './scaffoldingChecklist';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface JobMeta {
  project_id: string;
  simple_checklist: SimpleChecklistState;
  risk_level: 'green' | 'yellow' | 'red';
}

interface GeoProject extends Project {
  lat: number;
  lng: number;
  pct: number;
  risk: 'green' | 'yellow' | 'red';
  safetySigned: boolean;
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const b = L.latLngBounds(positions.map((p) => L.latLng(p[0], p[1])));
      map.fitBounds(b, { padding: [50, 50], maxZoom: 10 });
    }
  }, [positions, map]);
  return null;
}

function pinIcon(risk: 'green' | 'yellow' | 'red', pct: number) {
  const color = risk === 'red' ? 'hsl(0,84%,55%)' : risk === 'yellow' ? 'hsl(43,96%,50%)' : pct >= 100 ? 'hsl(142,71%,40%)' : 'hsl(220,91%,54%)';
  const circ = 2 * Math.PI * 14;
  const off = circ - (pct / 100) * circ;
  return L.divIcon({
    className: 'scaffolder-pin',
    html: `<svg width="44" height="52" viewBox="-2 -4 44 56">
      <path d="M20 46 C20 46, 38 28, 38 18 C38 8.06 29.94 0 20 0 C10.06 0 2 8.06 2 18 C2 28 20 46 20 46Z" fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="20" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="3"/>
      <circle cx="20" cy="18" r="14" fill="none" stroke="white" stroke-width="3"
        stroke-dasharray="${circ}" stroke-dashoffset="${off}" stroke-linecap="round" transform="rotate(-90 20 18)"/>
      <text x="20" y="22" text-anchor="middle" fill="white" font-size="10" font-weight="bold">${pct}%</text>
    </svg>`,
    iconSize: [44, 52], iconAnchor: [22, 52], popupAnchor: [0, -52],
  });
}

interface Props {
  projects: Project[];
  onOpen: (p: Project) => void;
}

export function ScaffolderMapView({ projects, onOpen }: Props) {
  const [jobs, setJobs] = useState<Record<string, JobMeta>>({});
  const [trailers, setTrailers] = useState<any[]>([]);
  const [geo, setGeo] = useState<GeoProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const ids = projects.map((p) => p.id);
      if (ids.length === 0) { setJobs({}); return; }
      const { data } = await supabase.from('scaffolding_jobs' as any).select('project_id, simple_checklist, risk_level').in('project_id', ids);
      const map: Record<string, JobMeta> = {};
      ((data as any[]) || []).forEach((j) => { map[j.project_id] = j; });
      setJobs(map);
    })();
  }, [projects]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('scaffolding' as any).select('*');
      setTrailers((data as any[]) || []);
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const addressed = projects.filter((p) => p.address?.trim());
      const map = addressed.length ? await batchGeocodeAddresses(addressed.map((p) => ({ id: p.id, address: p.address }))) : new Map();
      if (cancelled) return;
      const out: GeoProject[] = projects.map((p) => {
        const c = map.get(p.id) || { lat: 62.0 + (Math.random() - 0.5) * 5, lng: 15.0 + (Math.random() - 0.5) * 5 };
        const j = jobs[p.id];
        return {
          ...p, lat: c.lat, lng: c.lng,
          pct: j ? simpleProgress(j.simple_checklist || {}) : 0,
          risk: j?.risk_level || 'green',
          safetySigned: false,
        };
      });
      setGeo(out);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [projects, jobs]);

  const positions = geo.map((g) => [g.lat, g.lng] as [number, number]);

  // Vagnar nära att släppas: i bruk + det projekt som har den högsta framdrift
  const trailerStatus = useMemo(() => {
    const upcoming = trailers.filter((t) => t.status === 'I bruk').map((t) => {
      const assigned = projects.find((p) => p.assignedTrailer === t.id || p.assignedTrailer === t.name);
      const pct = assigned ? simpleProgress(jobs[assigned.id]?.simple_checklist || {}) : 0;
      return { trailer: t, project: assigned, pct };
    }).sort((a, b) => b.pct - a.pct);
    const available = trailers.filter((t) => t.status === 'Tillgänglig');
    return { upcoming, available };
  }, [trailers, jobs, projects]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
      {/* Sidopanel */}
      <div className="space-y-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Truck className="w-4 h-4" />Snart lediga vagnar</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            {trailerStatus.upcoming.length === 0 && <div className="text-muted-foreground">Inga upptagna vagnar</div>}
            {trailerStatus.upcoming.slice(0, 6).map((u) => (
              <div key={u.trailer.id} className="border rounded p-2">
                <div className="font-medium">{u.trailer.name}</div>
                <div className="text-muted-foreground">{u.project?.name || 'Okänt projekt'}</div>
                <div className="flex justify-between mt-1">
                  <Badge variant={u.pct >= 80 ? 'default' : 'secondary'} className="text-[10px]">{u.pct}% klart</Badge>
                  {u.pct >= 80 && <span className="text-emerald-600 font-medium">Släpps snart</span>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-600" />Tillgängliga</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-xs">
            {trailerStatus.available.length === 0 && <div className="text-muted-foreground">Inga lediga vagnar</div>}
            {trailerStatus.available.map((t) => (
              <div key={t.id} className="flex justify-between border-b last:border-0 py-1">
                <span>{t.name}</span>
                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-600">Ledig</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Karta */}
      <div className="rounded-lg border overflow-hidden" style={{ height: 600 }}>
        <MapContainer center={[62.0, 15.0]} zoom={5} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {positions.length > 0 && <FitBounds positions={positions} />}
          {geo.map((p) => (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={pinIcon(p.risk, p.pct)}>
              <Popup minWidth={240}>
                <div className="space-y-2">
                  <div>
                    <div className="font-semibold text-sm">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.address}</div>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {p.risk === 'red' && <Badge variant="destructive" className="text-[10px]"><AlertTriangle className="w-3 h-3 mr-0.5" />Akut</Badge>}
                    {p.risk === 'yellow' && <Badge className="bg-yellow-500 text-white text-[10px]">Risk</Badge>}
                    {p.risk === 'green' && <Badge className="bg-emerald-600 text-white text-[10px]">OK</Badge>}
                    <Badge variant="outline" className="text-[10px]">{p.pct}%</Badge>
                  </div>
                  <Button size="sm" className="w-full" onClick={() => onOpen(p)}>Öppna kort</Button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        {loading && <div className="text-xs text-muted-foreground p-2">Laddar positioner…</div>}
      </div>
    </div>
  );
}
