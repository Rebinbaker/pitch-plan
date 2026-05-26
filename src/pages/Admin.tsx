import React from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { AdminPanel } from '@/components/AdminPanel';
import { PeriCatalogUpload } from '@/components/admin/PeriCatalogUpload';
import { SecurityAnomaliesView } from '@/components/admin/SecurityAnomaliesView';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { BackButton } from '@/components/BackButton';

const Admin: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();

  // Show loading while checking authentication and role
  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Laddar...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect to home if not admin
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-primary p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <BackButton to="/" className="text-white hover:text-white hover:bg-white/10 mb-3" />
          <h1 className="text-3xl font-bold text-white mb-2">Administratörsområde</h1>
          <p className="text-white/80">Hantera användare och systeminställningar</p>
        </div>
        
        <AdminPanel />

        <div className="mt-6">
          <SecurityAnomaliesView />
        </div>

        <div className="mt-6">
          <PeriCatalogUpload />
        </div>
      </div>
    </div>
  );
};

export default Admin;