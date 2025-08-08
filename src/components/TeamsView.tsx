import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Phone, Briefcase, Star, Plus, UserPlus } from 'lucide-react';
import { ConstructionTeam, TeamType, AvailabilityStatus, TeamMember } from '@/types/team';
import { calculateRemainingTime, formatDaysRemaining } from '@/utils/timeCalculations';

interface TeamsViewProps {
  teams: ConstructionTeam[];
  onUpdateTeam: (updated: ConstructionTeam) => void;
  onAddTeam: (team: ConstructionTeam) => void;
  projects?: any[]; // Add projects to calculate remaining time
}

export function TeamsView({ teams, onUpdateTeam, onAddTeam, projects = [] }: TeamsViewProps) {
  const [filterType, setFilterType] = useState<TeamType | 'all'>('all');
  const [filterAvailability, setFilterAvailability] = useState<AvailabilityStatus | 'all'>('all');
  const [showSalesOnly, setShowSalesOnly] = useState(false);

  const filteredTeams = teams.filter(team => {
    const matchesType = filterType === 'all' || team.type === filterType;
    const matchesAvailability = filterAvailability === 'all' || team.availabilityNextWeek === filterAvailability;
    const matchesSales = !showSalesOnly || team.type === 'Säljare';
    return matchesType && matchesAvailability && matchesSales;
  });

  const getAvailabilityColor = (availability: AvailabilityStatus) => {
    switch (availability) {
      case 'Tillgänglig': return 'bg-green-500';
      case 'Begränsad': return 'bg-orange-500';
      case 'Upptagen': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeColor = (type: TeamType) => {
    switch (type) {
      case 'Internt': return 'bg-blue-500';
      case 'Underentreprenör': return 'bg-purple-500';
      case 'Säljare': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Byggteam</h2>
          <p className="text-muted-foreground">Hantera interna team och underentreprenörer</p>
        </div>
        
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Nytt team
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Skapa nytt team</DialogTitle>
              </DialogHeader>
              <NewTeamForm onSave={onAddTeam} />
            </DialogContent>
          </Dialog>
          
          <Select value={filterType} onValueChange={(value: TeamType | 'all') => setFilterType(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Teamtyp" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla typer</SelectItem>
              <SelectItem value="Internt">Internt</SelectItem>
              <SelectItem value="Underentreprenör">Underentreprenör</SelectItem>
              <SelectItem value="Säljare">Säljare</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterAvailability} onValueChange={(value: AvailabilityStatus | 'all') => setFilterAvailability(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Tillgänglighet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla tillgängligheter</SelectItem>
              <SelectItem value="Tillgänglig">Tillgänglig</SelectItem>
              <SelectItem value="Begränsad">Begränsad</SelectItem>
              <SelectItem value="Upptagen">Upptagen</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant={showSalesOnly ? "default" : "outline"} 
            onClick={() => setShowSalesOnly(!showSalesOnly)}
            className="w-[100px]"
          >
            Säljare
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {teams.filter(t => t.type === 'Internt').length}
            </div>
            <div className="text-sm text-muted-foreground">Interna team</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {teams.filter(t => t.type === 'Underentreprenör').length}
            </div>
            <div className="text-sm text-muted-foreground">Underentreprenörer</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {teams.filter(t => t.type === 'Säljare').length}
            </div>
            <div className="text-sm text-muted-foreground">Säljare</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {teams.filter(t => t.availabilityNextWeek === 'Tillgänglig').length}
            </div>
            <div className="text-sm text-muted-foreground">Tillgänglig nästa vecka</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {teams.filter(t => t.availabilityNextWeek === 'Upptagen').length}
            </div>
            <div className="text-sm text-muted-foreground">Upptagen nästa vecka</div>
          </CardContent>
        </Card>
      </div>

      {/* Teams List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredTeams.map(team => (
          <Card key={team.id} className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {team.name}
                </CardTitle>
                <div className="flex gap-1">
                  <Badge variant="secondary" className={`${getTypeColor(team.type)} text-white`}>
                    {team.type}
                  </Badge>
                </div>
              </div>
              <Badge 
                variant="secondary" 
                className={`${getAvailabilityColor(team.availabilityNextWeek)} text-white w-fit`}
              >
                {team.availabilityNextWeek} nästa vecka
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {team.currentJob && (
                <div className="space-y-1">
                  <div className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Nuvarande jobb
                  </div>
                  <div className="text-sm text-muted-foreground">{team.currentJob}</div>
                </div>
              )}
              
              {team.contactInfo && (
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">{team.contactInfo}</div>
                </div>
              )}
              
              {/* Sales person details */}
              {team.type === 'Säljare' && team.firstName && team.lastName && (
                <div className="space-y-1">
                  <div className="text-sm font-medium text-foreground">Namn</div>
                  <div className="text-sm text-muted-foreground">{team.firstName} {team.lastName}</div>
                  {team.region && (
                    <>
                      <div className="text-sm font-medium text-foreground">Region</div>
                      <div className="text-sm text-muted-foreground">{team.region}</div>
                    </>
                  )}
                </div>
              )}
              
              {/* Skills for non-sales teams */}
              {team.type !== 'Säljare' && (
                <div className="space-y-1">
                  <div className="text-sm font-medium text-foreground">Färdigheter</div>
                  <div className="flex flex-wrap gap-1">
                    {team.skills.map((skill, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {team.performanceNotes && (
                <div className="flex items-start gap-2">
                  <Star className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">{team.performanceNotes}</div>
                </div>
              )}
              
              {/* Time estimation for team availability */}
              {team.currentJob && team.availabilityNextWeek === 'Upptagen' && (
                (() => {
                  const project = projects.find(p => p.name === team.currentJob);
                  if (project) {
                    const timeEstimate = calculateRemainingTime(project);
                    return (
                      <div className="bg-red-50 dark:bg-red-950/20 p-2 rounded border border-red-200 dark:border-red-800">
                        <div className="text-xs font-medium text-red-700 dark:text-red-300">
                          Team ledig om: {formatDaysRemaining(timeEstimate.workersRemainingDays)}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()
              )}
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    Redigera teaminfo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Redigera {team.name}</DialogTitle>
                  </DialogHeader>
                  <TeamEditForm
                    team={team}
                    onSave={(updated) => onUpdateTeam(updated)}
                  />
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

interface TeamEditFormProps {
  team: ConstructionTeam;
  onSave: (team: ConstructionTeam) => void;
}

function TeamEditForm({ team, onSave }: TeamEditFormProps) {
  const [formData, setFormData] = useState(team);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Tillgänglighet nästa vecka</label>
        <Select 
          value={formData.availabilityNextWeek} 
          onValueChange={(value: AvailabilityStatus) => 
            setFormData({ ...formData, availabilityNextWeek: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Tillgänglig">Tillgänglig</SelectItem>
            <SelectItem value="Begränsad">Begränsad</SelectItem>
            <SelectItem value="Upptagen">Upptagen</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <label className="text-sm font-medium">Prestationsanteckningar</label>
        <Textarea
          value={formData.performanceNotes || ''}
          onChange={(e) => setFormData({ ...formData, performanceNotes: e.target.value })}
          placeholder="Anteckningar om teamprestanda"
          rows={3}
        />
      </div>
      
      <Button type="submit" className="w-full">
        Spara ändringar
      </Button>
    </form>
  );
}

interface NewTeamFormProps {
  onSave: (team: ConstructionTeam) => void;
}

function NewTeamForm({ onSave }: NewTeamFormProps) {
  const [teamName, setTeamName] = useState('');
  const [teamType, setTeamType] = useState<TeamType>('Internt');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [newMember, setNewMember] = useState({
    firstName: '',
    lastName: '',
    skills: ''
  });
  // For sales people
  const [salesPerson, setSalesPerson] = useState({
    firstName: '',
    lastName: '',
    region: ''
  });

  const addMember = () => {
    if (newMember.firstName && newMember.lastName) {
      const member: TeamMember = {
        id: `member-${Date.now()}`,
        firstName: newMember.firstName,
        lastName: newMember.lastName,
        skills: newMember.skills.split(',').map(s => s.trim()).filter(s => s)
      };
      setMembers([...members, member]);
      setNewMember({ firstName: '', lastName: '', skills: '' });
    }
  };

  const removeMember = (id: string) => {
    setMembers(members.filter(m => m.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (teamType === 'Säljare') {
      if (!teamName || !salesPerson.firstName || !salesPerson.lastName) return;
      
      const team: ConstructionTeam = {
        id: `team-${Date.now()}`,
        name: teamName,
        type: teamType,
        availabilityNextWeek: 'Tillgänglig',
        skills: [],
        firstName: salesPerson.firstName,
        lastName: salesPerson.lastName,
        region: salesPerson.region
      };
      
      onSave(team);
    } else {
      if (!teamName || members.length === 0) return;

      const team: ConstructionTeam = {
        id: `team-${Date.now()}`,
        name: teamName,
        type: teamType,
        availabilityNextWeek: 'Tillgänglig',
        skills: [...new Set(members.flatMap(m => m.skills))],
        members
      };

      onSave(team);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Teamnamn</label>
          <Input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="t.ex. Team Alpha"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Teamtyp</label>
          <Select value={teamType} onValueChange={(value: TeamType) => setTeamType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Internt">Internt</SelectItem>
              <SelectItem value="Underentreprenör">Underentreprenör</SelectItem>
              <SelectItem value="Säljare">Säljare</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

{teamType === 'Säljare' ? (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Förnamn</label>
            <Input
              value={salesPerson.firstName}
              onChange={(e) => setSalesPerson({ ...salesPerson, firstName: e.target.value })}
              placeholder="Förnamn"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Efternamn</label>
            <Input
              value={salesPerson.lastName}
              onChange={(e) => setSalesPerson({ ...salesPerson, lastName: e.target.value })}
              placeholder="Efternamn"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Region</label>
            <Input
              value={salesPerson.region}
              onChange={(e) => setSalesPerson({ ...salesPerson, region: e.target.value })}
              placeholder="Region"
            />
          </div>
        </div>
      ) : (
        <div>
          <label className="text-sm font-medium mb-3 block">Teammedlemmar</label>
          <div className="border rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <Input
                value={newMember.firstName}
                onChange={(e) => setNewMember({ ...newMember, firstName: e.target.value })}
                placeholder="Förnamn"
              />
              <Input
                value={newMember.lastName}
                onChange={(e) => setNewMember({ ...newMember, lastName: e.target.value })}
                placeholder="Efternamn"
              />
              <div className="flex gap-2">
                <Input
                  value={newMember.skills}
                  onChange={(e) => setNewMember({ ...newMember, skills: e.target.value })}
                  placeholder="Färdigheter (komma-separerat)"
                  className="flex-1"
                />
                <Button type="button" onClick={addMember} size="sm">
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {members.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Tillagda medlemmar:</div>
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between bg-muted p-2 rounded">
                    <div>
                      <span className="font-medium">{member.firstName} {member.lastName}</span>
                      {member.skills.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          {member.skills.join(', ')}
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeMember(member.id)}
                    >
                      Ta bort
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Button 
        type="submit" 
        className="w-full" 
        disabled={teamType === 'Säljare' ? 
          (!teamName || !salesPerson.firstName || !salesPerson.lastName) : 
          (!teamName || members.length === 0)
        }
      >
        Skapa {teamType === 'Säljare' ? 'säljare' : 'team'}
      </Button>
    </form>
  );
}