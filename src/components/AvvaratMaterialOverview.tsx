import { useState, useMemo } from 'react';
import { Project, StorageLocation, PlannedAction } from '@/types/project';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, MapPin, Package, User, AlertTriangle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface AvvaratMaterialOverviewProps {
  projects: Project[];
}

export function AvvaratMaterialOverview({ projects }: AvvaratMaterialOverviewProps) {
  const [locationFilter, setLocationFilter] = useState<StorageLocation | 'all'>('all');
  const [actionFilter, setActionFilter] = useState<PlannedAction | 'all'>('all');
  const [responsiblePersonFilter, setResponsiblePersonFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Get projects with leftover material
  const projectsWithMaterial = useMemo(() => {
    return projects.filter(p => p.avvaratMaterial?.hasLeftoverMaterial);
  }, [projects]);

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projectsWithMaterial.filter(project => {
      const material = project.avvaratMaterial!;
      
      const matchesSearch = 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (material.materialDescription || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesLocation = locationFilter === 'all' || material.storageLocation === locationFilter;
      const matchesAction = actionFilter === 'all' || material.plannedAction === actionFilter;
      const matchesResponsible = responsiblePersonFilter === 'all' || material.responsiblePerson === responsiblePersonFilter;
      
      return matchesSearch && matchesLocation && matchesAction && matchesResponsible;
    });
  }, [projectsWithMaterial, searchTerm, locationFilter, actionFilter, responsiblePersonFilter]);

  // Get unique values for filters
  const storageLocations = useMemo(() => {
    const locations = new Set<StorageLocation>();
    projectsWithMaterial.forEach(p => {
      if (p.avvaratMaterial?.storageLocation) {
        locations.add(p.avvaratMaterial.storageLocation);
      }
    });
    return Array.from(locations);
  }, [projectsWithMaterial]);

  const plannedActions = useMemo(() => {
    const actions = new Set<PlannedAction>();
    projectsWithMaterial.forEach(p => {
      if (p.avvaratMaterial?.plannedAction) {
        actions.add(p.avvaratMaterial.plannedAction);
      }
    });
    return Array.from(actions);
  }, [projectsWithMaterial]);

  const responsiblePersons = useMemo(() => {
    const persons = new Set<string>();
    projectsWithMaterial.forEach(p => {
      if (p.avvaratMaterial?.responsiblePerson) {
        persons.add(p.avvaratMaterial.responsiblePerson);
      }
    });
    return Array.from(persons);
  }, [projectsWithMaterial]);

  const getDaysOld = (dateStr: string) => {
    return differenceInDays(new Date(), new Date(dateStr));
  };

  const getUrgencyBadge = (days: number) => {
    if (days > 30) {
      return <Badge variant="destructive" className="text-xs">Kritisk - {days} dagar</Badge>;
    } else if (days > 20) {
      return <Badge variant="secondary" className="text-xs">Varning - {days} dagar</Badge>;
    }
    return <Badge variant="outline" className="text-xs">{days} dagar</Badge>;
  };

  const getActionBadge = (action: PlannedAction) => {
    const variant = action === 'Kasseras' ? 'destructive' : 
                   action === 'Användas i framtida projekt' ? 'completed' : 'outline';
    return <Badge variant={variant} className="text-xs">{action}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            📋 Översikt Avvarat Material
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Sök</Label>
              <Input
                placeholder="Sök projekt..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Förvaringsplats</Label>
              <Select value={locationFilter} onValueChange={(value) => setLocationFilter(value as StorageLocation | 'all')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla platser</SelectItem>
                  {storageLocations.map(location => (
                    <SelectItem key={location} value={location}>{location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Planerad åtgärd</Label>
              <Select value={actionFilter} onValueChange={(value) => setActionFilter(value as PlannedAction | 'all')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla åtgärder</SelectItem>
                  {plannedActions.map(action => (
                    <SelectItem key={action} value={action}>{action}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Ansvarig person</Label>
              <Select value={responsiblePersonFilter} onValueChange={setResponsiblePersonFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla personer</SelectItem>
                  {responsiblePersons.map(person => (
                    <SelectItem key={person} value={person}>{person}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-foreground">{projectsWithMaterial.length}</div>
              <div className="text-sm text-muted-foreground">Totalt avvarat material</div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-warning">
                {projectsWithMaterial.filter(p => 
                  p.avvaratMaterial?.dateNoted && 
                  getDaysOld(p.avvaratMaterial.dateNoted) > 20
                ).length}
              </div>
              <div className="text-sm text-muted-foreground">Varning (20+ dagar)</div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-destructive">
                {projectsWithMaterial.filter(p => 
                  p.avvaratMaterial?.dateNoted && 
                  getDaysOld(p.avvaratMaterial.dateNoted) > 30
                ).length}
              </div>
              <div className="text-sm text-muted-foreground">Kritisk (30+ dagar)</div>
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum noterat</TableHead>
                  <TableHead>Projekt & Adress</TableHead>
                  <TableHead>Materialtyp</TableHead>
                  <TableHead>Förvaringsplats</TableHead>
                  <TableHead>Ansvarig</TableHead>
                  <TableHead>Planerad åtgärd</TableHead>
                  <TableHead>Kommentar</TableHead>
                  <TableHead>Ålder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map(project => {
                  const material = project.avvaratMaterial!;
                  const daysOld = material.dateNoted ? getDaysOld(material.dateNoted) : 0;
                  
                  return (
                    <TableRow key={project.id}>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                          {material.dateNoted ? 
                            format(new Date(material.dateNoted), 'MMM d, yyyy') : 
                            'N/A'
                          }
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{project.name}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {project.address}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm max-w-xs">
                        <div className="truncate">
                          {material.materialDescription || 'Ej specificerat'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          {material.storageLocation === 'Annat' && material.customStorageLocation ? 
                            material.customStorageLocation : 
                            material.storageLocation || 'N/A'
                          }
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <User className="w-3 h-3 text-muted-foreground" />
                          {material.responsiblePerson || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {material.plannedAction ? getActionBadge(material.plannedAction) : '-'}
                      </TableCell>
                      <TableCell className="text-sm max-w-xs">
                        <div className="truncate">
                          {material.comments || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {material.dateNoted ? getUrgencyBadge(daysOld) : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {filteredProjects.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {projectsWithMaterial.length === 0 ? 
                  'Inga projekt med avvarat material hittades.' :
                  'Inga projekt matchar de nuvarande filtren.'
                }
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}