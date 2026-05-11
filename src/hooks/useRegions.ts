import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useOrganization } from './useOrganization';

export const useRegions = () => {
  const [regions, setRegions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { organizationId } = useOrganization();

  const fetchRegions = useCallback(async () => {
    if (!organizationId) {
      setRegions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('regions')
      .select('name')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching regions:', error);
      setRegions([]);
    } else {
      setRegions((data || []).map((r: any) => r.name));
    }
    setLoading(false);
  }, [organizationId]);

  useEffect(() => {
    fetchRegions();
  }, [fetchRegions]);

  const addRegion = useCallback(
    async (name: string): Promise<string | null> => {
      const trimmed = name.trim();
      if (!trimmed || !organizationId || !user) return null;
      if (regions.some((r) => r.toLowerCase() === trimmed.toLowerCase())) {
        return trimmed;
      }
      const { error } = await supabase.from('regions').insert({
        name: trimmed,
        organization_id: organizationId,
        user_id: user.id,
      });
      if (error) {
        console.error('Error adding region:', error);
        return null;
      }
      setRegions((prev) => [...prev, trimmed].sort((a, b) => a.localeCompare(b)));
      return trimmed;
    },
    [organizationId, user, regions]
  );

  return { regions, loading, addRegion, refetch: fetchRegions };
};
