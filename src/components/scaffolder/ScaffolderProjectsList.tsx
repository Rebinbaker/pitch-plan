import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from '@/hooks/use-toast';
import { ProjectCard } from '@/components/ProjectCard';
import type { Project, ProjectStatus } from '@/types/project';
import { ScaffolderProjectModal } from './ScaffolderProjectModal';

const mapRowToProject = (row: any): Project => ({
  id: row.id,
  name: row.name,
  address: row.address || '',
  customerName: row.customer_name || '',
  customerPhone: row.customer_phone || '',
  responsibleSeller: row.responsible_seller || '',
  constructionTeam: row.construction_team || '',
  scaffoldingTeamId: row.scaffolding_team_id || '',
  constructionStartWeek: row.construction_start_week || '',
  rotStatus: (row.rot_status as any) || 'No',
  status: row.status as ProjectStatus,
  notes: row.notes || '',
  assignedTrailer: row.assigned_trailer || '',
  scaffoldingResponsible: row.scaffolding_responsible || '',
  startDate: row.start_date || '',
  deadline: row.deadline || '',
  estimatedWorkDays: row.estimated_work_days || 0,
  actualConstructionStart: row.actual_construction_start || '',
  completionPercentage: row.completion_percentage || 0,
  checklist: row.checklist || [],
  workPhases: row.work_phases || [],
  activityLog: row.activity_log || [],
  region: row.region || 'Stockholm',
  avvaratMaterial: row.avvarat_material || undefined,
  materialOrder: row.material_order || undefined,
  accommodationBooking: row.accommodation_booking || undefined,
});

interface Props {
  /** 'active' = planned/ongoing, 'history' = completed/invoiced/ånger */
  mode: 'active' | 'history';
}

export function ScaffolderProjectsList({ mode }: Props) {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Project | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = async () => {
    if (!user || !organizationId) return;
    setLoading(true);
    try {
      const { data: teams } = await (supabase as any)
        .from('teams')
        .select('id, name, type, members')
        .eq('organization_id', organizationId)
        .eq('type', 'Ställningsmontör');

      const myTeams = (teams || []).filter((t: any) => {
        const members = Array.isArray(t.members) ? t.members : [];
        return members.some((m: any) => m?.user_id === user.id);
      });

      if (myTeams.length === 0) {
        setProjects([]);
        return;
      }

      const teamIds = myTeams.map((t: any) => t.id);
      let query = supabase
        .from('projects' as any)
        .select('*')
        .eq('organization_id', organizationId)
        .in('scaffolding_team_id', teamIds);

      if (mode === 'active') {
        query = query.in('status', ['planned', 'ongoing']);
      } else {
        query = query.in('status', ['completed', 'invoiced', 'ånger']);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setProjects((data || []).map(mapRowToProject));
    } catch (e: any) {
      toast({ title: 'Kunde inte ladda projekt', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user, organizationId, mode]);

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          {mode === 'active'
            ? 'Inga aktiva ställningsprojekt tilldelade dig.'
            : 'Inga avslutade projekt.'}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map(p => (
          <ProjectCard
            key={p.id}
            project={p}
            isAdmin={false}
            onViewDetails={(proj) => { setSelected(proj); setModalOpen(true); }}
          />
        ))}
      </div>
      <ScaffolderProjectModal
        project={selected}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onChanged={load}
      />
    </>
  );
}
