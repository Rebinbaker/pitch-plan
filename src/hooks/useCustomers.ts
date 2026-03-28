import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useOrganization } from './useOrganization';
import { toast } from '@/hooks/use-toast';

export interface Customer {
  id: string;
  organization_id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerInteraction {
  id: string;
  customer_id: string;
  organization_id: string;
  user_id: string;
  interaction_type: string;
  subject: string;
  description: string | null;
  related_project_id: string | null;
  created_at: string;
}

export const useCustomers = () => {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [interactions, setInteractions] = useState<CustomerInteraction[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCustomers = useCallback(async () => {
    if (!user || !organizationId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers' as any)
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');
      if (error) throw error;
      setCustomers((data as any[]) || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  }, [user, organizationId]);

  const loadInteractions = useCallback(async (customerId?: string) => {
    if (!user || !organizationId) return;
    try {
      let query = supabase
        .from('customer_interactions' as any)
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }
      const { data, error } = await query;
      if (error) throw error;
      setInteractions((data as any[]) || []);
    } catch (error) {
      console.error('Error loading interactions:', error);
    }
  }, [user, organizationId]);

  useEffect(() => {
    if (user && organizationId) {
      loadCustomers();
    }
  }, [user, organizationId, loadCustomers]);

  const addCustomer = async (customer: Omit<Customer, 'id' | 'organization_id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user || !organizationId) return;
    try {
      const { data, error } = await supabase
        .from('customers' as any)
        .insert({
          ...customer,
          organization_id: organizationId,
          user_id: user.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      setCustomers(prev => [...prev, data as any]);
      toast({ title: 'Kund tillagd', description: `${customer.name} har lagts till.` });
      return data as any as Customer;
    } catch (error: any) {
      toast({ title: 'Fel', description: error.message, variant: 'destructive' });
    }
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    if (!user || !organizationId) return;
    try {
      const { error } = await supabase
        .from('customers' as any)
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
      toast({ title: 'Kund uppdaterad' });
    } catch (error: any) {
      toast({ title: 'Fel', description: error.message, variant: 'destructive' });
    }
  };

  const deleteCustomer = async (id: string) => {
    if (!user || !organizationId) return;
    try {
      const { error } = await supabase
        .from('customers' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
      setCustomers(prev => prev.filter(c => c.id !== id));
      toast({ title: 'Kund borttagen' });
    } catch (error: any) {
      toast({ title: 'Fel', description: error.message, variant: 'destructive' });
    }
  };

  const addInteraction = async (interaction: Omit<CustomerInteraction, 'id' | 'organization_id' | 'user_id' | 'created_at'>) => {
    if (!user || !organizationId) return;
    try {
      const { data, error } = await supabase
        .from('customer_interactions' as any)
        .insert({
          ...interaction,
          organization_id: organizationId,
          user_id: user.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      setInteractions(prev => [data as any, ...prev]);
      toast({ title: 'Interaktion loggad' });
      return data as any as CustomerInteraction;
    } catch (error: any) {
      toast({ title: 'Fel', description: error.message, variant: 'destructive' });
    }
  };

  return {
    customers,
    interactions,
    loading,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addInteraction,
    loadInteractions,
    loadCustomers,
  };
};
