import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Project, ProjectStatus, getAccommodationCheckOutDate } from '@/types/project';
import { ScaffoldingTrailer } from '@/types/scaffolding';
import { batchGeocodeAddresses } from '@/utils/geocoding';
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

  const getFallbackCoordinates = (project: Project): { lat: number; lng: number } => {
    const regionCenters: Record<string, [number, number]> = {
      Stockholm: [59.3293, 18.0686],
      'Västra Götaland': [57.7089, 11.9746],
      Skåne: [55.9903, 13.5958],
      Östergötland: [58.4108, 15.6214],
      Halland: [56.6745, 12.8578],
    };

    // Approximate centers by Swedish postal-code prefix (first 2 digits).
    // Used when geocoding fails so pins land in the correct region.
    const postalPrefixCenters: Record<string, [number, number]> = {
      '10': [59.3293, 18.0686], '11': [59.3293, 18.0686], '12': [59.3293, 18.0686],
      '13': [59.3293, 18.0686], '14': [59.2, 17.8], '15': [59.16, 17.63],
      '16': [59.3793, 17.9], '17': [59.36, 18.0], '18': [59.4, 18.1],
      '19': [59.6, 17.8],
      '20': [55.6050, 13.0038], '21': [55.6050, 13.0038], '22': [55.7047, 13.1910],
      '23': [55.4297, 13.8204], '24': [55.7050, 13.1910], '25': [56.0465, 12.6945],
      '26': [56.0465, 12.6945], '27': [55.45, 14.15], '28': [56.16, 14.05],
      '29': [56.03, 14.74],
      '30': [56.6745, 12.8578], '31': [56.8, 12.9], '32': [57.1, 13.55],
      '33': [57.18, 14.04], '34': [56.88, 14.81], '35': [56.88, 14.81],
      '36': [56.66, 15.6], '37': [56.16, 15.59], '38': [56.74, 16.36],
      '39': [56.66, 16.36],
      '40': [57.7089, 11.9746], '41': [57.7089, 11.9746], '42': [57.65, 11.93],
      '43': [57.65, 12.0], '44': [57.78, 12.27], '45': [58.35, 11.92],
      '46': [58.35, 12.32], '47': [58.0, 11.6], '48': [57.75, 12.39],
      '49': [58.28, 12.89],
      '50': [57.78, 12.94], '51': [57.72, 12.94], '52': [57.78, 13.41],
      '53': [58.38, 13.85], '54': [58.39, 13.85], '55': [57.78, 14.16],
      '56': [57.55, 14.5], '57': [57.66, 14.69], '58': [58.4108, 15.6214],
      '59': [58.4871, 15.5], '60': [58.59, 16.18], '61': [58.75, 17.0],
      '62': [57.63, 18.29], '63': [59.37, 16.5], '64': [59.04, 16.21],
      '65': [59.38, 13.5], '66': [59.04, 12.7], '67': [59.66, 12.59],
      '68': [60.13, 13.71], '69': [59.51, 14.53],
      '70': [59.27, 15.21], '71': [59.51, 15.0], '72': [59.61, 16.55],
      '73': [59.84, 16.55], '74': [59.85, 17.64], '75': [59.8586, 17.6389],
      '76': [59.75, 18.7], '77': [60.15, 15.18], '78': [60.48, 15.42],
      '79': [60.61, 15.63], '80': [60.6749, 17.1413], '81': [60.74, 16.78],
      '82': [61.3, 17.06], '83': [63.18, 14.64], '84': [62.3908, 17.3069],
      '85': [62.3908, 17.3069], '86': [62.63, 17.94], '87': [62.94, 17.78],
      '88': [63.3, 18.7], '89': [63.83, 20.26], '90': [63.8258, 20.2630],
      '91': [63.99, 19.49], '92': [64.75, 20.95], '93': [65.32, 21.48],
      '94': [65.5848, 22.1547], '95': [65.5848, 22.1547], '96': [67.1186, 20.6597],
      '97': [65.5848, 22.1547], '98': [67.85, 20.22],
    };

    const swedenDefaultCenter: [number, number] = [62.0, 15.0];

    // Try postal-code prefix first (most accurate when geocoding fails).
    const postalMatch = project.address?.match(/\b(\d{3})\s?\d{2}\b/);
    const postalCenter = postalMatch ? postalPrefixCenters[postalMatch[1].slice(0, 2)] : undefined;

    const center =
      postalCenter ??
      (project.region ? regionCenters[project.region] ?? swedenDefaultCenter : swedenDefaultCenter);

    const hash = project.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const latOffset = ((hash % 21) - 10) * 0.01;
    const lngOffset = ((((hash / 21) | 0) % 21) - 10) * 0.01;

    return {
      lat: center[0] + latOffset,
      lng: center[1] + lngOffset,
    };
  };

  useEffect(() => {
    let cancelled = false;

    async function geocodeAll() {
      setLoading(true);
      try {
        const addressableProjects = projects.filter(project => Boolean(project.address?.trim()));

        const geocodedMap = addressableProjects.length > 0
          ? await batchGeocodeAddresses(
              addressableProjects.map(project => ({
                id: project.id,
                address: project.address,
              }))
            )
          : new Map<string, { lat: number; lng: number }>();

        if (cancelled) return;

        const positionedProjects = projects.map(project => {
          const geocodedCoords = geocodedMap.get(project.id);
          const coords = geocodedCoords ?? getFallbackCoordinates(project);

          return { ...project, lat: coords.lat, lng: coords.lng };
        });

        // Jitter projects that share identical coordinates so every pin
        // stays visible on the map (no marker ever hides under another).
        const coordCounts = new Map<string, number>();
        const dedupedProjects = positionedProjects.map(project => {
          const key = `${project.lat.toFixed(5)},${project.lng.toFixed(5)}`;
          const index = coordCounts.get(key) ?? 0;
          coordCounts.set(key, index + 1);

          if (index === 0) return project;

          // Spiral offset (~25–60 m per step) around the original point.
          const angle = (index * 137.508) * (Math.PI / 180);
          const radius = 0.0004 * Math.ceil(index / 6);
          return {
            ...project,
            lat: project.lat + Math.cos(angle) * radius,
            lng: project.lng + Math.sin(angle) * radius,
          };
        });

        setGeocodedProjects(dedupedProjects);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    geocodeAll();
    return () => {
      cancelled = true;
    };
  }, [projects]);

  const analysis = useMemo(() => analyzeAllProjects(projects), [projects]);

  const getWorkPhaseProgress = (project: Project): number => {
    const checklist = project.checklist || [];
    const workPhases = project.workPhases || [];

    const checklistDone = checklist
      .filter(i => i.completed)
      .reduce((s, i) => s + (i.weight || 0), 0);
    const phasesDone = workPhases
      .filter(p => p.completed)
      .reduce((s, p) => s + (p.weight || 0), 0);

    const checklistTotal = checklist.reduce((s, i) => s + (i.weight || 0), 0);
    const phasesTotal = workPhases.reduce((s, p) => s + (p.weight || 0), 0);
    const total = checklistTotal + phasesTotal;

    if (total <= 0) {
      // Fallback: pure work-phase count if no weights configured
      if (workPhases.length === 0) return project.completionPercentage || 0;
      const completed = workPhases.filter(p => p.completed).length;
      return Math.round((completed / workPhases.length) * 100);
    }

    const done = checklistDone + phasesDone;
    return done === total ? 100 : Math.round((done / total) * 100);
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
            delayedCount={analysis.delayedCount}
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

                        {/* Risk/Delay banner */}
                        {risk.level !== 'normal' && (
                          <div
                            className="rounded-md px-2 py-1.5 text-xs font-medium text-white"
                            style={{
                              backgroundColor: risk.level === 'delayed' ? 'hsl(0, 84%, 50%)' : risk.level === 'high' ? 'hsl(0, 84%, 60%)' : 'hsl(43, 96%, 46%)',
                            }}
                          >
                            {risk.level === 'delayed' ? `🔴 Försenad — ${risk.daysDelayed} dag${risk.daysDelayed !== 1 ? 'ar' : ''}` : risk.level === 'high' ? '🔴 Hög risk' : '⚠️ Riskzon'}
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
                          {project.status === 'ongoing' && (
                            <div className="flex justify-between">
                              <span>Kvar:</span>
                              <span className="font-medium" style={{ color: risk.level === 'delayed' ? 'hsl(0, 84%, 50%)' : 'hsl(215, 25%, 15%)' }}>
                                {risk.remainingDays === 0 ? 'Klar' : `${risk.remainingDays.toString().replace('.', ',')} dag${risk.remainingDays !== 1 ? 'ar' : ''} kvar`}
                              </span>
                            </div>
                          )}
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
                          {project.accommodationBooking && (() => {
                            const checkOut = getAccommodationCheckOutDate(project.accommodationBooking);
                            const msPerDay = 1000 * 60 * 60 * 24;
                            const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
                            const daysLeft = Math.ceil((startOfDay(checkOut).getTime() - startOfDay(new Date()).getTime()) / msPerDay);
                            const color =
                              daysLeft < 0
                                ? 'hsl(0, 84%, 50%)'
                                : daysLeft <= 1
                                ? 'hsl(0, 84%, 50%)'
                                : daysLeft <= 3
                                ? 'hsl(43, 96%, 46%)'
                                : 'hsl(215, 25%, 15%)';
                            const label =
                              daysLeft < 0
                                ? `${Math.abs(daysLeft)} dag${Math.abs(daysLeft) !== 1 ? 'ar' : ''} sedan utcheckning`
                                : daysLeft === 0
                                ? 'Checkar ut idag'
                                : `${daysLeft} dag${daysLeft !== 1 ? 'ar' : ''} kvar till utcheckning`;
                            return (
                              <div className="flex justify-between">
                                <span>Boende:</span>
                                <span className="font-medium text-right" style={{ color }}>
                                  {project.accommodationBooking.name}
                                  <span className="block text-[10px] opacity-90">{label}</span>
                                </span>
                              </div>
                            );
                          })()}
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
