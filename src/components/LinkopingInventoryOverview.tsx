import React from 'react';
import { Project } from '@/types/project';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, MapPin, TrendingUp, AlertTriangle } from 'lucide-react';
import { getLinkopingInventory, calculateInventoryValue, getStaleInventory } from '@/utils/linkopingInventory';
import { format } from 'date-fns';

interface LinkopingInventoryOverviewProps {
  projects: Project[];
}

export function LinkopingInventoryOverview({ projects }: LinkopingInventoryOverviewProps) {
  const inventory = getLinkopingInventory(projects);
  const totalValue = calculateInventoryValue(inventory);
  const staleInventory = getStaleInventory(inventory);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-info" />
          📍 Linköpingsparken - Materiallager
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-info/5 rounded-lg border border-info/20">
            <div className="text-2xl font-bold text-info">{inventory.length}</div>
            <div className="text-sm text-muted-foreground">Materialtyper i lager</div>
          </div>
          <div className="p-4 bg-success/5 rounded-lg border border-success/20">
            <div className="text-2xl font-bold text-success">
              {totalValue.toLocaleString('sv-SE')} SEK
            </div>
            <div className="text-sm text-muted-foreground">Uppskattat värde</div>
          </div>
          <div className="p-4 bg-warning/5 rounded-lg border border-warning/20">
            <div className="text-2xl font-bold text-warning">{staleInventory.length}</div>
            <div className="text-sm text-muted-foreground">Material över 60 dagar</div>
          </div>
        </div>

        {/* Material Table */}
        {inventory.length > 0 ? (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Materialtyp</TableHead>
                  <TableHead>Mängd</TableHead>
                  <TableHead>Källprojekt</TableHead>
                  <TableHead>Uppskattat värde</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Senast uppdaterat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map(item => {
                  const isStale = staleInventory.some(stale => stale.id === item.id);
                  const estimatedValue = item.totalSquareMeters * 50; // Basic estimation
                  
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{item.materialType}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{item.totalSquareMeters} m²</span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {item.sourceProjects.slice(0, 2).map(source => (
                            <div key={source.projectId} className="text-xs">
                              <span className="font-medium">{source.projectName}</span>
                              <span className="text-muted-foreground"> ({source.amount} m²)</span>
                            </div>
                          ))}
                          {item.sourceProjects.length > 2 && (
                            <div className="text-xs text-muted-foreground">
                              +{item.sourceProjects.length - 2} fler projekt
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-success" />
                          <span className="text-sm font-medium">
                            {estimatedValue.toLocaleString('sv-SE')} SEK
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isStale ? (
                          <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30 text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Gammalt
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-success/20 text-success border-success/30 text-xs">
                            Aktuellt
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(item.lastUpdated), 'MMM d, yyyy')}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>Inget material finns lagrat i Linköpingsparken</p>
          </div>
        )}

        {/* Warning for stale inventory */}
        {staleInventory.length > 0 && (
          <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
              <div>
                <h4 className="font-medium text-warning mb-2">
                  Gammalt material upptäckt
                </h4>
                <p className="text-sm text-warning-foreground">
                  {staleInventory.length} materialtyper har legat i Linköpingsparken i över 60 dagar. 
                  Överväg att allokera eller kassera detta material för att frigöra lagerutrymme.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}