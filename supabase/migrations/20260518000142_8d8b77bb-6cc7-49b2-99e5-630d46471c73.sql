
ALTER TABLE public.scaffolding_jobs
  DROP COLUMN IF EXISTS checklist,
  DROP COLUMN IF EXISTS photos,
  DROP COLUMN IF EXISTS safety_signed_at,
  DROP COLUMN IF EXISTS safety_signed_by,
  ADD COLUMN IF NOT EXISTS ai_analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_analyzed_at timestamptz,
  ADD COLUMN IF NOT EXISTS simple_checklist jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.peri_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  artnr text NOT NULL,
  name text NOT NULL,
  category text,
  unit text NOT NULL DEFAULT 'st',
  price_sek numeric,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, artnr)
);

ALTER TABLE public.peri_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view peri catalog"
  ON public.peri_catalog FOR SELECT
  USING (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Admins can insert peri catalog"
  ON public.peri_catalog FOR INSERT
  WITH CHECK (public.is_organization_member(auth.uid(), organization_id) AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update peri catalog"
  ON public.peri_catalog FOR UPDATE
  USING (public.is_organization_member(auth.uid(), organization_id) AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete peri catalog"
  ON public.peri_catalog FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER peri_catalog_updated_at
  BEFORE UPDATE ON public.peri_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_peri_catalog_org_active ON public.peri_catalog (organization_id, active);
