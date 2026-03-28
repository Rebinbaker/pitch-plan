import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Project, ProjectStatus } from '@/types/project';
import { ScaffoldingTrailer } from '@/types/scaffolding';
import { geocodeAddress } from '@/utils/geocoding';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, ExternalLink, Filter } from 'lucide-react';

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

function createPinIcon(status: ProjectStatus, progress: number): L.DivIcon {
  const color = STATUS_COLORS[status] || STATUS_COLORS.planned;
  const circumference = 2 * Math.PI * 14;
  const offset = circumference - (progress / 100) * circumference;

  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="position:relative;width:40px;height:48px;display:flex;align-items:flex-start;justify-content:center;">
        <svg width="40" height="48" viewBox="0 0 40 48">
          <path d="M20 46 C20 46, 38 28, 38 18 C38 8.06 29.94 0 20 0 C10.06 0 2 8.06 2 18 C2 28 20 46 20 46Z" fill="${color}" stroke="white" stroke-width="2"/>
          <circle cx="20" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="3"/>
          <circle cx="20" cy="18" r="14" fill="none" stroke="white" stroke-width="3"
            stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
            stroke-linecap="round" transform="rotate(-90 20 18)"/>
          <text x="20" y="22" text-anchor="middle" fill="white" font-size="10" font-weight="bold">${progress}%</text>
        </svg>
      </div>
    `,
    iconSize: [40, 48],
    iconAnchor: [20, 48],
    popupAnchor: [0, -48],
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

export function ProjectMapView({ projects, trailers = [], teams = [], onViewDetails }: ProjectMapViewProps) {
  const [geocodedProjects, setGeocodedProjects] = useState<GeocodedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');

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

  const filteredProjects = useMemo(() => {
    if (statusFilter === 'all') return geocodedProjects;
    return geocodedProjects.filter(p => p.status === statusFilter);
  }, [geocodedProjects, statusFilter]);

  const getWorkPhaseProgress = (project: Project): number => {
    if (!project.workPhases || project.workPhases.length === 0) return 0;
    const completed = project.workPhases.filter(p => p.completed).length;
    return Math.round((completed / project.workPhases.length) * 100);
  };

  const positions: [number, number][] = filteredProjects.map(p => [p.lat, p.lng]);

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
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ProjectStatus | 'all')}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrera status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla projekt</SelectItem>
            <SelectItem value="planned">Planerade</SelectItem>
            <SelectItem value="ongoing">Pågående</SelectItem>
            <SelectItem value="completed">Slutförda</SelectItem>
            <SelectItem value="invoiced">Fakturerade</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 text-sm text-muted-foreground ml-auto">
          <MapPin className="h-4 w-4" />
          {loading ? 'Laddar positioner...' : `${filteredProjects.length} projekt på kartan`}
        </div>
      </div>

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
          {filteredProjects.map(project => {
            const progress = getWorkPhaseProgress(project);
            const teamName = getTeamName(project);
            const trailerName = getTrailerName(project);

            return (
              <Marker
                key={project.id}
                position={[project.lat, project.lng]}
                icon={createPinIcon(project.status, progress)}
              >
                <Popup minWidth={280} maxWidth={320}>
                  <div className="p-1 space-y-3">
                    <div>
                      <h3 className="font-semibold text-sm" style={{ color: 'hsl(215, 25%, 15%)' }}>{project.customerName}</h3>
                      <p className="text-xs" style={{ color: 'hsl(215, 13%, 45%)' }}>{project.address}</p>
                    </div>
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
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="h-2 rounded-full" style={{ width: `${progress}%`, backgroundColor: STATUS_COLORS[project.status] }} />
                      </div>
                    </div>
                    <div className="space-y-1 text-xs" style={{ color: 'hsl(215, 13%, 45%)' }}>
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
                      className="w-full text-center text-xs font-medium py-1.5 px-3 rounded-md text-white"
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
  );
}
