-- Fas 1: Ställningsprojektering — datamodell

-- 1. Sektioner per projekt
CREATE TABLE public.scaffolding_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  length_m numeric,
  height_m numeric,
  eave_height_m numeric,
  width_m numeric DEFAULT 0.67,
  work_levels integer DEFAULT 1,
  lift_height_m numeric DEFAULT 2.0,
  ground_condition text,
  anchoring text,
  bridging jsonb DEFAULT '{}'::jsonb,
  obstacles jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scaffolding_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view sections"
  ON public.scaffolding_sections FOR SELECT
  USING (is_organization_member(auth.uid(), organization_id));
CREATE POLICY "Scaffolders or admins can insert sections"
  ON public.scaffolding_sections FOR INSERT
  WITH CHECK (is_organization_member(auth.uid(), organization_id)
    AND (has_role(auth.uid(), 'admin'::app_role) OR is_project_scaffolder(auth.uid(), project_id)));
CREATE POLICY "Scaffolders or admins can update sections"
  ON public.scaffolding_sections FOR UPDATE
  USING (is_organization_member(auth.uid(), organization_id)
    AND (has_role(auth.uid(), 'admin'::app_role) OR is_project_scaffolder(auth.uid(), project_id)));
CREATE POLICY "Scaffolders or admins can delete sections"
  ON public.scaffolding_sections FOR DELETE
  USING (is_organization_member(auth.uid(), organization_id)
    AND (has_role(auth.uid(), 'admin'::app_role) OR is_project_scaffolder(auth.uid(), project_id)));

CREATE TRIGGER update_scaffolding_sections_updated_at
  BEFORE UPDATE ON public.scaffolding_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_scaffolding_sections_project ON public.scaffolding_sections(project_id);

-- 2. Mätlinjer på bild
CREATE TABLE public.scaffolding_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  section_id uuid REFERENCES public.scaffolding_sections(id) ON DELETE SET NULL,
  photo_url text NOT NULL,
  type text NOT NULL, -- calibration|length|height|eave|obstacle|bridging|level_diff
  meters numeric,
  px_length numeric,
  coords jsonb NOT NULL DEFAULT '{}'::jsonb, -- {x1,y1,x2,y2} or {x,y,w,h}
  comment text,
  confidence numeric,
  source text NOT NULL DEFAULT 'manual', -- manual|ai
  reference_label text, -- e.g. 'door_2.10','window_1.20'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scaffolding_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view measurements"
  ON public.scaffolding_measurements FOR SELECT
  USING (is_organization_member(auth.uid(), organization_id));
CREATE POLICY "Scaffolders or admins can insert measurements"
  ON public.scaffolding_measurements FOR INSERT
  WITH CHECK (is_organization_member(auth.uid(), organization_id)
    AND (has_role(auth.uid(), 'admin'::app_role) OR is_project_scaffolder(auth.uid(), project_id)));
CREATE POLICY "Scaffolders or admins can update measurements"
  ON public.scaffolding_measurements FOR UPDATE
  USING (is_organization_member(auth.uid(), organization_id)
    AND (has_role(auth.uid(), 'admin'::app_role) OR is_project_scaffolder(auth.uid(), project_id)));
CREATE POLICY "Scaffolders or admins can delete measurements"
  ON public.scaffolding_measurements FOR DELETE
  USING (is_organization_member(auth.uid(), organization_id)
    AND (has_role(auth.uid(), 'admin'::app_role) OR is_project_scaffolder(auth.uid(), project_id)));

CREATE TRIGGER update_scaffolding_measurements_updated_at
  BEFORE UPDATE ON public.scaffolding_measurements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_scaffolding_measurements_project ON public.scaffolding_measurements(project_id);
CREATE INDEX idx_scaffolding_measurements_section ON public.scaffolding_measurements(section_id);

-- 3. Utöka scaffolding_jobs
ALTER TABLE public.scaffolding_jobs
  ADD COLUMN IF NOT EXISTS project_status text NOT NULL DEFAULT 'not_analyzed',
  ADD COLUMN IF NOT EXISTS material_lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS manual_overrides jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS overlay_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS checklist_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS calibration jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 4. Lägg till rule_mapping på peri_catalog
ALTER TABLE public.peri_catalog
  ADD COLUMN IF NOT EXISTS rule_mapping jsonb NOT NULL DEFAULT '{}'::jsonb;
