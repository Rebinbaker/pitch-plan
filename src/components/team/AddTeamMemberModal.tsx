import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  UserPlus, X, Crown, User, Phone, Mail, 
  Briefcase, Star, Plus 
} from 'lucide-react';
import { ConstructionTeam, TeamMember } from '@/types/team';

interface AddTeamMemberModalProps {
  team: ConstructionTeam;
  onUpdateTeam: (team: ConstructionTeam) => void;
  trigger?: React.ReactNode;
}

export function AddTeamMemberModal({ team, onUpdateTeam, trigger }: AddTeamMemberModalProps) {
  const [open, setOpen] = useState(false);
  const [newMembers, setNewMembers] = useState<Partial<TeamMember>[]>([]);
  const [currentMember, setCurrentMember] = useState({
    firstName: '',
    lastName: '',
    position: '',
    email: '',
    phone: '',
    skills: '',
    isLeader: false
  });

  const addMemberToList = () => {
    if (!currentMember.firstName || !currentMember.lastName) return;

    const member: Partial<TeamMember> & { isLeader?: boolean } = {
      id: `member-${Date.now()}-${Math.random()}`,
      firstName: currentMember.firstName,
      lastName: currentMember.lastName,
      position: currentMember.position || undefined,
      email: currentMember.email || undefined,
      phone: currentMember.phone || undefined,
      skills: currentMember.skills 
        ? currentMember.skills.split(',').map(s => s.trim()).filter(s => s)
        : [],
      isLeader: currentMember.isLeader
    };

    setNewMembers([...newMembers, member]);
    setCurrentMember({
      firstName: '',
      lastName: '',
      position: '',
      email: '',
      phone: '',
      skills: '',
      isLeader: false
    });
  };

  const removeMemberFromList = (id: string) => {
    setNewMembers(newMembers.filter(m => m.id !== id));
  };

  const handleSaveMembers = () => {
    if (newMembers.length === 0) return;

    const updatedMembers = [...(team.members || []), ...newMembers as TeamMember[]];
    
    // Find the new leader among the added members
    const newLeader = newMembers.find((member: any) => member.isLeader);
    
    let updatedTeam = { ...team, members: updatedMembers };
    
    if (newLeader) {
      updatedTeam.leader = `${newLeader.firstName} ${newLeader.lastName}`;
    }

    // Update team skills with new member skills
    const allSkills = [...new Set([
      ...(team.skills || []),
      ...newMembers.flatMap(m => m.skills || [])
    ])];
    updatedTeam.skills = allSkills;

    onUpdateTeam(updatedTeam);
    setNewMembers([]);
    setCurrentMember({
      firstName: '',
      lastName: '',
      position: '',
      email: '',
      phone: '',
      skills: '',
      isLeader: false
    });
    setOpen(false);
  };

  const defaultTrigger = (
    <Button variant="outline" className="w-full">
      <UserPlus className="w-4 h-4 mr-2" />
      Lägg till medlemmar
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Lägg till medlemmar i {team.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Member Form */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <User className="w-4 h-4" />
                Ny teammedlem
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Förnamn *</Label>
                  <Input
                    id="firstName"
                    value={currentMember.firstName}
                    onChange={(e) => setCurrentMember({ ...currentMember, firstName: e.target.value })}
                    placeholder="Förnamn"
                  />
                </div>
                
                <div>
                  <Label htmlFor="lastName">Efternamn *</Label>
                  <Input
                    id="lastName"
                    value={currentMember.lastName}
                    onChange={(e) => setCurrentMember({ ...currentMember, lastName: e.target.value })}
                    placeholder="Efternamn"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="position">Position/Roll</Label>
                  <Select 
                    value={currentMember.position} 
                    onValueChange={(value) => setCurrentMember({ ...currentMember, position: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Välj position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Takläggare">Takläggare</SelectItem>
                      <SelectItem value="Projektledare">Projektledare</SelectItem>
                      <SelectItem value="Arbetsledare">Arbetsledare</SelectItem>
                      <SelectItem value="Lärling">Lärling</SelectItem>
                      <SelectItem value="Specialist">Specialist</SelectItem>
                      <SelectItem value="Teammedlem">Teammedlem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="phone">Telefonnummer</Label>
                  <Input
                    id="phone"
                    value={currentMember.phone}
                    onChange={(e) => setCurrentMember({ ...currentMember, phone: e.target.value })}
                    placeholder="+46 70 123 45 67"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">E-post</Label>
                <Input
                  id="email"
                  type="email"
                  value={currentMember.email}
                  onChange={(e) => setCurrentMember({ ...currentMember, email: e.target.value })}
                  placeholder="namn@example.com"
                />
              </div>

              <div>
                <Label htmlFor="skills">Färdigheter</Label>
                <Textarea
                  id="skills"
                  value={currentMember.skills}
                  onChange={(e) => setCurrentMember({ ...currentMember, skills: e.target.value })}
                  placeholder="Ange färdigheter separerade med komma (t.ex. Tegeltäckning, Plåtslageri, Reparationer)"
                  rows={2}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isLeader"
                  checked={currentMember.isLeader}
                  onCheckedChange={(checked) => setCurrentMember({ ...currentMember, isLeader: checked })}
                />
                <Label htmlFor="isLeader" className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-warning" />
                  Sätt som teamledare
                </Label>
              </div>

              <Button 
                onClick={addMemberToList}
                disabled={!currentMember.firstName || !currentMember.lastName}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Lägg till i listan
              </Button>
            </CardContent>
          </Card>

          {/* Members to Add List */}
          {newMembers.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">
                    Medlemmar att lägga till ({newMembers.length})
                  </h3>
                  <Button 
                    onClick={() => setNewMembers([])}
                    variant="outline" 
                    size="sm"
                  >
                    Rensa alla
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {newMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="space-y-1">
                         <div className="flex items-center gap-2">
                           <span className="font-medium">
                             {member.firstName} {member.lastName}
                           </span>
                           {(member as any).isLeader && (
                             <Crown className="w-4 h-4 text-warning" />
                           )}
                           {member.position && (
                             <Badge variant="outline" className="text-xs">
                               {member.position}
                             </Badge>
                           )}
                         </div>
                        
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {member.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {member.email}
                            </div>
                          )}
                          {member.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {member.phone}
                            </div>
                          )}
                        </div>
                        
                        {member.skills && member.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {member.skills.slice(0, 3).map((skill, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            {member.skills.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{member.skills.length - 3} till
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <Button
                        onClick={() => removeMemberFromList(member.id!)}
                        variant="outline"
                        size="sm"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Team Members Summary */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-3">
                Nuvarande teammedlemmar ({team.members?.length || 0})
              </h3>
              {team.members && team.members.length > 0 ? (
                <div className="space-y-2">
                  {team.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {member.firstName} {member.lastName}
                        </span>
                        {team.leader === `${member.firstName} ${member.lastName}` && (
                          <Crown className="w-4 h-4 text-warning" />
                        )}
                        {member.position && (
                          <Badge variant="outline" className="text-xs">
                            {member.position}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {member.skills?.length || 0} färdigheter
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground italic">
                  Inga medlemmar än. Lägg till de första medlemmarna ovan.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              onClick={handleSaveMembers}
              disabled={newMembers.length === 0}
              className="flex-1"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Lägg till {newMembers.length} medlem{newMembers.length !== 1 ? 'mar' : ''}
            </Button>
            <Button 
              onClick={() => setOpen(false)}
              variant="outline"
            >
              Avbryt
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}