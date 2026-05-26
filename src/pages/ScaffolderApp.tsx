import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Briefcase, Clock, History } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ScaffolderDashboard } from '@/components/scaffolder/ScaffolderDashboard';
import { ScaffolderTimeTracking } from '@/components/scaffolder/ScaffolderTimeTracking';
import { BackButton } from '@/components/BackButton';

const ScaffolderAppInner = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BackButton to="/" label="" />
          <div>
            <h1 className="text-lg font-bold">Ställning-app</h1>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="w-4 h-4" />
        </Button>
      </header>

      <div className="p-4 max-w-5xl mx-auto">
        <Tabs defaultValue="projects" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="projects"><Briefcase className="w-4 h-4 mr-1" />Mina projekt</TabsTrigger>
            <TabsTrigger value="history"><History className="w-4 h-4 mr-1" />Historik</TabsTrigger>
            <TabsTrigger value="time"><Clock className="w-4 h-4 mr-1" />Tidsrapport</TabsTrigger>
          </TabsList>

          <TabsContent value="projects">
            <ScaffolderDashboard mode="active" />
          </TabsContent>

          <TabsContent value="history">
            <ScaffolderDashboard mode="history" />
          </TabsContent>

          <TabsContent value="time">
            <ScaffolderTimeTracking />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const ScaffolderApp = () => (
  <ProtectedRoute>
    <ScaffolderAppInner />
  </ProtectedRoute>
);

export default ScaffolderApp;
