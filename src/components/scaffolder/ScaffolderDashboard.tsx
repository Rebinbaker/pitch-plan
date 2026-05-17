import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, LayoutGrid, Map as MapIcon, Hammer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from '@/hooks/use-toast';
import type { Project, ProjectStatus } from '@/types/project';
import { ScaffolderProjectCard } from './ScaffolderProjectCard';
import { ScaffolderProjectModal } from './ScaffolderProjectModal';
import { ScaffolderMapView } from './ScaffolderMapView';

const mapRow = (row: any): Project => ({
  id: row.id, name: row.name, address: row.address || '',
  customerName: row.customer_name || '', customerPhone: row.customer_phone || '',
  responsibleSeller: row.responsible_seller || '', constructionTeam: row.construction_team || '',
  scaffoldingTeamId: row.scaffolding_team_id || '',
  constructionStartWeek: row.construction_start_week || '',
  rotStatus: (row.rot_status as any) || 'No', status: row.status as ProjectStatus,
  notes: row.notes || '', assignedTrailer: row.assigned_trailer || '',
  scaffoldingResponsible: row.scaffolding_responsible || '',
  startDate: row.start_date || '', deadline: row.deadline || '',
  estimatedWorkDays: row.estimated_work_days || 0,
  actualConstructionStart: row.actual_construction_start || '',
  completionPercentage: row.completion_percentage || 0,
  checklist: row.checklist || [], workPhases: row.work_phases || [],
  activityLog: row.activity_log || [], region: row.region || 'Stockholm',
  avvaratMaterial: row.avvarat_material || undefined,
  materialOrder: row.material_order || undefined,
  accommodationBooking: row.accommodation_booking || undefined,
});

type Filter = 'all' | 'planned' | 'ongoing' | 'completed';

export function ScaffolderDashboard({ mode = 'active' }: { mode?: 'active' | 'history' }) {
  const { user } = useAuth();
  const { organizationId, loading: orgLoading } = useOrganization();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [viewMode, setViewModeState] = useState<'list' | 'map'>(() => (localStorage.getItem('scaffolder-view-mode') as 'list' | 'map') || 'list');
  const setViewMode = (m: 'list' | 'map') => { localStorage.setItem('scaffolder-view-mode', m); setViewModeState(m); };
  const [selected, setSelected] = useState<Project | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = async () => {
    if (!user || !organizationId) { setProjects([]); setLoading(false); return; }
    setLoading(true);
    try {
      let q = supabase.from('projects' as any).select('*').eq('organization_id', organizationId);
      q = mode === 'active' ? q.in('status', ['planned', 'ongoing']) : q.in('status', ['completed', 'invoiced', 'ånger']);
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw error;
      setProjects((data || []).map(mapRow));
    } catch (e: any) {
      toast({ title: 'Kunde inte ladda projekt', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  useEffect(() => { if (!orgLoading) load(); /* eslint-disable-next-line */ }, [user, organizationId, orgLoading, mode]);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (filter !== 'all' && p.status !== filter) return false;
      if (search) {
        const s = search.toLowerCase();
        return p.name.toLowerCase().includes(s) || p.address.toLowerCase().includes(s) || p.customerName.toLowerCase().includes(s);
      }
      return true;
    });
  }, [projects, filter, search]);

  const kpis = useMemo(() => ({
    total: projects.length,
    planned: projects.filter((p) => p.status === 'planned').length,
    ongoing: projects.filter((p) => p.status === 'ongoing').length,
    completed: projects.filter((p) => p.status === 'completed').length,
  }), [projects]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Hammer className="w-6 h-6 text-primary" />Ställningsprojekt</h1>
          <p className="text-sm text-muted-foreground">Hantera mätning, material, transport och bemanning</p>
        </div>
        <div className="flex gap-2">
          <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('list')}>
            <LayoutGrid className="w-4 h-4 mr-1" />Lista
          </Button>
          <Button variant={viewMode === 'map' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('map')}>
            <MapIcon className="w-4 h-4 mr-1" />Karta
          </Button>
        </div>
      </div>

      {/* Sök + filter */}
      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Sök projekt, adress eller kund…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {(['all', 'planned', 'ongoing', 'completed'] as const).map((f) => (
            <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)}>
              {f === 'all' ? 'Alla' : f === 'planned' ? 'Planerade' : f === 'ongoing' ? 'Pågående' : 'Klara'}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Totalt" value={kpis.total} />
        <KpiCard label="Planerade" value={kpis.planned} color="text-blue-600" />
        <KpiCard label="Pågående" value={kpis.ongoing} color="text-orange-600" />
        <KpiCard label="Klara" value={kpis.completed} color="text-emerald-600" />
      </div>

      {/* Innehåll */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Inga projekt matchar.</CardContent></Card>
      ) : viewMode === 'map' ? (
        <ScaffolderMapView projects={filtered} onOpen={(p) => { setSelected(p); setModalOpen(true); }} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ScaffolderProjectCard key={p.id} project={p} onOpen={(pr) => { setSelected(pr); setModalOpen(true); }} />
          ))}
        </div>
      )}

      <ScaffolderProjectModal
        project={selected} open={modalOpen}
        onClose={() => setModalOpen(false)} onChanged={load}
      />
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`text-2xl font-bold ${color || 'text-foreground'}`}>{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
