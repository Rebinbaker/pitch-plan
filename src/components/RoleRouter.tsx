import { Navigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import Index from '@/pages/Index';

/**
 * Routes the logged-in user to the right workspace based on their role.
 * Oliver / admins keep the full dashboard. Chef-roller och bygglag får
 * sina egna filtrerade vyer (kommer steg för steg).
 */
export const RoleRouter = () => {
  const { role, loading } = useUserRole();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Laddar arbetsyta…</p>
        </div>
      </div>
    );
  }

  switch (role) {
    case 'scaffolding_manager':
      return <Navigate to="/chef/stallning" replace />;
    case 'container_manager':
      return <Navigate to="/chef/container" replace />;
    case 'construction_manager':
      return <Navigate to="/chef/bygg" replace />;
    case 'construction_team':
    case 'worker':
      return <Navigate to="/worker" replace />;
    case 'admin':
    case 'production_controller':
    case 'moderator':
    case 'user':
    default:
      return <Index />;
  }
};
