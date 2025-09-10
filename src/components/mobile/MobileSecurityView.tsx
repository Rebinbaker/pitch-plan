import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle, AlertTriangle, XCircle, Eye, Settings } from 'lucide-react';

interface MobileSecurityViewProps {}

export function MobileSecurityView({}: MobileSecurityViewProps) {
  // Mock security data
  const securityStatus = {
    overall: 'good',
    lastScan: '2024-01-15T10:30:00Z',
    issues: 2,
    resolved: 15
  };

  const securityChecks = [
    {
      id: '1',
      name: 'Databasåtkomst',
      status: 'secure',
      description: 'RLS policyer aktiverade',
      lastChecked: '2024-01-15'
    },
    {
      id: '2',
      name: 'Användarautentisering',
      status: 'secure',
      description: 'MFA aktiverat för alla användare',
      lastChecked: '2024-01-15'
    },
    {
      id: '3',
      name: 'Filuppladdning',
      status: 'warning',
      description: 'Vissa filtyper ej validerade',
      lastChecked: '2024-01-14'
    },
    {
      id: '4',
      name: 'API-säkerhet',
      status: 'secure',
      description: 'Rate limiting aktiverat',
      lastChecked: '2024-01-15'
    },
    {
      id: '5',
      name: 'Lösenordspolicy',
      status: 'error',
      description: 'Svaga lösenord upptäckta',
      lastChecked: '2024-01-13'
    }
  ];

  const getOverallStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-success text-success-foreground';
      case 'good': return 'bg-info text-info-foreground';
      case 'warning': return 'bg-warning text-warning-foreground';
      case 'critical': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getOverallStatusLabel = (status: string) => {
    switch (status) {
      case 'excellent': return 'Utmärkt';
      case 'good': return 'Bra';
      case 'warning': return 'Varning';
      case 'critical': return 'Kritisk';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'secure': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'error': return XCircle;
      default: return Shield;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'secure': return 'bg-success text-success-foreground';
      case 'warning': return 'bg-warning text-warning-foreground';
      case 'error': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'secure': return 'Säker';
      case 'warning': return 'Varning';
      case 'error': return 'Fel';
      default: return status;
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Säkerhet</h2>
          <p className="text-sm text-muted-foreground">Systemsäkerhetsöversikt</p>
        </div>
        <Button size="sm" variant="outline">
          <Settings className="h-4 w-4 mr-1" />
          Inställningar
        </Button>
      </div>

      {/* Overall Security Status */}
      <Card className="bg-gradient-subtle">
        <CardContent className="p-6 text-center">
          <div className="flex flex-col items-center space-y-3">
            <div className={`p-4 rounded-full ${getOverallStatusColor(securityStatus.overall)}`}>
              <Shield className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold">
                {getOverallStatusLabel(securityStatus.overall)}
              </h3>
              <p className="text-sm text-muted-foreground">Säkerhetsstatus</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{securityStatus.resolved}</p>
            <p className="text-xs text-muted-foreground">Lösta problem</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-8 w-8 text-warning mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{securityStatus.issues}</p>
            <p className="text-xs text-muted-foreground">Aktiva problem</p>
          </CardContent>
        </Card>
      </div>

      {/* Security Checks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Säkerhetskontroller</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {securityChecks.map((check) => {
              const StatusIcon = getStatusIcon(check.status);
              
              return (
                <div key={check.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-1 rounded-full ${getStatusColor(check.status)} flex-shrink-0`}>
                        <StatusIcon className="h-3 w-3" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{check.name}</h4>
                        <p className="text-xs text-muted-foreground">{check.description}</p>
                      </div>
                    </div>
                    <Badge className={`text-xs ${getStatusColor(check.status)} ml-2`}>
                      {getStatusLabel(check.status)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">
                      Kontrollerad: {new Date(check.lastChecked).toLocaleDateString('sv-SE')}
                    </p>
                    <Button size="sm" variant="ghost">
                      <Eye className="h-3 w-3 mr-1" />
                      Detaljer
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-2">
        <Button className="w-full" size="lg">
          <Shield className="h-4 w-4 mr-2" />
          Kör säkerhetscan
        </Button>
        <Button variant="outline" className="w-full">
          Visa säkerhetsrapport
        </Button>
      </div>
    </div>
  );
}