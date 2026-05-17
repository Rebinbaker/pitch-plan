
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS scaffolding_team_id uuid;

CREATE TABLE public.scaffolding_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE,
  organization_id uuid NOT NULL,
  booked_at timestamptz,
  booked_by uuid,
  booked_note text,
  transport_booked_at timestamptz,
  transport_booked_by uuid,
  transport_booked_note text,
  assembled_at timestamptz,
  assembled_by uuid,
  assembled_note text,
  assembled_photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scaffolding_confirmations ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user a member of the scaffolding team assigned to this project?
CREATE OR REPLACE FUNCTION public.is_project_scaffolder(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.teams t ON t.id = p.scaffolding_team_id
    WHERE p.id = _project_id
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(t.members, '[]'::jsonb)) m
        WHERE (m->>'user_id')::uuid = _user_id
      )
  )
$$;

CREATE POLICY "Org members can view scaffolding confirmations"
  ON public.scaffolding_confirmations FOR SELECT
  USING (is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Scaffolders or admins can insert"
  ON public.scaffolding_confirmations FOR INSERT
  WITH CHECK (
    is_organization_member(auth.uid(), organization_id)
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR public.is_project_scaffolder(auth.uid(), project_id)
    )
  );

CREATE POLICY "Scaffolders or admins can update"
  ON public.scaffolding_confirmations FOR UPDATE
  USING (
    is_organization_member(auth.uid(), organization_id)
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR public.is_project_scaffolder(auth.uid(), project_id)
    )
  );

CREATE POLICY "Admins can delete scaffolding confirmations"
  ON public.scaffolding_confirmations FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_scaffolding_confirmations_updated_at
  BEFORE UPDATE ON public.scaffolding_confirmations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_scaffolding_confirmations_project ON public.scaffolding_confirmations(project_id);
CREATE INDEX idx_projects_scaffolding_team ON public.projects(scaffolding_team_id);
