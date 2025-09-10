import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Phone, Plus, Filter, ChevronDown } from 'lucide-react';
import { ConstructionTeam, TeamType, AvailabilityStatus } from '@/types/team';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface MobileTeamsViewProps {
  teams: ConstructionTeam[];
  onUpdateTeam: (updated: ConstructionTeam) => void;
  onAddTeam: (team: ConstructionTeam) => void;
}

export function MobileTeamsView({ teams, onUpdateTeam, onAddTeam }: MobileTeamsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<TeamType | 'all'>('all');

  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || team.type === filterType;
    return matchesSearch && matchesType;
  });

  const getAvailabilityColor = (availability: AvailabilityStatus) => {
    switch (availability) {
      case 'Tillgänglig': return 'bg-success text-success-foreground';
      case 'Begränsad': return 'bg-warning text-warning-foreground';
      case 'Upptagen': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeColor = (type: TeamType) => {
    switch (type) {
      case 'Internt': return 'bg-primary text-primary-foreground';
      case 'Underentreprenör': return 'bg-accent text-accent-foreground';
      case 'Säljare': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Team</h2>
          <p className="text-sm text-muted-foreground">{filteredTeams.length} team</p>
        </div>
        <Button size="sm" onClick={() => onAddTeam({} as ConstructionTeam)}>
          <Plus className="h-4 w-4 mr-1" />
          Lägg till
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="space-y-3">
        <Input
          placeholder="Sök team..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
        
        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between">
              <Filter className="h-4 w-4 mr-2" />
              Filter
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <Card>
              <CardContent className="p-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Typ:</label>
                  <div className="flex gap-2 flex-wrap">
                    {['all', 'Internt', 'Underentreprenör', 'Säljare'].map((type) => (
                      <Button
                        key={type}
                        variant={filterType === type ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilterType(type as TeamType | 'all')}
                      >
                        {type === 'all' ? 'Alla' : type}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Teams List */}
      <div className="space-y-3">
        {filteredTeams.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Inga team hittades</p>
            </CardContent>
          </Card>
        ) : (
          filteredTeams.map((team) => (
            <Card key={team.id} className="hover:shadow-hover transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-base mb-1">{team.name}</h3>
                    <div className="flex gap-2 flex-wrap">
                      <Badge className={`text-xs ${getTypeColor(team.type)}`}>
                        {team.type}
                      </Badge>
                      <Badge className={`text-xs ${getAvailabilityColor(team.availabilityNextWeek)}`}>
                        {team.availabilityNextWeek}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{team.members?.length || 0} medlemmar</span>
                  </div>
                  
                  {team.contactInfo && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{team.contactInfo}</span>
                    </div>
                  )}
                </div>

                {team.currentJob && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground">Aktuellt jobb:</p>
                    <p className="text-sm font-medium truncate">{team.currentJob}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}