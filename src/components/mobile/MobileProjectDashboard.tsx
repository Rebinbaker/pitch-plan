import { useState } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Project, ProjectStatus } from '@/types/project';
import { MobileAddProjectModal } from './MobileAddProjectModal';
import { MobileProjectCard } from './MobileProjectCard';

interface MobileProjectDashboardProps {
  projects: Project[];
  onUpdateProject: (project: Project) => void;
  onAddProject: (project: Project) => void;
  trailers?: any[];
  teams?: any[];
  files?: { id: string; name: string; type: string; url: string; projectId: string; uploadedAt: string }[];
}

export function MobileProjectDashboard({ 
  projects, 
  onUpdateProject, 
  onAddProject,
  trailers = [],
  teams = [],
  files = []
}: MobileProjectDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.address?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeProjects = filteredProjects.filter(p => p.status === 'ongoing').length;
  const totalProjects = filteredProjects.length;

  return (
    <div className="min-h-screen bg-transparent p-4 space-y-4">
      {/* Mobile Header - Static, not sticky */}
      <div className="flex items-center justify-between py-3 mb-4">
        <div>
          <h1 className="text-xl font-bold">Projekt</h1>
          <p className="text-sm text-muted-foreground">
            {activeProjects} pågående • {totalProjects} totalt
          </p>
        </div>
        <Button 
          onClick={() => setIsAddModalOpen(true)}
          size="sm"
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-1" />
          Nytt
        </Button>
      </div>

      {/* Quick Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Sök projekt, kund eller adress..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 pr-12"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="absolute right-1 top-1 h-8 w-8 p-0"
        >
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Filters (Collapsible) */}
      {showFilters && (
        <Card className="p-3">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ProjectStatus | 'all')}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla projekt</SelectItem>
                  <SelectItem value="planned">Planerade</SelectItem>
                  <SelectItem value="ongoing">Pågående</SelectItem>
                  <SelectItem value="completed">Avslutade</SelectItem>
                  <SelectItem value="invoiced">Fakturerade</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{activeProjects}</div>
            <div className="text-xs text-muted-foreground">Pågående</div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {filteredProjects.filter(p => p.status === 'planned').length}
            </div>
            <div className="text-xs text-muted-foreground">Planerade</div>
          </div>
        </Card>
      </div>

      {/* Project List */}
      <div className="space-y-3">
        {filteredProjects.length === 0 ? (
          <Card className="p-6 text-center">
            <div className="text-muted-foreground">
              {searchTerm ? 'Inga projekt matchar din sökning' : 'Inga projekt än'}
            </div>
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              variant="outline" 
              className="mt-3"
            >
              <Plus className="h-4 w-4 mr-1" />
              Lägg till första projektet
            </Button>
          </Card>
        ) : (
          filteredProjects.map((project) => (
            <MobileProjectCard
              key={project.id}
              project={project}
              onUpdate={onUpdateProject}
              trailers={trailers}
              teams={teams}
              files={files}
            />
          ))
        )}
      </div>

      {/* Add Project Modal */}
      <MobileAddProjectModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddProject={(project) => {
          onAddProject(project);
          setIsAddModalOpen(false);
        }}
        teams={teams}
      />
    </div>
  );
}