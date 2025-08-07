import { useState } from 'react';
import { ActivityLogEntry } from '@/types/project';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  CheckSquare,
  Settings,
  User,
  MessageSquare,
  Truck,
  BarChart3,
  Clock,
  Plus,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

interface ActivityLogViewProps {
  activityLog: ActivityLogEntry[];
  onAddEntry?: (entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) => void;
}

export function ActivityLogView({ activityLog = [], onAddEntry }: ActivityLogViewProps) {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [newEntryText, setNewEntryText] = useState('');
  const [showAddEntry, setShowAddEntry] = useState(false);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'checklist': return <CheckSquare className="w-4 h-4" />;
      case 'workphase': return <Settings className="w-4 h-4" />;
      case 'status': return <BarChart3 className="w-4 h-4" />;
      case 'assignment': return <Truck className="w-4 h-4" />;
      case 'material': return <BarChart3 className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'checklist': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'workphase': return 'bg-green-500/10 text-green-600 border-green-200';
      case 'status': return 'bg-purple-500/10 text-purple-600 border-purple-200';
      case 'assignment': return 'bg-orange-500/10 text-orange-600 border-orange-200';
      case 'material': return 'bg-yellow-500/10 text-yellow-600 border-yellow-200';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'checklist': return 'Checklista';
      case 'workphase': return 'Arbetsmoment';
      case 'status': return 'Status';
      case 'assignment': return 'Tilldelning';
      case 'material': return 'Material';
      default: return 'Allmänt';
    }
  };

  const filteredEntries = activityLog.filter(entry => 
    filterCategory === 'all' || entry.category === filterCategory
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleAddEntry = () => {
    if (!newEntryText.trim() || !onAddEntry) return;

    onAddEntry({
      user: 'Aktuell Användare', // TODO: Replace with actual user
      action: 'Anteckning tillagd',
      description: newEntryText,
      category: 'general',
    });

    setNewEntryText('');
    setShowAddEntry(false);
  };

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Aktivitetslogg</h3>
        <div className="flex items-center gap-2">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4" />
              <SelectValue placeholder="Filtrera" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla kategorier</SelectItem>
              <SelectItem value="checklist">Checklista</SelectItem>
              <SelectItem value="workphase">Arbetsmoment</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="assignment">Tilldelning</SelectItem>
              <SelectItem value="material">Material</SelectItem>
              <SelectItem value="general">Allmänt</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddEntry(!showAddEntry)}
          >
            <Plus className="w-4 h-4" />
            Lägg till anteckning
          </Button>
        </div>
      </div>

      {/* Add Entry Form */}
      {showAddEntry && onAddEntry && (
        <Card className="p-4 bg-muted/50">
          <div className="space-y-3">
            <Textarea
              placeholder="Skriv din anteckning här..."
              value={newEntryText}
              onChange={(e) => setNewEntryText(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddEntry(false)}
              >
                Avbryt
              </Button>
              <Button
                size="sm"
                onClick={handleAddEntry}
                disabled={!newEntryText.trim()}
              >
                Lägg till
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Activity Log Entries */}
      <div className="space-y-3">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="text-lg font-medium">Ingen aktivitetslogg ännu</h4>
            <p className="text-muted-foreground">
              {filterCategory === 'all' 
                ? 'Aktiviteter kommer att visas här när ändringar görs i projektet.'
                : 'Inga aktiviteter i den valda kategorin.'
              }
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <Card key={entry.id} className="relative">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Timeline dot */}
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mt-1">
                    {getCategoryIcon(entry.category)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{entry.action}</h4>
                          <Badge 
                            variant="secondary"
                            className={`text-xs ${getCategoryColor(entry.category)}`}
                          >
                            {getCategoryLabel(entry.category)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {entry.description}
                        </p>
                      </div>
                      
                      <div className="text-xs text-muted-foreground text-right flex-shrink-0">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(entry.timestamp), 'dd MMM HH:mm', { locale: sv })}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <User className="w-3 h-3" />
                          {entry.user}
                        </div>
                      </div>
                    </div>

                    {/* Value changes */}
                    {entry.oldValue && entry.newValue && (
                      <div className="text-xs bg-muted/50 rounded p-2">
                        <div className="flex items-center gap-2">
                          <span className="text-red-600">Från: {entry.oldValue}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-green-600">Till: {entry.newValue}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}