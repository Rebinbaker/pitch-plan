import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Mail, AlertTriangle } from 'lucide-react';
import { ConstructionTeam } from '@/types/team';
import { Project } from '@/types/project';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TeamSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  teams: ConstructionTeam[];
  onTeamAssigned: (teamId: string, teamName: string) => void;
}

export function TeamSelectionModal({ 
  isOpen, 
  onClose, 
  project, 
  teams, 
  onTeamAssigned 
}: TeamSelectionModalProps) {
  const { toast } = useToast();
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);

  const availableTeams = teams.filter(team => 
    team.type !== 'Säljare' &&
    (team.availabilityNextWeek === 'Tillgänglig' || team.availabilityNextWeek === 'Begränsad')
  );

  const getSelectedTeam = () => {
    return teams.find(team => team.id === selectedTeamId);
  };

  const handleAssignTeam = async () => {
    const selectedTeam = getSelectedTeam();
    if (!selectedTeam) return;

    setIsAssigning(true);

    try {
      // Send reminder email to the team
      const { error } = await supabase.functions.invoke('send-material-reminder', {
        body: {
          projectName: project.name,
          projectAddress: project.address,
          teamName: selectedTeam.name,
          teamLeader: selectedTeam.leader,
          teamEmail: selectedTeam.contactInfo, // Assuming contactInfo contains email
          reminderType: 'initial'
        }
      });

      if (error) {
        throw error;
      }

      // Call the callback to update the project
      onTeamAssigned(selectedTeam.id, selectedTeam.name);
      
      toast({
        title: "Team tilldelat!",
        description: `${selectedTeam.name} har tilldelats projektet och fått en påminnelse om att fylla i materialistan.`,
      });

      onClose();
      setSelectedTeamId('');

    } catch (error) {
      console.error('Error assigning team:', error);
      toast({
        title: "Fel vid tilldelning",
        description: "Kunde inte tilldela team och skicka påminnelse. Försök igen.",
        variant: "destructive"
      });
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Välj bygglag för materialhantering
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-800">Material markerat som klart</h3>
                <p className="text-sm text-amber-700 mt-1">
                  För projektet <strong>{project.name}</strong> är material nu markerat som klart ✅. 
                  Ett bygglag måste tilldelas för att hantera materiallistan.
                </p>
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <strong>Projekt:</strong> {project.name}<br />
            <strong>Adress:</strong> {project.address}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Välj bygglag:</label>
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger>
                <SelectValue placeholder="Välj ett lag..." />
              </SelectTrigger>
              <SelectContent>
                {availableTeams.map(team => (
                  <SelectItem key={team.id} value={team.id}>
                    <div className="flex flex-col">
                      <span>{team.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {team.leader ? `Ledare: ${team.leader}` : 'Ingen ledare angiven'}
                        {' • '}
                        {team.availabilityNextWeek}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTeamId && (
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{getSelectedTeam()?.name}</h3>
                    <Badge 
                      variant={getSelectedTeam()?.availabilityNextWeek === 'Tillgänglig' ? 'default' : 'secondary'}
                    >
                      {getSelectedTeam()?.availabilityNextWeek}
                    </Badge>
                  </div>
                  
                  {getSelectedTeam()?.leader && (
                    <div className="text-sm">
                      <strong>Lagledare:</strong> {getSelectedTeam()?.leader}
                    </div>
                  )}
                  
                  {getSelectedTeam()?.currentJob && (
                    <div className="text-sm">
                      <strong>Nuvarande uppdrag:</strong> {getSelectedTeam()?.currentJob}
                    </div>
                  )}

                  {getSelectedTeam()?.skills && getSelectedTeam()?.skills.length > 0 && (
                    <div className="text-sm">
                      <strong>Kompetenser:</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {getSelectedTeam()?.skills.map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
                    <div className="flex items-start gap-2">
                      <Mail className="w-4 h-4 text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <strong>Vad händer när jag tilldelar laget?</strong>
                        <ul className="mt-1 space-y-1 text-xs">
                          <li>• Laget får automatisk påminnelse via e-post</li>
                          <li>• De får instruktioner om att fylla i materialistan</li>
                          <li>• Materialistan måste vara komplett innan beställning</li>
                          <li>• Systemet genererar färdig beställning när klar</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {availableTeams.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Inga tillgängliga lag just nu</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Avbryt
            </Button>
            <Button 
              onClick={handleAssignTeam} 
              disabled={!selectedTeamId || isAssigning}
              className="gap-2"
            >
              {isAssigning ? (
                'Tilldelar...'
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Tilldela lag & Skicka påminnelse
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}