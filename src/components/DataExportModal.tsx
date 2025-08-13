import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  FileSpreadsheet, 
  File, 
  Database, 
  Users, 
  Building2, 
  FileText,
  Bell
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

interface DataExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ExportOptions {
  projects: boolean;
  teams: boolean;
  scaffolding: boolean;
  files: boolean;
  notifications: boolean;
}

export const DataExportModal: React.FC<DataExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    projects: true,
    teams: true,
    scaffolding: true,
    files: true,
    notifications: true,
  });
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv'>('excel');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [currentOperation, setCurrentOperation] = useState('');

  const exportData = async () => {
    if (!user) return;

    setIsExporting(true);
    setExportProgress(0);

    try {
      const exportData: any = {};
      const totalSteps = Object.values(exportOptions).filter(Boolean).length;
      let currentStep = 0;

      // Export Projects
      if (exportOptions.projects) {
        setCurrentOperation('Exporterar projekt...');
        const { data: projects, error } = await supabase
          .from('projects' as any)
          .select('*')
          .eq('user_id', user.id);
        
        if (error) throw error;
        
        exportData.Projekt = projects?.map((project: any) => ({
          'Projekt ID': project.id,
          'Namn': project.name,
          'Adress': project.address,
          'Kund': project.customer_name,
          'Telefon': project.customer_phone,
          'Ansvarig säljare': project.responsible_seller,
          'Byggteam': project.construction_team,
          'Startdatum': project.start_date,
          'Deadline': project.deadline,
          'Status': project.status,
          'ROT-status': project.rot_status,
          'Tilldelad släp': project.assigned_trailer,
          'Ställningsansvarig': project.scaffolding_responsible,
          'Uppskattade arbetsdagar': project.estimated_work_days,
          'Faktisk start': project.actual_construction_start,
          'Slutförd %': project.completion_percentage,
          'Anteckningar': project.notes,
          'Region': project.region,
          'Skapad': project.created_at,
          'Uppdaterad': project.updated_at,
        })) || [];
        
        currentStep++;
        setExportProgress((currentStep / totalSteps) * 100);
      }

      // Export Teams
      if (exportOptions.teams) {
        setCurrentOperation('Exporterar team...');
        const { data: teams, error } = await supabase
          .from('teams' as any)
          .select('*')
          .eq('user_id', user.id);
        
        if (error) throw error;
        
        exportData.Team = teams?.map((team: any) => ({
          'Team ID': team.id,
          'Namn': team.name,
          'Typ': team.type,
          'Ledare': team.leader,
          'Medlemmar': Array.isArray(team.members) ? team.members.join(', ') : '',
          'Säljare': Array.isArray(team.sellers) ? team.sellers.join(', ') : '',
          'Färdigheter': Array.isArray(team.skills) ? team.skills.join(', ') : '',
          'Nuvarande jobb': team.current_job,
          'Kontaktinfo': team.contact_info,
          'Prestationsanteckningar': team.performance_notes,
          'Tillgänglighet nästa vecka': team.availability_next_week,
          'Skapad': team.created_at,
          'Uppdaterad': team.updated_at,
        })) || [];
        
        currentStep++;
        setExportProgress((currentStep / totalSteps) * 100);
      }

      // Export Scaffolding
      if (exportOptions.scaffolding) {
        setCurrentOperation('Exporterar ställningar...');
        const { data: scaffolding, error } = await supabase
          .from('scaffolding' as any)
          .select('*')
          .eq('user_id', user.id);
        
        if (error) throw error;
        
        exportData.Ställningar = scaffolding?.map((trailer: any) => ({
          'Ställning ID': trailer.id,
          'Namn': trailer.name,
          'Beskrivning': trailer.description,
          'Status': trailer.status,
          'Skapad': trailer.created_at,
          'Uppdaterad': trailer.updated_at,
        })) || [];
        
        currentStep++;
        setExportProgress((currentStep / totalSteps) * 100);
      }

      // Export Files
      if (exportOptions.files) {
        setCurrentOperation('Exporterar filer...');
        const { data: files, error } = await supabase
          .from('files' as any)
          .select('*')
          .eq('user_id', user.id);
        
        if (error) throw error;
        
        exportData.Filer = files?.map((file: any) => ({
          'Fil ID': file.id,
          'Namn': file.name,
          'Typ': file.type,
          'Storlek (bytes)': file.size,
          'URL': file.url,
          'Projekt ID': file.project_id,
          'Uppladdad': file.uploaded_at,
        })) || [];
        
        currentStep++;
        setExportProgress((currentStep / totalSteps) * 100);
      }

      // Export Notifications
      if (exportOptions.notifications) {
        setCurrentOperation('Exporterar notifikationer...');
        const { data: notifications, error } = await supabase
          .from('notifications' as any)
          .select('*')
          .eq('user_id', user.id);
        
        if (error) throw error;
        
        exportData.Notifikationer = notifications?.map((notification: any) => ({
          'Notifikation ID': notification.id,
          'Titel': notification.title,
          'Meddelande': notification.message,
          'Typ': notification.type,
          'Prioritet': notification.priority,
          'Läst': notification.is_read ? 'Ja' : 'Nej',
          'Åtgärd krävs': notification.action_required ? 'Ja' : 'Nej',
          'Projekt ID': notification.project_id,
          'Projektnamn': notification.project_name,
          'Fältnamn': notification.field_name,
          'Gammalt värde': notification.old_value,
          'Nytt värde': notification.new_value,
          'Ändrad av': notification.changed_by_user,
          'Skapad': notification.created_at,
        })) || [];
        
        currentStep++;
        setExportProgress((currentStep / totalSteps) * 100);
      }

      setCurrentOperation('Genererar fil...');
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `lokala-hantverkarna-backup-${timestamp}`;

      if (exportFormat === 'excel') {
        // Create Excel workbook
        const workbook = XLSX.utils.book_new();
        
        Object.entries(exportData).forEach(([sheetName, data]) => {
          if (Array.isArray(data) && data.length > 0) {
            const worksheet = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
          }
        });
        
        XLSX.writeFile(workbook, `${filename}.xlsx`);
      } else {
        // Export as CSV (combine all data)
        const allData: any[] = [];
        Object.entries(exportData).forEach(([category, data]) => {
          if (Array.isArray(data)) {
            data.forEach(row => {
              allData.push({
                'Kategori': category,
                ...row
              });
            });
          }
        });
        
        const worksheet = XLSX.utils.json_to_sheet(allData);
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setExportProgress(100);
      setCurrentOperation('Export slutförd!');
      
      toast({
        title: "Export slutförd",
        description: `Data har exporterats som ${exportFormat.toUpperCase()}-fil.`,
      });

      setTimeout(() => {
        onClose();
        setIsExporting(false);
        setExportProgress(0);
        setCurrentOperation('');
      }, 2000);

    } catch (error) {
      console.error('Export error:', error);
      toast({
        variant: "destructive",
        title: "Exportfel",
        description: error instanceof Error ? error.message : 'Ett okänt fel uppstod',
      });
      setIsExporting(false);
      setExportProgress(0);
      setCurrentOperation('');
    }
  };

  const toggleExportOption = (option: keyof ExportOptions) => {
    setExportOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  const selectAll = () => {
    const allSelected = Object.values(exportOptions).every(Boolean);
    const newState = !allSelected;
    setExportOptions({
      projects: newState,
      teams: newState,
      scaffolding: newState,
      files: newState,
      notifications: newState,
    });
  };

  const exportItems = [
    { key: 'projects' as keyof ExportOptions, label: 'Projekt', icon: Building2, count: 'projekt' },
    { key: 'teams' as keyof ExportOptions, label: 'Team', icon: Users, count: 'team' },
    { key: 'scaffolding' as keyof ExportOptions, label: 'Ställningar', icon: Database, count: 'ställningar' },
    { key: 'files' as keyof ExportOptions, label: 'Filer', icon: FileText, count: 'filer' },
    { key: 'notifications' as keyof ExportOptions, label: 'Notifikationer', icon: Bell, count: 'notifikationer' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Exportera data för backup
          </DialogTitle>
        </DialogHeader>

        {!isExporting ? (
          <div className="space-y-6">
            <Alert>
              <Database className="h-4 w-4" />
              <AlertDescription>
                Exportera all din data till Excel eller CSV för säker backup och arkivering. 
                Detta rekommenderas att göras regelbundet.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Välj data att exportera:</h4>
                <Button variant="outline" size="sm" onClick={selectAll}>
                  {Object.values(exportOptions).every(Boolean) ? 'Avmarkera alla' : 'Markera alla'}
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {exportItems.map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex items-center space-x-3 p-3 rounded-lg border bg-card">
                    <Checkbox
                      id={key}
                      checked={exportOptions[key]}
                      onCheckedChange={() => toggleExportOption(key)}
                    />
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <label htmlFor={key} className="text-sm font-medium cursor-pointer flex-1">
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Filformat:</h4>
              <div className="flex gap-3">
                <button
                  onClick={() => setExportFormat('excel')}
                  className={`flex items-center gap-2 p-3 rounded-lg border ${
                    exportFormat === 'excel' 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-border hover:bg-accent'
                  }`}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span className="text-sm font-medium">Excel (.xlsx)</span>
                </button>
                <button
                  onClick={() => setExportFormat('csv')}
                  className={`flex items-center gap-2 p-3 rounded-lg border ${
                    exportFormat === 'csv' 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-border hover:bg-accent'
                  }`}
                >
                  <File className="h-4 w-4" />
                  <span className="text-sm font-medium">CSV (.csv)</span>
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                onClick={exportData} 
                className="flex-1"
                disabled={!Object.values(exportOptions).some(Boolean)}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportera data
              </Button>
              <Button variant="outline" onClick={onClose}>
                Avbryt
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <div className="animate-pulse mb-4">
                <Download className="h-12 w-12 text-primary mx-auto" />
              </div>
              <h3 className="font-medium mb-2">Exporterar data...</h3>
              <p className="text-sm text-muted-foreground mb-4">{currentOperation}</p>
              <Progress value={exportProgress} className="w-full" />
              <p className="text-xs text-muted-foreground mt-2">{Math.round(exportProgress)}% slutfört</p>
            </div>

            <Alert>
              <FileSpreadsheet className="h-4 w-4" />
              <AlertDescription>
                Exporten pågår. Stäng inte detta fönster förrän processen är klar.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};