import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Project, ProjectStatus } from '@/types/project';
import { ScaffoldingTrailer } from '@/types/scaffolding';
import { geocodeAddress } from '@/utils/geocoding';
import { analyzeAllProjects, analyzeProjectRisk, RiskLevel } from '@/utils/riskAnalysis';
import { ControlTowerPanel } from '@/components/map/ControlTowerPanel';
import { MapLegend } from '@/components/map/MapLegend';
import { MapPin, Radar } from 'lucide-react';

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface ProjectMapViewProps {
  projects: Project[];
  trailers?: ScaffoldingTrailer[];
  teams?: any[];
  onViewDetails: (project: Project) => void;
}

interface GeocodedProject extends Project {
  lat: number;
  lng: number;
}

const STATUS_COLORS: Record<ProjectStatus, string> = {
  planned: 'hsl(220, 91%, 54%)',
  ongoing: 'hsl(24, 95%, 53%)',
  completed: 'hsl(142, 71%, 45%)',
  invoiced: 'hsl(262, 83%, 58%)',
  ånger: 'hsl(0, 84%, 60%)',
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  planned: 'Planerad',
  ongoing: 'Pågående',
  completed: 'Slutförd',
  invoiced: 'Fakturerad',
  ånger: 'Ånger',
};

function createPinIcon(status: ProjectStatus, progress: number, riskLevel: RiskLevel): L.DivIcon {
  let color = STATUS_COLORS[status] || STATUS_COLORS.planned;
  let glowStyle = '';
  let pulseAnimation = '';

  if (riskLevel === 'delayed') {
    color = 'hsl(0, 84%, 50%)';
    glowStyle = 'filter: drop-shadow(0 0 10px hsl(0, 84%, 60%)) drop-shadow(0 0 20px hsl(0, 84%, 50%));';
    pulseAnimation = 'animation: pin-pulse 1.5s ease-in-out infinite;';
  } else if (riskLevel === 'high') {
    color = 'hsl(0, 84%, 60%)';
    glowStyle = 'filter: drop-shadow(0 0 8px hsl(0, 84%, 60%)) drop-shadow(0 0 16px hsl(0, 84%, 50%));';
  } else if (riskLevel === 'warning') {
    color = 'hsl(43, 96%, 56%)';
    glowStyle = 'filter: drop-shadow(0 0 6px hsl(43, 96%, 56%));';
  }

  const circumference = 2 * Math.PI * 14;
  const offset = circumference - (progress / 100) * circumference;

  const riskBadge = riskLevel === 'delayed'
    ? `<circle cx="34" cy="6" r="7" fill="hsl(0,84%,50%)" stroke="white" stroke-width="1.5"/>
       <text x="34" y="10" text-anchor="middle" fill="white" font-size="9" font-weight="bold">!</text>`
    : riskLevel === 'high'
    ? `<circle cx="34" cy="6" r="6" fill="hsl(0,84%,60%)" stroke="white" stroke-width="1.5"/>
       <text x="34" y="9" text-anchor="middle" fill="white" font-size="8" font-weight="bold">!</text>`
    : riskLevel === 'warning'
    ? `<circle cx="34" cy="6" r="5" fill="hsl(43,96%,56%)" stroke="white" stroke-width="1.5"/>
       <text x="34" y="9" text-anchor="middle" fill="white" font-size="7" font-weight="bold">⚠</text>`
    : '';

  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <style>
        @keyframes pin-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.12); opacity: 0.85; }
        }
      </style>
      <div style="position:relative;width:44px;height:52px;display:flex;align-items:flex-start;justify-content:center;${glowStyle}${pulseAnimation}">
        <svg width="44" height="52" viewBox="-2 -4 44 56">
          <path d="M20 46 C20 46, 38 28, 38 18 C38 8.06 29.94 0 20 0 C10.06 0 2 8.06 2 18 C2 28 20 46 20 46Z" fill="${color}" stroke="white" stroke-width="2"/>
          <circle cx="20" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="3"/>
          <circle cx="20" cy="18" r="14" fill="none" stroke="white" stroke-width="3"
            stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
            stroke-linecap="round" transform="rotate(-90 20 18)"/>
          <text x="20" y="22" text-anchor="middle" fill="white" font-size="10" font-weight="bold">${progress}%</text>
          ${riskBadge}
        </svg>
      </div>
    `,
    iconSize: [44, 52],
    iconAnchor: [22, 52],
    popupAnchor: [0, -52],
  });
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
    }
  }, [positions, map]);
  return null;
}

// Activity heatmap dots
function ActivityHeatmap({ geocodedProjects }: { geocodedProjects: GeocodedProject[] }) {
  if (geocodedProjects.length < 3) return null;

  // Create density circles around clusters
  const clusters: { lat: number; lng: number; count: number }[] = [];
  const visited = new Set<string>();

  geocodedProjects.forEach(p => {
    const key = `${p.lat.toFixed(1)},${p.lng.toFixed(1)}`;
    if (visited.has(key)) return;
    visited.add(key);

    const nearby = geocodedProjects.filter(
      q => Math.abs(q.lat - p.lat) < 0.5 && Math.abs(q.lng - p.lng) < 0.5
    );
    if (nearby.length >= 2) {
      const avgLat = nearby.reduce((s, n) => s + n.lat, 0) / nearby.length;
      const avgLng = nearby.reduce((s, n) => s + n.lng, 0) / nearby.length;
      clusters.push({ lat: avgLat, lng: avgLng, count: nearby.length });
    }
  });

  return (
    <>
      {clusters.map((c, i) => (
        <CircleMarker
          key={`heat-${i}`}
          center={[c.lat, c.lng]}
          radius={Math.min(c.count * 15, 60)}
          pathOptions={{
            fillColor: 'hsl(142, 71%, 45%)',
            fillOpacity: 0.12,
            color: 'hsl(142, 71%, 45%)',
            weight: 1,
            opacity: 0.25,
          }}
        >
          <Popup>
            <div className="text-xs">
              <span className="font-semibold">{c.count} projekt</span> i detta område
              <div className="text-completed mt-1">● Hög aktivitet</div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}

export function ProjectMapView({ projects, trailers = [], teams = [], onViewDetails }: ProjectMapViewProps) {
  const [geocodedProjects, setGeocodedProjects] = useState<GeocodedProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function geocodeAll() {
      setLoading(true);
      const results: GeocodedProject[] = [];
      for (const project of projects) {
        if (cancelled) break;
        if (!project.address) continue;
        const coords = await geocodeAddress(project.address);
        if (coords && !cancelled) {
          results.push({ ...project, lat: coords.lat, lng: coords.lng });
          setGeocodedProjects([...results]);
        }
      }
      if (!cancelled) setLoading(false);
    }
    geocodeAll();
    return () => { cancelled = true; };
  }, [projects]);

  const analysis = useMemo(() => analyzeAllProjects(projects), [projects]);

  const getWorkPhaseProgress = (project: Project): number => {
    if (!project.workPhases || project.workPhases.length === 0) return 0;
    const completed = project.workPhases.filter(p => p.completed).length;
    return Math.round((completed / project.workPhases.length) * 100);
  };

  const positions: [number, number][] = geocodedProjects.map(p => [p.lat, p.lng]);

  const getTeamName = (project: Project) => {
    if (!project.constructionTeam) return null;
    const team = teams.find((t: any) => t.id === project.constructionTeam || t.name === project.constructionTeam);
    return team?.name || project.constructionTeam;
  };

  const getTrailerName = (project: Project) => {
    if (!project.assignedTrailer) return null;
    const trailer = trailers.find(t => t.id === project.assignedTrailer || t.name === project.assignedTrailer);
    return trailer?.name || project.assignedTrailer;
  };

  return (
    <div className="space-y-4">
      {/* Control Tower Header */}
      <div className="flex items-center gap-2">
        <Radar className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Control Tower</h2>
        <span className="text-xs text-muted-foreground ml-2">
          {loading ? 'Laddar positioner...' : `${geocodedProjects.length} projekt på kartan`}
        </span>
      </div>

      <div className="flex gap-4">
        {/* Sidebar Control Panel */}
        <div className="w-72 shrink-0 space-y-3">
          <ControlTowerPanel
            projects={projects}
            risks={analysis.risks}
            highRiskCount={analysis.highRiskCount}
            warningCount={analysis.warningCount}
            avgProgress={analysis.avgProgress}
          />
        </div>

        {/* Map */}
        <div className="flex-1 space-y-2">
          <MapLegend />
          <div className="rounded-lg border overflow-hidden shadow-card" style={{ height: '600px' }}>
            <MapContainer
              center={[62.0, 15.0]}
              zoom={5}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {positions.length > 0 && <FitBounds positions={positions} />}

              {/* Activity Heatmap */}
              <ActivityHeatmap geocodedProjects={geocodedProjects} />

              {geocodedProjects.map(project => {
                const progress = getWorkPhaseProgress(project);
                const risk = analyzeProjectRisk(project);
                const teamName = getTeamName(project);
                const trailerName = getTrailerName(project);
                const startWeek = project.bygg_start_vecka || project.constructionStartWeek || '-';
                const estDays = project.ungefärlig_arbetstid_dagar || project.estimatedWorkDays || '-';

                return (
                  <Marker
                    key={project.id}
                    position={[project.lat, project.lng]}
                    icon={createPinIcon(project.status, progress, risk.level)}
                  >
                    <Popup minWidth={290} maxWidth={340}>
                      <div className="p-1 space-y-3">
                        <div>
                          <h3 className="font-semibold text-sm" style={{ color: 'hsl(215, 25%, 15%)' }}>{project.customerName}</h3>
                          <p className="text-xs" style={{ color: 'hsl(215, 13%, 45%)' }}>{project.address}</p>
                        </div>

                        {/* Risk banner */}
                        {risk.level !== 'normal' && (
                          <div
                            className="rounded-md px-2 py-1.5 text-xs font-medium text-white"
                            style={{
                              backgroundColor: risk.level === 'high' ? 'hsl(0, 84%, 60%)' : 'hsl(43, 96%, 46%)',
                            }}
                          >
                            {risk.level === 'high' ? '🔴 Hög risk' : '⚠️ Varning'}
                            {risk.reasons.map((r, i) => (
                              <div key={i} className="text-[10px] font-normal opacity-90 mt-0.5">• {r}</div>
                            ))}
                          </div>
                        )}

                        {/* Status & Progress */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: STATUS_COLORS[project.status], color: 'white' }}
                            >
                              {STATUS_LABELS[project.status]}
                            </span>
                            <span className="text-xs font-medium" style={{ color: 'hsl(215, 13%, 45%)' }}>{progress}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div className="h-2 rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: STATUS_COLORS[project.status] }} />
                          </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-1 text-xs" style={{ color: 'hsl(215, 13%, 45%)' }}>
                          <div className="flex justify-between">
                            <span>Startvecka:</span>
                            <span className="font-medium" style={{ color: 'hsl(215, 25%, 15%)' }}>{startWeek}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Beräknad tid:</span>
                            <span className="font-medium" style={{ color: 'hsl(215, 25%, 15%)' }}>{estDays} dagar</span>
                          </div>
                          {teamName && (
                            <div className="flex justify-between">
                              <span>Team:</span>
                              <span className="font-medium" style={{ color: 'hsl(215, 25%, 15%)' }}>{teamName}</span>
                            </div>
                          )}
                          {trailerName && (
                            <div className="flex justify-between">
                              <span>Ställningsvagn:</span>
                              <span className="font-medium" style={{ color: 'hsl(215, 25%, 15%)' }}>{trailerName}</span>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => onViewDetails(project)}
                          className="w-full text-center text-xs font-medium py-1.5 px-3 rounded-md text-white transition-colors"
                          style={{ backgroundColor: 'hsl(217, 91%, 35%)' }}
                        >
                          Öppna projekt
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
