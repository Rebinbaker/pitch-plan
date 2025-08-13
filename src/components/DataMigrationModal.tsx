import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Cloud, HardDrive, Shield, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Project } from '@/types/project';
import { ScaffoldingTrailer } from '@/types/scaffolding';
import { ConstructionTeam } from '@/types/team';
import { ProjectFile } from '@/types/files';
import { Notification } from '@/types/notification';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DataMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMigrationComplete: () => void;
}

export const DataMigrationModal: React.FC<DataMigrationModalProps> = ({
  isOpen,
  onClose,
  onMigrationComplete,
}) => {
  const [step, setStep] = useState<'info' | 'migrating' | 'success' | 'error'>('info');
  const [progress, setProgress] = useState(0);
  const [currentOperation, setCurrentOperation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const migrateData = async () => {
    if (!user) return;

    setStep('migrating');
    setProgress(0);
    setError(null);

    try {
      // Check if user already has data in Supabase
      const { data: existingProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (existingProjects && existingProjects.length > 0) {
        // User already has data in Supabase, just mark migration as complete
        localStorage.setItem('supabase_migration_completed', 'true');
        setStep('success');
        toast({
          title: "Migrering slutförd",
          description: "Din data finns redan i molnet.",
        });
        
        setTimeout(() => {
          onMigrationComplete();
          onClose();
        }, 2000);
        return;
      }

      // Step 1: Migrate projects
      setCurrentOperation('Migrerar projekt...');
      setProgress(10);
      
      const savedProjects = localStorage.getItem('lovable_projects');
      if (savedProjects) {
        const projects: Project[] = JSON.parse(savedProjects);
        for (const project of projects) {
          const { error } = await supabase.from('projects' as any).insert({
            name: project.name,
            address: project.address || '',
            customer_name: project.customerName || '',
            customer_phone: project.customerPhone || '',
            responsible_seller: project.responsibleSeller || '',
            construction_team: project.constructionTeam || null,
            construction_start_week: project.constructionStartWeek || null,
            rot_status: project.rotStatus || 'No',
            status: project.status || 'planned',
            notes: project.notes || '',
            assigned_trailer: project.assignedTrailer || null,
            scaffolding_responsible: project.scaffoldingResponsible || null,
            start_date: project.startDate || null,
            deadline: project.deadline || null,
            estimated_work_days: project.estimatedWorkDays || null,
            actual_construction_start: project.actualConstructionStart || null,
            completion_percentage: project.completionPercentage || 0,
            checklist: project.checklist || [],
            work_phases: project.workPhases || [],
            activity_log: project.activityLog || [],
            region: project.region || 'Stockholm',
            user_id: user.id,
          });
          
          if (error) {
            console.error('Project migration error:', error);
            throw new Error(`Fel vid migrering av projekt: ${error.message}`);
          }
        }
      }
      setProgress(25);

      // Step 2: Migrate scaffolding
      setCurrentOperation('Migrerar ställningar...');
      const savedScaffolding = localStorage.getItem('lovable_scaffolding');
      if (savedScaffolding) {
        const scaffolding: ScaffoldingTrailer[] = JSON.parse(savedScaffolding);
        for (const trailer of scaffolding) {
          const { error } = await supabase.from('scaffolding' as any).insert({
            name: trailer.name,
            description: (trailer as any).description || '',
            status: trailer.status || 'Tillgänglig',
            user_id: user.id,
          });
          
          if (error) {
            console.error('Scaffolding migration error:', error);
            throw new Error(`Fel vid migrering av ställningar: ${error.message}`);
          }
        }
      }
      setProgress(50);

      // Step 3: Migrate teams
      setCurrentOperation('Migrerar team...');
      const savedTeams = localStorage.getItem('lovable_teams');
      if (savedTeams) {
        const teams: ConstructionTeam[] = JSON.parse(savedTeams);
        for (const team of teams) {
          const { error } = await supabase.from('teams' as any).insert({
            name: team.name,
            type: team.type || 'Internt',
            leader: (team as any).leader || null,
            members: team.members || [],
            sellers: team.sellers || [],
            skills: team.skills || [],
            current_job: team.currentJob || null,
            contact_info: team.contactInfo || null,
            performance_notes: team.performanceNotes || null,
            availability_next_week: team.availabilityNextWeek || 'Tillgänglig',
            user_id: user.id,
          });
          
          if (error) {
            console.error('Team migration error:', error);
            throw new Error(`Fel vid migrering av team: ${error.message}`);
          }
        }
      }
      setProgress(75);

      // Step 4: Migrate files
      setCurrentOperation('Migrerar filer...');
      const savedFiles = localStorage.getItem('lovable_files');
      if (savedFiles) {
        const files: ProjectFile[] = JSON.parse(savedFiles);
        for (const file of files) {
          const { error } = await supabase.from('files' as any).insert({
            name: file.name,
            type: file.type,
            size: (file as any).size || 0,
            url: file.url,
            project_id: file.projectId || null,
            user_id: user.id,
          });
          
          if (error) {
            console.error('File migration error:', error);
            throw new Error(`Fel vid migrering av filer: ${error.message}`);
          }
        }
      }
      setProgress(90);

      // Step 5: Migrate notifications
      setCurrentOperation('Migrerar notifikationer...');
      const savedNotifications = localStorage.getItem('lovable_notifications');
      if (savedNotifications) {
        const notifications: Notification[] = JSON.parse(savedNotifications);
        for (const notification of notifications) {
          const { error } = await supabase.from('notifications' as any).insert({
            title: notification.title,
            message: notification.message,
            type: notification.type,
            priority: notification.priority || 'medium',
            is_read: notification.isRead || false,
            action_required: notification.actionRequired || false,
            project_id: notification.projectId || null,
            project_name: notification.projectName || null,
            field_name: (notification as any).fieldName || null,
            old_value: (notification as any).oldValue || null,
            new_value: (notification as any).newValue || null,
            changed_by_user: (notification as any).changedByUser || null,
            user_id: user.id,
          });
          
          if (error) {
            console.error('Notification migration error:', error);
            throw new Error(`Fel vid migrering av notifikationer: ${error.message}`);
          }
        }
      }
      setProgress(100);

      // Mark migration as completed
      localStorage.setItem('supabase_migration_completed', 'true');
      setStep('success');
      
      toast({
        title: "Migrering slutförd",
        description: "All data har framgångsrikt migrerats till Supabase.",
      });

      setTimeout(() => {
        onMigrationComplete();
        onClose();
      }, 2000);

    } catch (err) {
      console.error('Migration error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Ett okänt fel uppstod under migreringen';
      setError(errorMessage);
      setStep('error');
      toast({
        variant: "destructive",
        title: "Migreringsfel",
        description: errorMessage,
      });
    }
  };

  const benefits = [
    {
      icon: Cloud,
      title: "Molnbaserad lagring",
      description: "Din data säkerhetskopieras automatiskt och är tillgänglig överallt"
    },
    {
      icon: Shield,
      title: "Förbättrad säkerhet",
      description: "Row Level Security (RLS) skyddar din data från obehörig åtkomst"
    },
    {
      icon: Zap,
      title: "Real-time synkronisering",
      description: "Automatisk synkronisering mellan enheter och användare"
    },
    {
      icon: HardDrive,
      title: "Automatiska backups",
      description: "Dagliga säkerhetskopior för att förebygga dataförlust"
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-primary" />
            Uppgradera till säker molnlagring
          </DialogTitle>
          <DialogDescription>
            Migrera din data från lokal lagring till Supabase för förbättrad säkerhet och tillförlitlighet
          </DialogDescription>
        </DialogHeader>

        {step === 'info' && (
          <div className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Din data lagras för närvarande lokalt i webbläsaren. För bättre säkerhet och stabilitet 
                rekommenderar vi att du migrerar till vår säkra molnlösning.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                  <benefit.icon className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm">{benefit.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Vad händer under migreringen:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• All data kopieras säkert till Supabase-databasen</li>
                <li>• Din befintliga data förblir intakt som backup</li>
                <li>• Systemet växlar automatiskt till molnlagring</li>
                <li>• Real-time synkronisering aktiveras</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={migrateData} className="flex-1">
                Starta migrering
              </Button>
              <Button variant="outline" onClick={onClose}>
                Senare
              </Button>
            </div>
          </div>
        )}

        {step === 'migrating' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="animate-pulse mb-4">
                <Cloud className="h-12 w-12 text-primary mx-auto" />
              </div>
              <h3 className="font-medium mb-2">Migrerar data...</h3>
              <p className="text-sm text-muted-foreground mb-4">{currentOperation}</p>
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-muted-foreground mt-2">{progress}% slutfört</p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Stäng inte detta fönster under migreringen. Processen tar vanligtvis bara några sekunder.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="font-medium mb-2">Migrering slutförd!</h3>
              <p className="text-sm text-muted-foreground">
                All data har framgångsrikt migrerats till säker molnlagring.
              </p>
            </div>

            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Ditt system använder nu molnbaserad lagring med automatiska backups och real-time synkronisering.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {step === 'error' && (
          <div className="space-y-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="font-medium mb-2">Migreringsfel</h3>
              <p className="text-sm text-muted-foreground">
                Ett fel uppstod under migreringen. Försök igen eller kontakta support.
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button onClick={migrateData} className="flex-1">
                Försök igen
              </Button>
              <Button variant="outline" onClick={onClose}>
                Avbryt
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};