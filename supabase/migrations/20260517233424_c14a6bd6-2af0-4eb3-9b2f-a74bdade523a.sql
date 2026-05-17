
-- 1. New table: scaffolding_jobs (one row per project for Michel's workflow)
CREATE TABLE IF NOT EXISTS public.scaffolding_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE,
  organization_id uuid NOT NULL,
  measurement jsonb NOT NULL DEFAULT '{}'::jsonb,
  material_spec jsonb NOT NULL DEFAULT '[]'::jsonb,
  order_status text NOT NULL DEFAULT 'draft',
  order_sent_at timestamptz,
  order_sent_to text,
  order_confirmed_at timestamptz,
  order_notes text,
  transport jsonb NOT NULL DEFAULT '{}'::jsonb,
  assigned_members jsonb NOT NULL DEFAULT '[]'::jsonb,
  dismantle jsonb NOT NULL DEFAULT '{}'::jsonb,
  documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  activity_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scaffolding_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view scaffolding jobs"
  ON public.scaffolding_jobs FOR SELECT
  USING (is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Scaffolders or admins can insert scaffolding jobs"
  ON public.scaffolding_jobs FOR INSERT
  WITH CHECK (
    is_organization_member(auth.uid(), organization_id)
    AND (has_role(auth.uid(), 'admin'::app_role) OR is_project_scaffolder(auth.uid(), project_id))
  );

CREATE POLICY "Scaffolders or admins can update scaffolding jobs"
  ON public.scaffolding_jobs FOR UPDATE
  USING (
    is_organization_member(auth.uid(), organization_id)
    AND (has_role(auth.uid(), 'admin'::app_role) OR is_project_scaffolder(auth.uid(), project_id))
  );

CREATE POLICY "Admins can delete scaffolding jobs"
  ON public.scaffolding_jobs FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_scaffolding_jobs_updated_at
  BEFORE UPDATE ON public.scaffolding_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Auto-create rows when a project is inserted
CREATE OR REPLACE FUNCTION public.create_scaffolding_rows_for_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.scaffolding_confirmations (project_id, organization_id)
  VALUES (NEW.id, NEW.organization_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.scaffolding_jobs (project_id, organization_id)
  VALUES (NEW.id, NEW.organization_id)
  ON CONFLICT (project_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_scaffolding_rows_on_project_insert ON public.projects;
CREATE TRIGGER create_scaffolding_rows_on_project_insert
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.create_scaffolding_rows_for_project();

-- 3. Backfill existing projects
INSERT INTO public.scaffolding_jobs (project_id, organization_id)
SELECT p.id, p.organization_id
FROM public.projects p
LEFT JOIN public.scaffolding_jobs sj ON sj.project_id = p.id
WHERE sj.id IS NULL;

INSERT INTO public.scaffolding_confirmations (project_id, organization_id)
SELECT p.id, p.organization_id
FROM public.projects p
LEFT JOIN public.scaffolding_confirmations sc ON sc.project_id = p.id
WHERE sc.id IS NULL;
