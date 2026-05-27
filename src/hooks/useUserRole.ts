import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type UserRole =
  | 'admin'
  | 'moderator'
  | 'user'
  | 'worker'
  | 'production_controller'
  | 'scaffolding_manager'
  | 'container_manager'
  | 'construction_manager';

export type RoleScope = 'all' | 'scaffolding' | 'container' | 'construction';

export const roleToScope = (role: UserRole | null): RoleScope => {
  switch (role) {
    case 'scaffolding_manager': return 'scaffolding';
    case 'container_manager': return 'container';
    case 'construction_manager': return 'construction';
    default: return 'all';
  }
};

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching user role:', error);
          setRole('user');
        } else {
          setRole(((data?.role as UserRole) ?? 'user'));
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole('user');
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  const isAdmin = role === 'admin';
  const isModerator = role === 'moderator';
  const isUser = role === 'user';
  const isWorker = role === 'worker';
  const isProductionController = role === 'production_controller';
  const isScaffoldingManager = role === 'scaffolding_manager';
  const isContainerManager = role === 'container_manager';
  const isConstructionManager = role === 'construction_manager';
  const isChef =
    isScaffoldingManager || isContainerManager || isConstructionManager;

  return {
    role,
    loading,
    isAdmin,
    isModerator,
    isUser,
    isWorker,
    isProductionController,
    isScaffoldingManager,
    isContainerManager,
    isConstructionManager,
    isChef,
    scope: roleToScope(role),
  };
};
