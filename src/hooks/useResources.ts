import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useOrganization } from './useOrganization';
import { toast } from '@/hooks/use-toast';
import { Resource, ResourceInput } from '@/types/resource';

const mapRow = (r: any): Resource => ({
  id: r.id,
  organizationId: r.organization_id,
  userId: r.user_id,
  name: r.name,
  company: r.company,
  resourceTypes: r.resource_types || [],
  counties: r.counties || [],
  contactPerson: r.contact_person,
  phone: r.phone,
  email: r.email,
  address: r.address,
  city: r.city,
  postalCode: r.postal_code,
  website: r.website,
  notes: r.notes,
  isFavorite: r.is_favorite ?? false,
  rating: r.rating,
  timesUsed: r.times_used ?? 0,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toRow = (input: Partial<ResourceInput>) => ({
  name: input.name,
  company: input.company ?? null,
  resource_types: input.resourceTypes ?? [],
  counties: input.counties ?? [],
  contact_person: input.contactPerson ?? null,
  phone: input.phone ?? null,
  email: input.email ?? null,
  address: input.address ?? null,
  city: input.city ?? null,
  postal_code: input.postalCode ?? null,
  website: input.website ?? null,
  notes: input.notes ?? null,
  is_favorite: input.isFavorite ?? false,
  rating: input.rating ?? null,
});

export const useResources = () => {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name');
    if (error) {
      console.error(error);
      toast({ title: 'Kunde inte ladda resurser', description: error.message, variant: 'destructive' });
    } else {
      setResources((data || []).map(mapRow));
    }
    setLoading(false);
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  const addResource = async (input: ResourceInput) => {
    if (!user || !organizationId) return;
    const { data, error } = await supabase
      .from('resources')
      .insert({ ...toRow(input), user_id: user.id, organization_id: organizationId })
      .select()
      .single();
    if (error) {
      toast({ title: 'Kunde inte spara', description: error.message, variant: 'destructive' });
      return;
    }
    setResources((prev) => [...prev, mapRow(data)].sort((a, b) => a.name.localeCompare(b.name)));
    toast({ title: 'Resurs tillagd' });
  };

  const updateResource = async (id: string, updates: Partial<ResourceInput>) => {
    const { data, error } = await supabase
      .from('resources')
      .update(toRow(updates))
      .eq('id', id)
      .select()
      .single();
    if (error) {
      toast({ title: 'Kunde inte uppdatera', description: error.message, variant: 'destructive' });
      return;
    }
    setResources((prev) => prev.map((r) => (r.id === id ? mapRow(data) : r)));
  };

  const toggleFavorite = async (id: string) => {
    const r = resources.find((x) => x.id === id);
    if (!r) return;
    await updateResource(id, { isFavorite: !r.isFavorite } as any);
  };

  const deleteResource = async (id: string) => {
    const { error } = await supabase.from('resources').delete().eq('id', id);
    if (error) {
      toast({ title: 'Kunde inte radera', description: error.message, variant: 'destructive' });
      return;
    }
    setResources((prev) => prev.filter((r) => r.id !== id));
    toast({ title: 'Resurs raderad' });
  };

  return { resources, loading, addResource, updateResource, deleteResource, toggleFavorite, reload: load };
};
