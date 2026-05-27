import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';

interface RoleRouterProps {
  children: React.ReactNode;
}

/**
 * Wraps the root route. Redirects each role to its dedicated scoped dashboard.
 * Admin / production_controller fall through to Oliver's full Index view.
 */
export const RoleRouter: React.FC<RoleRouterProps> = ({ children }) => {
  const { role, loading } = useUserRole();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Kontrollerar behörighet...</p>
        </div>
      </div>
    );
  }

  if (role === 'worker') return <Navigate to="/worker" replace />;
  if (role === 'scaffolding_manager') return <Navigate to="/chef/stallning" replace />;
  if (role === 'container_manager') return <Navigate to="/chef/container" replace />;
  if (role === 'construction_manager') return <Navigate to="/chef/bygg" replace />;

  // admin, production_controller, moderator, user → Oliver's full view
  return <>{children}</>;
};
