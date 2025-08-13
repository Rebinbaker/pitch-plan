import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Cloud, 
  HardDrive, 
  AlertTriangle,
  CheckCircle,
  Zap,
  Download
} from 'lucide-react';
import { useSupabaseStorage } from '@/hooks/useSupabaseStorage';
import { DataMigrationModal } from './DataMigrationModal';
import { useAuth } from '@/hooks/useAuth';

export const SecurityStatus: React.FC = () => {
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const { migrationStatus, checkMigrationNeeded, markMigrationCompleted } = useSupabaseStorage();
  const { user } = useAuth();

  const isUsingLocalStorage = migrationStatus !== 'completed';
  const needsMigration = checkMigrationNeeded();

  const exportData = () => {
    try {
      const data = {
        projects: JSON.parse(localStorage.getItem('lovable_projects') || '[]'),
        scaffolding: JSON.parse(localStorage.getItem('lovable_scaffolding') || '[]'),
        teams: JSON.parse(localStorage.getItem('lovable_teams') || '[]'),
        files: JSON.parse(localStorage.getItem('lovable_files') || '[]'),
        notifications: JSON.parse(localStorage.getItem('lovable_notifications') || '[]'),
        exportedAt: new Date().toISOString(),
        version: '1.0'
      };

      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `lovable-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const getSecurityLevel = () => {
    if (!user) return 'none';
    if (isUsingLocalStorage) return 'basic';
    return 'secure';
  };

  const securityLevel = getSecurityLevel();

  const securityStatusInfo = {
    none: {
      icon: ShieldAlert,
      color: 'destructive',
      title: 'Ingen säkerhet',
      description: 'Du är inte inloggad. Data kan gå förlorad.',
    },
    basic: {
      icon: ShieldAlert,
      color: 'warning',
      title: 'Grundläggande säkerhet',
      description: 'Data lagras lokalt i webbläsaren. Risk för dataförlust.',
    },
    secure: {
      icon: ShieldCheck,
      color: 'success',
      title: 'Säker molnlagring',
      description: 'Data skyddas med molnlagring och automatiska backups.',
    },
  };

  const currentStatus = securityStatusInfo[securityLevel];
  const StatusIcon = currentStatus.icon;

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Säkerhetsstatus
          </CardTitle>
          <CardDescription>
            Överblick över datasäkerhet och backup-status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Security Level */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              <StatusIcon className={`h-6 w-6 ${
                securityLevel === 'secure' ? 'text-green-600' : 
                securityLevel === 'basic' ? 'text-yellow-600' : 'text-red-600'
              }`} />
              <div>
                <h4 className="font-medium">{currentStatus.title}</h4>
                <p className="text-sm text-muted-foreground">{currentStatus.description}</p>
              </div>
            </div>
            <Badge variant={
              securityLevel === 'secure' ? 'default' : 
              securityLevel === 'basic' ? 'secondary' : 'destructive'
            }>
              {securityLevel === 'secure' ? 'Säker' : 
               securityLevel === 'basic' ? 'Risk' : 'Osäker'}
            </Badge>
          </div>

          {/* Storage Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg border ${
              isUsingLocalStorage ? 'border-yellow-200 bg-yellow-50' : 'border-muted'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className={`h-4 w-4 ${isUsingLocalStorage ? 'text-yellow-600' : 'text-muted-foreground'}`} />
                <span className="font-medium text-sm">Lokal lagring</span>
                {isUsingLocalStorage && <Badge variant="outline" className="text-xs">Aktiv</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                Data lagras i webbläsarens localStorage
              </p>
            </div>

            <div className={`p-4 rounded-lg border ${
              !isUsingLocalStorage ? 'border-green-200 bg-green-50' : 'border-muted'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Cloud className={`h-4 w-4 ${!isUsingLocalStorage ? 'text-green-600' : 'text-muted-foreground'}`} />
                <span className="font-medium text-sm">Molnlagring</span>
                {!isUsingLocalStorage && <Badge variant="outline" className="text-xs">Aktiv</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                Säker Supabase-databas med automatiska backups
              </p>
            </div>
          </div>

          {/* Features Status */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Säkerhetsfunktioner</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Real-time synkronisering</span>
                {!isUsingLocalStorage ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Automatiska backups</span>
                {!isUsingLocalStorage ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Row Level Security (RLS)</span>
                {!isUsingLocalStorage ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Multi-device åtkomst</span>
                {!isUsingLocalStorage ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          {user && needsMigration && (
            <Alert className="border-blue-200 bg-blue-50">
              <Zap className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Din data kan migreras till säker molnlagring för förbättrad säkerhet och tillförlitlighet.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 pt-2">
            {user && needsMigration && (
              <Button 
                onClick={() => setShowMigrationModal(true)}
                className="flex-1"
              >
                <Cloud className="h-4 w-4 mr-2" />
                Uppgradera till molnlagring
              </Button>
            )}
            
            {isUsingLocalStorage && (
              <Button 
                variant="outline" 
                onClick={exportData}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportera backup
              </Button>
            )}
          </div>

          {!user && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Logga in för att aktivera säker molnlagring och skydda din data från förlust.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <DataMigrationModal
        isOpen={showMigrationModal}
        onClose={() => setShowMigrationModal(false)}
        onMigrationComplete={() => {
          markMigrationCompleted();
          setShowMigrationModal(false);
        }}
      />
    </>
  );
};