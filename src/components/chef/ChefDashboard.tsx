import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ProjectDashboard } from '@/components/ProjectDashboard';
import { useAuth } from '@/hooks/useAuth';
import { useSupabaseStorage } from '@/hooks/useSupabaseStorage';
import { Project } from '@/types/project';
import { RoleScope } from '@/hooks/useUserRole';

interface ChefDashboardProps {
  scope: RoleScope;
  title: string;
  subtitle: string;
}

/**
 * Reuses the exact same ProjectDashboard / ProjectCard / ProjectDetailModal
 * that Oliver/Admin sees, but filters the project list to only the projects
 * relevant for this chef role. All edits write to the same `projects` row,
 * so Oliver's view updates live via realtime.
 */
export function ChefDashboard({ scope, title, subtitle }: ChefDashboardProps) {
  const { signOut, user } = useAuth();
  const {
    projects,
    scaffolding,
    teams,
    files,
    loading,
    updateProject,
    updateScaffolding,
    updateTeam,
    addNotifications,
    uploadFile,
  } = useSupabaseStorage();

  const filteredProjects = useMemo<Project[]>(() => {
    if (scope === 'all') return projects;

    return projects.filter((p) => {
      // Only show active-ish projects (skip invoiced/cancelled)
      if (p.status === 'invoiced') return false;

      const checklist = Array.isArray((p as any).checklist) ? (p as any).checklist : [];
      const checklistText = checklist
        .map((c: any) => (c?.title || c?.name || c?.text || '').toString().toLowerCase())
        .join(' ');

      if (scope === 'scaffolding') {
        const hasTeam = !!(p as any).scaffolding_team_id || !!(p as any).scaffoldingTeamId;
        const hasStatus =
          !!(p as any).scaffolding_status &&
          Object.keys((p as any).scaffolding_status || {}).length > 0;
        const inChecklist =
          checklistText.includes('ställning') || checklistText.includes('stallning');
        const hasTrailer = !!(p as any).assignedTrailer;
        return hasTeam || hasStatus || inChecklist || hasTrailer;
      }

      if (scope === 'container') {
        const hasStatus =
          !!(p as any).container_status &&
          Object.keys((p as any).container_status || {}).length > 0;
        const inChecklist = checklistText.includes('container');
        return hasStatus || inChecklist;
      }

      if (scope === 'construction') {
        // Material/teknik berör alla aktiva projekt
        return p.status === 'planned' || p.status === 'ongoing' || p.status === 'completed';
      }

      return true;
    });
  }, [projects, scope]);

  const handleNoop = () => {
    // Chefs cannot create new projects from their scoped view
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Laddar data...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-subtle relative">
        <div
          className="fixed inset-0 bg-contain bg-center bg-no-repeat opacity-50 z-0"
          style={{
            backgroundImage: 'url(/lovable-uploads/7bf989f5-6fb0-4457-86aa-977ae4c5ff5b.png)',
            backgroundAttachment: 'fixed',
            backgroundSize: '100%',
          }}
        />
        <div className="relative z-10 container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <img
                src="/lovable-uploads/c09b6995-d03a-4e86-b925-942212af5d38.png"
                alt="Lokala Hantverkarna"
                className="h-16 w-auto"
              />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{title}</h1>
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{title}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logga ut</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <ProjectDashboard
            projects={filteredProjects}
            onUpdateProject={updateProject}
            onAddProject={handleNoop}
            trailers={scaffolding}
            teams={teams}
            onUpdateTeam={updateTeam}
            onUpdateTrailer={updateScaffolding}
            onAddNotifications={addNotifications}
            onFileUploaded={uploadFile}
            isAdmin={false}
            files={files}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}
