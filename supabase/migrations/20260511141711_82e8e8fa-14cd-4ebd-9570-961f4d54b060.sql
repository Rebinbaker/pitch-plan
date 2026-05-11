CREATE TABLE public.regions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization members can view regions"
ON public.regions FOR SELECT
USING (is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can create regions"
ON public.regions FOR INSERT
WITH CHECK (is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can update regions"
ON public.regions FOR UPDATE
USING (is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can delete regions"
ON public.regions FOR DELETE
USING (is_organization_member(auth.uid(), organization_id));

-- Seed default regions for every existing organization, using any member as user_id
INSERT INTO public.regions (organization_id, user_id, name)
SELECT o.id, (SELECT om.user_id FROM public.organization_members om WHERE om.organization_id = o.id ORDER BY om.joined_at ASC LIMIT 1), r.name
FROM public.organizations o
CROSS JOIN (VALUES ('Stockholm'), ('Västra Götaland')) AS r(name)
WHERE EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = o.id)
ON CONFLICT (organization_id, name) DO NOTHING;