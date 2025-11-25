import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useOrganization = () => {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchOrganization = async () => {
      if (!user) {
        setOrganizationId(null);
        setOrganizationName('');
        setLoading(false);
        return;
      }

      try {
        // Get user's organization membership
        const { data: membership, error: membershipError } = await supabase
          .from('organization_members')
          .select('organization_id, organizations(name)')
          .eq('user_id', user.id)
          .single();

        if (membershipError) throw membershipError;

        if (membership) {
          setOrganizationId(membership.organization_id);
          setOrganizationName((membership.organizations as any)?.name || '');
        }
      } catch (error) {
        console.error('Error fetching organization:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganization();
  }, [user]);

  return {
    organizationId,
    organizationName,
    loading,
  };
};
