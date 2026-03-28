
-- Create customers table
CREATE TABLE public.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  user_id uuid NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  city text,
  postal_code text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create customer_interactions table
CREATE TABLE public.customer_interactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  user_id uuid NOT NULL,
  interaction_type text NOT NULL DEFAULT 'note',
  subject text NOT NULL,
  description text,
  related_project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add customer_id to projects
ALTER TABLE public.projects ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_interactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for customers
CREATE POLICY "Organization members can view customers" ON public.customers FOR SELECT USING (is_organization_member(auth.uid(), organization_id));
CREATE POLICY "Organization members can create customers" ON public.customers FOR INSERT WITH CHECK (is_organization_member(auth.uid(), organization_id));
CREATE POLICY "Organization members can update customers" ON public.customers FOR UPDATE USING (is_organization_member(auth.uid(), organization_id));
CREATE POLICY "Organization members can delete customers" ON public.customers FOR DELETE USING (is_organization_member(auth.uid(), organization_id));

-- RLS policies for customer_interactions
CREATE POLICY "Organization members can view interactions" ON public.customer_interactions FOR SELECT USING (is_organization_member(auth.uid(), organization_id));
CREATE POLICY "Organization members can create interactions" ON public.customer_interactions FOR INSERT WITH CHECK (is_organization_member(auth.uid(), organization_id));
CREATE POLICY "Organization members can update interactions" ON public.customer_interactions FOR UPDATE USING (is_organization_member(auth.uid(), organization_id));
CREATE POLICY "Organization members can delete interactions" ON public.customer_interactions FOR DELETE USING (is_organization_member(auth.uid(), organization_id));

-- Updated_at triggers
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_interactions_updated_at BEFORE UPDATE ON public.customer_interactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
