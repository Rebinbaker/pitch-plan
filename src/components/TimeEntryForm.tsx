import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Play, Pause, Plus } from 'lucide-react';
import { Project } from '@/types/project';
import { TimeEntry } from '@/types/timeTracking';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { LocationVerification } from './LocationVerification';
import { PhotoVerification } from './PhotoVerification';

interface TimeEntryFormProps {
  projects: Project[];
  onEntryAdded: () => void;
  currentEntry: TimeEntry | null;
  onStartTimer: (projectId?: string, description?: string) => void;
  onStopTimer: () => void;
}

const TimeEntryForm: React.FC<TimeEntryFormProps> = ({
  projects,
  onEntryAdded,
  currentEntry,
  onStartTimer,
  onStopTimer
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    project_id: '',
    work_phase_name: '',
    description: '',
    start_time: '',
    end_time: '',
    duration_hours: '',
    is_billable: true,
    hourly_rate: ''
  });

  // Verification states
  const [locationData, setLocationData] = useState<{
    latitude: number;
    longitude: number;
    address: string;
    verified: boolean;
  } | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [timerProjectId, setTimerProjectId] = useState<string>('');
  const [timerDescription, setTimerDescription] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check verification requirements
    if (!locationData) {
      toast({
        title: "Platsverifiering krävs",
        description: "Du måste verifiera din plats innan registrering",
        variant: "destructive",
      });
      return;
    }

    if (!photoUrl) {
      toast({
        title: "Fotoverifiering krävs", 
        description: "Du måste ta ett verifieringsfoto innan registrering",
        variant: "destructive",
      });
      return;
    }
    
    try {
      let durationHours = parseFloat(formData.duration_hours);
      
      // Calculate duration from times if not provided
      if (!durationHours && formData.start_time && formData.end_time) {
        const start = new Date(`2000-01-01T${formData.start_time}`);
        const end = new Date(`2000-01-01T${formData.end_time}`);
        durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }

      if (!durationHours || durationHours <= 0) {
        toast({
          title: "Fel",
          description: "Ange antingen tider eller antal timmar",
          variant: "destructive",
        });
        return;
      }

      const now = new Date();
      const startDateTime = formData.start_time 
        ? new Date(`${now.toDateString()} ${formData.start_time}`)
        : new Date(now.getTime() - (durationHours * 60 * 60 * 1000));
      
      const endDateTime = formData.end_time 
        ? new Date(`${now.toDateString()} ${formData.end_time}`)
        : now;

      const selectedProject = projects.find(p => p.id === formData.project_id);

      const { error } = await supabase
        .from('time_entries')
        .insert({
          user_id: user!.id,
          project_id: formData.project_id || null,
          work_phase_name: formData.work_phase_name || null,
          description: formData.description || 'Manuell registrering',
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          duration_hours: durationHours,
          entry_type: 'manual',
          is_billable: formData.is_billable,
          hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
          gps_latitude: locationData.latitude,
          gps_longitude: locationData.longitude,
          location_address: locationData.address,
          verification_photo_url: photoUrl,
          location_verified: locationData.verified,
          photo_verified: true
        });

      if (error) throw error;

      toast({
        title: "Tid registrerad",
        description: `${durationHours} timmar har registrerats`,
      });

      // Reset form and verification data
      setFormData({
        project_id: '',
        work_phase_name: '',
        description: '',
        start_time: '',
        end_time: '',
        duration_hours: '',
        is_billable: true,
        hourly_rate: ''
      });
      setLocationData(null);
      setPhotoUrl('');

      onEntryAdded();
    } catch (error) {
      console.error('Error adding time entry:', error);
      toast({
        title: "Fel",
        description: "Kunde inte registrera tid",
        variant: "destructive",
      });
    }
  };

  const selectedProject = projects.find(p => p.id === formData.project_id);
  const workPhases = selectedProject?.workPhases || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Quick Timer */}
      <Card>
        <CardHeader>
          <CardTitle>Snabb timer</CardTitle>
          <CardDescription>Starta och stoppa timer för aktuellt arbete</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="timer-project">Projekt (valfritt)</Label>
              <Select 
                value={timerProjectId} 
                onValueChange={setTimerProjectId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj projekt" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="timer-description">Beskrivning</Label>
              <Input 
                id="timer-description"
                value={timerDescription}
                onChange={(e) => setTimerDescription(e.target.value)}
                placeholder="Vad arbetar du med?"
              />
            </div>
          </div>

          {/* Timer Verification - Only show when not currently running */}
          {!currentEntry && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <LocationVerification
                projectAddress={projects.find(p => p.id === timerProjectId)?.address}
                onLocationVerified={setLocationData}
              />
              <PhotoVerification
                onPhotoUploaded={setPhotoUrl}
              />
            </div>
          )}
          
          {currentEntry ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="font-medium">Timer aktiv</div>
                <div className="text-sm text-muted-foreground">
                  Startad: {new Date(currentEntry.start_time).toLocaleTimeString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  {currentEntry.description}
                </div>
              </div>
              <Button onClick={onStopTimer} className="w-full">
                <Pause className="h-4 w-4 mr-2" />
                Stoppa timer
              </Button>
            </div>
          ) : (
            <Button 
              onClick={() => {
                if (!locationData || !photoUrl) {
                  toast({
                    title: "Verifiering krävs",
                    description: "Du måste verifiera plats och ta foto innan du startar timer",
                    variant: "destructive",
                  });
                  return;
                }
                onStartTimer(timerProjectId, timerDescription);
              }} 
              className="w-full"
              disabled={!locationData || !photoUrl}
            >
              <Play className="h-4 w-4 mr-2" />
              Starta timer
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Manual Entry */}
      <Card>
        <CardHeader>
          <CardTitle>Manuell registrering</CardTitle>
          <CardDescription>Registrera arbetstid manuellt</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="project">Projekt</Label>
                <Select 
                  value={formData.project_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, project_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Välj projekt" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="work-phase">Arbetsfas</Label>
                <Select 
                  value={formData.work_phase_name} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, work_phase_name: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Välj arbetsfas" />
                  </SelectTrigger>
                  <SelectContent>
                    {workPhases.map((phase) => (
                      <SelectItem key={phase.id} value={phase.label}>
                        {phase.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Beskrivning</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Beskrivning av arbetet..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="start-time">Starttid</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="end-time">Sluttid</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="duration">Timmar</Label>
                <Input
                  id="duration"
                  type="number"
                  step="0.25"
                  value={formData.duration_hours}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration_hours: e.target.value }))}
                  placeholder="0.0"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="billable"
                  checked={formData.is_billable}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_billable: checked }))}
                />
                <Label htmlFor="billable">Fakturerbart</Label>
              </div>
              
              <div className="w-32">
                <Label htmlFor="hourly-rate">Timpris (kr)</Label>
                <Input
                  id="hourly-rate"
                  type="number"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Verification Components */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <LocationVerification
                projectAddress={selectedProject?.address}
                onLocationVerified={setLocationData}
              />
              <PhotoVerification
                onPhotoUploaded={setPhotoUrl}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={!locationData || !photoUrl}
            >
              <Plus className="h-4 w-4 mr-2" />
              Registrera tid
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TimeEntryForm;