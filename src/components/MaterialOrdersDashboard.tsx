import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MaterialOrder, Project, MaterialOrderStatus } from '@/types/project';
import { Package, Search, Filter, Copy, Mail, Edit, Calendar, MapPin, User, Calculator } from 'lucide-react';
import { MaterialOrderModal } from './MaterialOrderModal';
import { RoofMaterialCalculator } from './RoofMaterialCalculator';
import { useToast } from '@/hooks/use-toast';

interface MaterialOrdersDashboardProps {
  projects: Project[];
  userRegion?: string; // For filtering projects by region for project managers
  userRole?: 'admin' | 'project_manager' | 'user';
  onUpdateProject: (project: Project) => void;
}

export function MaterialOrdersDashboard({ 
  projects, 
  userRegion, 
  userRole = 'user',
  onUpdateProject 
}: MaterialOrdersDashboardProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<MaterialOrderStatus | 'all'>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');

  // Filter projects based on user role and region
  const filteredProjects = projects.filter(project => {
    // Region filtering for project managers
    if (userRole === 'project_manager' && userRegion && project.region !== userRegion) {
      return false;
    }
    
    // Only show projects with material orders or that need material orders
    return project.materialOrder || 
           project.checklist?.some(item => item.label === 'Materialbeställning' && !item.completed);
  });

  const projectsWithOrders = filteredProjects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
                         (project.materialOrder?.status === statusFilter) ||
                         (statusFilter === 'draft' && !project.materialOrder);
    
    const matchesRegion = regionFilter === 'all' || project.region === regionFilter;
    
    return matchesSearch && matchesStatus && matchesRegion;
  });

  const handleMaterialOrderSave = (project: Project, materialOrder: MaterialOrder) => {
    const updatedProject = {
      ...project,
      materialOrder
    };
    onUpdateProject(updatedProject);
  };

  const copyOrderText = (order: MaterialOrder) => {
    if (order.orderText) {
      navigator.clipboard.writeText(order.orderText);
      toast({
        title: "Beställningstext kopierad",
        description: "Texten har kopierats till urklipp.",
      });
    }
  };

  const openInOutlook = (order: MaterialOrder) => {
    if (order.orderText) {
      const subject = `Materialbeställning - ${order.projectAddress}`;
      const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(order.orderText)}`;
      window.open(mailtoUrl);
    }
  };

  const getStatusBadgeVariant = (status: MaterialOrderStatus) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'ready_to_order': return 'default';
      case 'ordered': return 'outline';
      case 'delivered': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: MaterialOrderStatus) => {
    switch (status) {
      case 'draft': return 'Utkast';
      case 'ready_to_order': return 'Klar för beställning';
      case 'ordered': return 'Beställd';
      case 'delivered': return 'Levererad';
      default: return 'Okänd';
    }
  };

  const ordersByStatus = {
    draft: projectsWithOrders.filter(p => !p.materialOrder || p.materialOrder.status === 'draft').length,
    ready_to_order: projectsWithOrders.filter(p => p.materialOrder?.status === 'ready_to_order').length,
    ordered: projectsWithOrders.filter(p => p.materialOrder?.status === 'ordered').length,
    delivered: projectsWithOrders.filter(p => p.materialOrder?.status === 'delivered').length,
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Materialbeställningar
            {userRole === 'project_manager' && userRegion && (
              <Badge variant="outline" className="ml-2">
                {userRegion}
              </Badge>
            )}
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            Hantera materialbeställningar för alla projekt
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Beställningsöversikt</TabsTrigger>
              <TabsTrigger value="calculator">Automatisk Takberäkning</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-muted-foreground">{ordersByStatus.draft}</div>
                <div className="text-sm text-muted-foreground">Utkast</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{ordersByStatus.ready_to_order}</div>
                <div className="text-sm text-muted-foreground">Klar att beställa</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-warning">{ordersByStatus.ordered}</div>
                <div className="text-sm text-muted-foreground">Beställd</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-success">{ordersByStatus.delivered}</div>
                <div className="text-sm text-muted-foreground">Levererad</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Sök projekt, adress eller kund..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as MaterialOrderStatus | 'all')}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrera status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla status</SelectItem>
                <SelectItem value="draft">Utkast</SelectItem>
                <SelectItem value="ready_to_order">Klar för beställning</SelectItem>
                <SelectItem value="ordered">Beställd</SelectItem>
                <SelectItem value="delivered">Levererad</SelectItem>
              </SelectContent>
            </Select>

            {userRole === 'admin' && (
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrera region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla regioner</SelectItem>
                  <SelectItem value="Stockholm">Stockholm</SelectItem>
                  <SelectItem value="Västra Götaland">Västra Götaland</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Orders Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Projekt</TableHead>
                <TableHead>Adress</TableHead>
                <TableHead>Kund</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Senast uppdaterad</TableHead>
                <TableHead>Åtgärder</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectsWithOrders.map(project => {
                const order = project.materialOrder;
                const hasOrder = !!order;
                
                return (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {project.name}
                        <Badge variant="outline" className="text-xs">
                          {project.region}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        {project.address}
                      </div>
                    </TableCell>
                    <TableCell>{project.customerName || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(order?.status || 'draft')}>
                        {getStatusText(order?.status || 'draft')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {hasOrder ? (
                        <div className="text-sm">
                          {order.items.length} material(s)
                          {order.appliedSalvagedMaterial && order.appliedSalvagedMaterial.length > 0 && (
                            <div className="text-xs text-green-600">
                              + {order.appliedSalvagedMaterial.length} från lager
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Ingen beställning</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {hasOrder ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {new Date(order.updatedAt).toLocaleDateString('sv-SE')}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MaterialOrderModal
                          project={project}
                          allProjects={projects}
                          onSave={(materialOrder) => handleMaterialOrderSave(project, materialOrder)}
                          trigger="custom"
                        >
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </MaterialOrderModal>
                        
                        {hasOrder && order.orderText && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyOrderText(order)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openInOutlook(order)}
                            >
                              <Mail className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {projectsWithOrders.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Inga materialbeställningar hittades med de valda filtren.</p>
            </div>
          )}
            </TabsContent>

            <TabsContent value="calculator" className="space-y-6">
              <RoofMaterialCalculator 
                onAddToOrder={(materials) => {
                  // Show success message and guide user to create order
                  toast({
                    title: "Beräkning klar",
                    description: `${materials.length} materialposter beräknade. Välj ett projekt i översikten för att skapa beställning.`,
                  });
                  console.log('Calculated materials:', materials);
                }}
                onSaveTemplate={(template) => {
                  toast({
                    title: "Mall sparad",
                    description: "Takberäkningsmallen har sparats.",
                  });
                  console.log('Saving roof calculation template:', template);
                }}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}