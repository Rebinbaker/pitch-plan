import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Project, MaterialOrderStatus } from '@/types/project';
import { History, Search, Calendar, MapPin, Package, Copy, Mail, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
      case 'ordered': return 'Beställd';
      case 'delivered': return 'Levererad';
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
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrera status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla status</SelectItem>
                <SelectItem value="ordered">Beställda</SelectItem>
                <SelectItem value="delivered">Levererade</SelectItem>
              </SelectContent>
            </Select>

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
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {order.orderText && (
                            <>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <FileText className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle>Beställningstext - {project.name}</DialogTitle>
                                    <DialogDescription>
                                      Beställd {new Date(order.createdAt).toLocaleDateString('sv-SE')}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="bg-muted p-4 rounded-lg">
                                      <pre className="whitespace-pre-wrap text-sm font-mono">
                                        {order.orderText}
                                      </pre>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        onClick={() => copyOrderText(order.orderText!)}
                                        className="flex-1"
                                      >
                                        <Copy className="w-4 h-4 mr-2" />
                                        Kopiera
                                      </Button>
                                      <Button
                                        variant="outline"
                                        onClick={() => openInOutlook(order.orderText!, project.address || project.name)}
                                        className="flex-1"
                                      >
                                        <Mail className="w-4 h-4 mr-2" />
                                        Öppna i Outlook
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              
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
