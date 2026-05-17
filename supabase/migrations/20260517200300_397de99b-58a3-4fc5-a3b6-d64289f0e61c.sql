-- Add 'worker' role to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'worker';

-- Create worker_check_ins table
CREATE TABLE public.worker_check_ins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  team_member_id TEXT,
  team_id UUID,
  project_id UUID NOT NULL,
  project_name TEXT,
  check_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  check_out_at TIMESTAMP WITH TIME ZONE,
  check_in_lat NUMERIC,
  check_in_lng NUMERIC,
  check_out_lat NUMERIC,
  check_out_lng NUMERIC,
  distance_km NUMERIC,
  hourly_rate_snapshot NUMERIC NOT NULL DEFAULT 0,
  duration_hours NUMERIC,
  wage_amount NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.worker_check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view check-ins"
  ON public.worker_check_ins FOR SELECT
  USING (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Workers can create their own check-ins"
  ON public.worker_check_ins FOR INSERT
  WITH CHECK (
    public.is_organization_member(auth.uid(), organization_id)
    AND user_id = auth.uid()
  );

CREATE POLICY "Workers can update their own check-ins"
  ON public.worker_check_ins FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can delete check-ins"
  ON public.worker_check_ins FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER update_worker_check_ins_updated_at
  BEFORE UPDATE ON public.worker_check_ins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_worker_check_ins_user ON public.worker_check_ins(user_id, check_in_at DESC);
CREATE INDEX idx_worker_check_ins_project ON public.worker_check_ins(project_id);
CREATE INDEX idx_worker_check_ins_open ON public.worker_check_ins(user_id) WHERE check_out_at IS NULL;