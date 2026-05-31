import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Project, MaterialOrderStatus, getMaterialUnit } from '@/types/project';
import { History, Search, Calendar, MapPin, Package, Copy, Mail, FileText, User, ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { useRegions } from '@/hooks/useRegions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface OrderHistoryViewProps {
  projects: Project[];
}

export function OrderHistoryView({ projects }: OrderHistoryViewProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<MaterialOrderStatus | 'all'>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const { regions } = useRegions();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (projectId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  // Filter to only show projects with completed orders
  const projectsWithOrders = projects.filter(project => {
    if (!project.materialOrder) return false;
    
    const status = project.materialOrder.status;
    const hasRelevantStatus = status === 'ordered' || status === 'delivered';
    
    if (!hasRelevantStatus) return false;

    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || project.materialOrder.status === statusFilter;
    const matchesRegion = regionFilter === 'all' || project.region === regionFilter;
    
    return matchesSearch && matchesStatus && matchesRegion;
  });

  // Sort by order date (most recent first)
  const sortedOrders = [...projectsWithOrders].sort((a, b) => {
    const dateA = new Date(a.materialOrder?.createdAt || 0).getTime();
    const dateB = new Date(b.materialOrder?.createdAt || 0).getTime();
    return dateB - dateA;
  });

  const getStatusBadgeVariant = (status: MaterialOrderStatus) => {
    switch (status) {
      case 'ordered': return 'default';
      case 'delivered': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: MaterialOrderStatus) => {
    switch (status) {
      case 'ordered': return 'Beställt';
      case 'delivered': return 'På plats';
      default: return 'Okänd';
    }
  };

  const copyOrderText = (orderText: string) => {
    navigator.clipboard.writeText(orderText);
    toast({
      title: "Beställningstext kopierad",
      description: "Texten har kopierats till urklipp.",
    });
  };

  const openInOutlook = (orderText: string, projectAddress: string) => {
    const subject = `Materialbeställning - ${projectAddress}`;
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(orderText)}`;
    window.open(mailtoUrl, '_blank');
  };

  const statistics = {
    totalOrders: sortedOrders.length,
    ordered: sortedOrders.filter(p => p.materialOrder?.status === 'ordered').length,
    delivered: sortedOrders.filter(p => p.materialOrder?.status === 'delivered').length,
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Beställningshistorik
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            Alla beställningar som gjorts för projekt i organisationen
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{statistics.totalOrders}</div>
                <div className="text-sm text-muted-foreground">Totalt beställningar</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-warning">{statistics.ordered}</div>
                <div className="text-sm text-muted-foreground">Beställda</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-success">{statistics.delivered}</div>
                <div className="text-sm text-muted-foreground">Levererade</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
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
              <SelectTrigger className="w-48 bg-background z-50">
                <SelectValue placeholder="Filtrera status" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">Alla status</SelectItem>
                <SelectItem value="ordered">Beställt</SelectItem>
                <SelectItem value="delivered">På plats</SelectItem>
              </SelectContent>
            </Select>

            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-48 bg-background z-50">
                <SelectValue placeholder="Filtrera region" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">Alla regioner</SelectItem>
                {regions.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Orders Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projekt</TableHead>
                  <TableHead>Adress</TableHead>
                  <TableHead>Kund</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Beställningsdatum</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Åtgärder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedOrders.map(project => {
                  const order = project.materialOrder!;
                  const isExpanded = expandedRows.has(project.id);
                  
                  return (
                    <>
                      <TableRow key={project.id} className="cursor-pointer hover:bg-muted/50" onClick={() => toggleRow(project.id)}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            {project.name}
                            <Badge variant="outline" className="text-xs">
                              {project.region}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                            {project.address || '-'}
                          </div>
                        </TableCell>
                        <TableCell>{project.customerName || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(order.status)}>
                            {getStatusText(order.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            {new Date(order.createdAt).toLocaleDateString('sv-SE')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{order.items.length} material(s)</div>
                            {order.appliedSalvagedMaterial && order.appliedSalvagedMaterial.length > 0 && (
                              <div className="text-xs text-green-600">
                                + {order.appliedSalvagedMaterial.length} från lager
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            {order.orderText && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyOrderText(order.orderText!)}
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                                
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openInOutlook(order.orderText!, project.address || project.name)}
                                >
                                  <Mail className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {isExpanded && (
                        <TableRow key={`${project.id}-expanded`}>
                          <TableCell colSpan={7} className="bg-muted/30 p-6">
                            <div className="space-y-6">
                              {/* Order Info */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <div className="text-sm font-medium text-muted-foreground mb-1">Beställd av</div>
                                  <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-medium">{order.createdByName || 'Okänd'}</span>
                                  </div>
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-muted-foreground mb-1">Beställningsdatum</div>
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    <span>{new Date(order.createdAt).toLocaleDateString('sv-SE')} {new Date(order.createdAt).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Ordered Materials */}
                              <div>
                                <h4 className="text-sm font-semibold mb-3">Beställda material</h4>
                                <div className="border rounded-lg overflow-hidden">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Material</TableHead>
                                        <TableHead>Antal</TableHead>
                                        <TableHead>Enhet</TableHead>
                                        <TableHead>Färg</TableHead>
                                        <TableHead>Anteckningar</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {order.items.map((item, idx) => (
                                        <TableRow key={item.id || idx}>
                                          <TableCell className="font-medium">
                                            {item.customMaterialType || item.materialType}
                                          </TableCell>
                                          <TableCell>{item.quantity}</TableCell>
                                          <TableCell>{item.unit || (typeof item.materialType === 'string' && ['Takpannor', 'Papp', 'Täckbräda', 'Vindskiva', 'Puts', 'Masonit'].includes(item.materialType) ? getMaterialUnit(item.materialType as any) : 'st')}</TableCell>
                                          <TableCell>
                                            {item.color ? (
                                              <Badge variant="outline">{item.color}</Badge>
                                            ) : (
                                              '-'
                                            )}
                                          </TableCell>
                                          <TableCell className="text-sm text-muted-foreground">
                                            {item.notes || '-'}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>

                              {/* Salvaged Materials from Storage */}
                              {order.appliedSalvagedMaterial && order.appliedSalvagedMaterial.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold mb-3 text-green-700">Material från lager (avvarat)</h4>
                                  <div className="border rounded-lg overflow-hidden border-green-200">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Material</TableHead>
                                          <TableHead>Antal</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {order.appliedSalvagedMaterial.map((item, idx) => (
                                          <TableRow key={idx}>
                                            <TableCell className="font-medium">{item.materialType}</TableCell>
                                            <TableCell>{item.squareMeters} {getMaterialUnit(item.materialType)}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              )}

                              {/* Order Notes */}
                              {order.notes && (
                                <div>
                                  <h4 className="text-sm font-semibold mb-2">Anteckningar</h4>
                                  <div className="bg-background border rounded-lg p-3 text-sm">
                                    {order.notes}
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>

            {sortedOrders.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Inga beställningar hittades med de valda filtren.</p>
                <p className="text-sm mt-2">Beställningar visas här när de markerats som "Beställda" eller "Levererade".</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
