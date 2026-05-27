
-- 1. Extend app_role enum with new production roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'production_controller';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'scaffolding_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'container_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'construction_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'construction_team';

-- 2. Add role-specific JSONB columns to projects (all nullable / default empty)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS scaffolding_status jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS container_status   jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS construction_status jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS team_daily_status  jsonb NOT NULL DEFAULT '{"entries":[]}'::jsonb,
  ADD COLUMN IF NOT EXISTS risk_flags         jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 3. Security definer helper so we can scope construction-team users to their projects
CREATE OR REPLACE FUNCTION public.is_project_construction_team(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.teams t ON t.name = p.construction_team
      AND t.organization_id = p.organization_id
    WHERE p.id = _project_id
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(t.members, '[]'::jsonb)) m
        WHERE (m->>'user_id')::uuid = _user_id
      )
  )
$$;

-- 4. Enable realtime on projects so Oliver's dashboard updates live
ALTER TABLE public.projects REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'projects'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.projects';
  END IF;
END $$;
