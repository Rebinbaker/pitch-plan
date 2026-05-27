import { useSupabaseStorage } from '@/hooks/useSupabaseStorage';
import { ProjectDashboard } from '@/components/ProjectDashboard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { LogOut } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface ChefWorkspaceProps {
  title: string;
  description: string;
  /** Filtrerar projektlistan till de som är relevanta för rollen. */
  filter?: (project: any) => boolean;
}

export const ChefWorkspace = ({ title, description, filter }: ChefWorkspaceProps) => {
  const { signOut, user } = useAuth();
  const storage = useSupabaseStorage();

  const filtered = filter ? storage.projects.filter(filter) : storage.projects;

  if (storage.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Logga ut
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        <ProjectDashboard
          projects={filtered}
          onUpdateProject={storage.updateProject}
          onDeleteProject={storage.deleteProject}
          onAddProject={() => { /* chef-roller skapar inte projekt */ }}
          trailers={storage.scaffolding}
          teams={storage.teams}
          onUpdateTeam={storage.updateTeam}
          onUpdateTrailer={storage.updateScaffolding}
          onAddNotifications={storage.addNotifications}
          onFileUploaded={storage.uploadFile as any}
          isAdmin={false}
          files={storage.files as any}
        />
      </main>
    </div>
  );
};
