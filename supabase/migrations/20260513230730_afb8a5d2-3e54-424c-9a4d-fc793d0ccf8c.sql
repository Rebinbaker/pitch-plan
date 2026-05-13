-- Create resources table for external contacts (suppliers, transporters, electricians etc.)
CREATE TABLE public.resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  company TEXT,
  resource_types TEXT[] NOT NULL DEFAULT '{}',
  counties TEXT[] NOT NULL DEFAULT '{}',
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  website TEXT,
  notes TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  rating NUMERIC,
  times_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization members can view resources"
ON public.resources FOR SELECT
USING (is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can create resources"
ON public.resources FOR INSERT
WITH CHECK (is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can update resources"
ON public.resources FOR UPDATE
USING (is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Admins can delete resources"
ON public.resources FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_resources_updated_at
BEFORE UPDATE ON public.resources
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_resources_org ON public.resources(organization_id);
CREATE INDEX idx_resources_counties ON public.resources USING GIN(counties);
CREATE INDEX idx_resources_types ON public.resources USING GIN(resource_types);