import { useState, useMemo } from 'react';
import { Project, MaterialType, StorageLocation } from '@/types/project';
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
  const [materialTypeFilter, setMaterialTypeFilter] = useState<MaterialType | 'all'>('all');
  const [locationFilter, setLocationFilter] = useState<StorageLocation | 'all'>('all');
  const [responsiblePersonFilter, setResponsiblePersonFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Get projects with reserved material
  const projectsWithMaterial = useMemo(() => {
    return projects.filter(p => p.avvaratMaterial?.isReserved);
  }, [projects]);

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projectsWithMaterial.filter(project => {
      const material = project.avvaratMaterial!;
      
      const matchesSearch = 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (material.quantity || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesMaterialType = materialTypeFilter === 'all' || material.materialType === materialTypeFilter;
      const matchesLocation = locationFilter === 'all' || material.storageLocation === locationFilter;
      const matchesResponsible = responsiblePersonFilter === 'all' || material.responsiblePerson === responsiblePersonFilter;
      
      return matchesSearch && matchesMaterialType && matchesLocation && matchesResponsible;
    });
  }, [projectsWithMaterial, searchTerm, materialTypeFilter, locationFilter, responsiblePersonFilter]);

  // Get unique values for filters
  const materialTypes = useMemo(() => {
    const types = new Set<MaterialType>();
    projectsWithMaterial.forEach(p => {
      if (p.avvaratMaterial?.materialType) {
        types.add(p.avvaratMaterial.materialType);
      }
    });
    return Array.from(types);
  }, [projectsWithMaterial]);

  const storageLocations = useMemo(() => {
    const locations = new Set<StorageLocation>();
    projectsWithMaterial.forEach(p => {
      if (p.avvaratMaterial?.storageLocation) {
        locations.add(p.avvaratMaterial.storageLocation);
      }
    });
    return Array.from(locations);
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
      return <Badge variant="destructive" className="text-xs">Urgent - {days} days</Badge>;
    } else if (days > 20) {
      return <Badge variant="secondary" className="text-xs">Warning - {days} days</Badge>;
    }
    return <Badge variant="outline" className="text-xs">{days} days</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            📋 Avvarat Material Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Search</Label>
              <Input
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Material Type</Label>
              <Select value={materialTypeFilter} onValueChange={(value) => setMaterialTypeFilter(value as MaterialType | 'all')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {materialTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Storage Location</Label>
              <Select value={locationFilter} onValueChange={(value) => setLocationFilter(value as StorageLocation | 'all')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {storageLocations.map(location => (
                    <SelectItem key={location} value={location}>{location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Responsible Person</Label>
              <Select value={responsiblePersonFilter} onValueChange={setResponsiblePersonFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Persons</SelectItem>
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
              <div className="text-sm text-muted-foreground">Total Reserved Materials</div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {projectsWithMaterial.filter(p => 
                  p.avvaratMaterial?.dateOfReservation && 
                  getDaysOld(p.avvaratMaterial.dateOfReservation) > 20
                ).length}
              </div>
              <div className="text-sm text-muted-foreground">Overdue (20+ days)</div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {projectsWithMaterial.filter(p => 
                  p.avvaratMaterial?.dateOfReservation && 
                  getDaysOld(p.avvaratMaterial.dateOfReservation) > 30
                ).length}
              </div>
              <div className="text-sm text-muted-foreground">Critical (30+ days)</div>
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date Reserved</TableHead>
                  <TableHead>Project & Address</TableHead>
                  <TableHead>Material Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Storage Location</TableHead>
                  <TableHead>Responsible</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead>Age</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map(project => {
                  const material = project.avvaratMaterial!;
                  const daysOld = material.dateOfReservation ? getDaysOld(material.dateOfReservation) : 0;
                  
                  return (
                    <TableRow key={project.id}>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                          {material.dateOfReservation ? 
                            format(new Date(material.dateOfReservation), 'MMM d, yyyy') : 
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
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {material.materialType || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {material.quantity || 'Not specified'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          {material.storageLocation || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <User className="w-3 h-3 text-muted-foreground" />
                          {material.responsiblePerson || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm max-w-xs">
                        <div className="truncate">
                          {material.comments || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {material.dateOfReservation ? getUrgencyBadge(daysOld) : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {filteredProjects.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {projectsWithMaterial.length === 0 ? 
                  'No projects with reserved material found.' :
                  'No projects match the current filters.'
                }
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}