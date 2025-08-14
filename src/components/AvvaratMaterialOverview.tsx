import { useState, useMemo } from 'react';
import { Project, StorageLocation, PlannedAction, MaterialItem } from '@/types/project';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, MapPin, Package, User, AlertTriangle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { LinkopingInventoryOverview } from '@/components/LinkopingInventoryOverview';

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
        (material.materials || []).some(m => 
          (m.materialType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (m.customMaterialType || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
      
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
    switch (action) {
      case 'Allokeras till nästa bygge':
        return <Badge variant="secondary" className="bg-success/20 text-success border-success/30 text-xs">Allokerat</Badge>;
      case 'Körs till Linköpingsparken':
        return <Badge variant="secondary" className="bg-info text-white border-info text-xs font-bold">📍 Linköpingsparken</Badge>;
      case 'Transporteras till ställningspark':
        return <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 text-xs">Ställningspark</Badge>;
      case 'Returneras till leverantör':
        return <Badge variant="secondary" className="bg-accent/20 text-accent-foreground border-accent/30 text-xs">Returner</Badge>;
      case 'Kasseras':
        return <Badge variant="destructive" className="text-xs">Kasseras</Badge>;
      case 'Annat':
        return <Badge variant="outline" className="text-xs">Annat</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{action}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Linköping Inventory Section */}
      <LinkopingInventoryOverview projects={projects} />
      
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
                   <TableHead>Allokerat till</TableHead>
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
                        <div className="space-y-1">
                          {(material.materials || []).map((materialItem, index) => (
                            <div key={index} className="text-xs">
                              {materialItem.materialType === 'Annat' && materialItem.customMaterialType 
                                ? materialItem.customMaterialType 
                                : materialItem.materialType}
                              {materialItem.squareMeters && ` (${materialItem.squareMeters} m²)`}
                            </div>
                          ))}
                          {(!material.materials || material.materials.length === 0) && (
                            <span className="text-muted-foreground">Ej specificerat</span>
                          )}
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
                       <TableCell>
                         {material.allocatedToProjectName ? (
                           <div className="flex flex-col gap-1">
                             <span className="text-sm font-medium">{material.allocatedToProjectName}</span>
                             <Badge variant="secondary" className="bg-success/20 text-success border-success/30 text-xs w-fit">
                               Allokerat
                             </Badge>
                           </div>
                         ) : (
                           <span className="text-sm text-muted-foreground">-</span>
                         )}
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