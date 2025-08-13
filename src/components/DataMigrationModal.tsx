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
      // Step 1: Migrate projects
      setCurrentOperation('Migrerar projekt...');
      setProgress(10);
      
      const savedProjects = localStorage.getItem('lovable_projects');
      if (savedProjects) {
        const projects: Project[] = JSON.parse(savedProjects);
        for (const project of projects) {
          const projectToInsert = {
            ...project,
            user_id: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const { error } = await supabase.from('projects' as any).insert({
            id: projectToInsert.id,
            name: projectToInsert.name,
            address: projectToInsert.address,
            customer_name: projectToInsert.customerName,
            customer_phone: projectToInsert.customerPhone,
            responsible_seller: projectToInsert.responsibleSeller,
            construction_team: projectToInsert.constructionTeam,
            construction_start_week: projectToInsert.constructionStartWeek,
            rot_status: projectToInsert.rotStatus,
            status: projectToInsert.status,
            notes: projectToInsert.notes,
            assigned_trailer: projectToInsert.assignedTrailer,
            scaffolding_responsible: projectToInsert.scaffoldingResponsible,
            start_date: projectToInsert.startDate,
            deadline: projectToInsert.deadline,
            estimated_work_days: projectToInsert.estimatedWorkDays,
            actual_construction_start: projectToInsert.actualConstructionStart,
            completion_percentage: projectToInsert.completionPercentage,
            checklist: projectToInsert.checklist || [],
            work_phases: projectToInsert.workPhases || [],
            activity_log: projectToInsert.activityLog || [],
            region: projectToInsert.region,
            user_id: user.id,
          });
          
          if (error) throw error;
        }
      }
      setProgress(25);

      // Step 2: Migrate scaffolding
      setCurrentOperation('Migrerar ställningar...');
      const savedScaffolding = localStorage.getItem('lovable_scaffolding');
      if (savedScaffolding) {
        const scaffolding: ScaffoldingTrailer[] = JSON.parse(savedScaffolding);
        for (const trailer of scaffolding) {
          const trailerToInsert = {
            ...trailer,
            user_id: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const { error } = await supabase.from('scaffolding' as any).insert({
            id: trailerToInsert.id,
            name: trailerToInsert.name,
            description: (trailerToInsert as any).description || '',
            status: trailerToInsert.status,
            user_id: user.id,
          });
          
          if (error) throw error;
        }
      }
      setProgress(50);

      // Step 3: Migrate teams
      setCurrentOperation('Migrerar team...');
      const savedTeams = localStorage.getItem('lovable_teams');
      if (savedTeams) {
        const teams: ConstructionTeam[] = JSON.parse(savedTeams);
        for (const team of teams) {
          const teamToInsert = {
            ...team,
            user_id: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const { error } = await supabase.from('teams' as any).insert({
            id: teamToInsert.id,
            name: teamToInsert.name,
            type: teamToInsert.type,
            leader: (teamToInsert as any).leader || '',
            members: teamToInsert.members || [],
            sellers: teamToInsert.sellers || [],
            skills: teamToInsert.skills || [],
            current_job: teamToInsert.currentJob,
            contact_info: teamToInsert.contactInfo,
            performance_notes: teamToInsert.performanceNotes,
            availability_next_week: teamToInsert.availabilityNextWeek,
            user_id: user.id,
          });
          
          if (error) throw error;
        }
      }
      setProgress(75);

      // Step 4: Migrate files
      setCurrentOperation('Migrerar filer...');
      const savedFiles = localStorage.getItem('lovable_files');
      if (savedFiles) {
        const files: ProjectFile[] = JSON.parse(savedFiles);
        for (const file of files) {
          const fileToInsert = {
            ...file,
            user_id: user.id,
            uploaded_at: file.uploadedAt || new Date().toISOString(),
          };

          const { error } = await supabase.from('files' as any).insert({
            id: fileToInsert.id,
            name: fileToInsert.name,
            type: fileToInsert.type,
            size: (fileToInsert as any).size || 0,
            url: fileToInsert.url,
            project_id: fileToInsert.projectId,
            user_id: user.id,
            uploaded_at: fileToInsert.uploaded_at,
          });
          
          if (error) throw error;
        }
      }
      setProgress(90);

      // Step 5: Migrate notifications
      setCurrentOperation('Migrerar notifikationer...');
      const savedNotifications = localStorage.getItem('lovable_notifications');
      if (savedNotifications) {
        const notifications: Notification[] = JSON.parse(savedNotifications);
        for (const notification of notifications) {
          const notificationToInsert = {
            ...notification,
            user_id: user.id,
            created_at: notification.createdAt || new Date().toISOString(),
          };

          const { error } = await supabase.from('notifications' as any).insert({
            id: notificationToInsert.id,
            title: notificationToInsert.title,
            message: notificationToInsert.message,
            type: notificationToInsert.type,
            priority: notificationToInsert.priority,
            is_read: notificationToInsert.isRead,
            action_required: notificationToInsert.actionRequired,
            project_id: notificationToInsert.projectId,
            project_name: notificationToInsert.projectName,
            field_name: (notificationToInsert as any).fieldName || null,
            old_value: (notificationToInsert as any).oldValue || null,
            new_value: (notificationToInsert as any).newValue || null,
            changed_by_user: (notificationToInsert as any).changedByUser || null,
            user_id: user.id,
            created_at: notificationToInsert.created_at,
          });
          
          if (error) throw error;
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
      setError(err instanceof Error ? err.message : 'Ett okänt fel uppstod under migreringen');
      setStep('error');
      toast({
        variant: "destructive",
        title: "Migreringsfel",
        description: err instanceof Error ? err.message : 'Ett okänt fel uppstod',
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