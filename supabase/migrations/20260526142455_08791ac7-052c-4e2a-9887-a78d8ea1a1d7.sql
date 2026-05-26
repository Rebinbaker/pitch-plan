
-- 1. Add fields to projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS geofence_radius_m INTEGER NOT NULL DEFAULT 50;

-- 2. Add fields to worker_check_ins
ALTER TABLE public.worker_check_ins
  ADD COLUMN IF NOT EXISTS gross_hours NUMERIC,
  ADD COLUMN IF NOT EXISTS absence_minutes NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_hours NUMERIC,
  ADD COLUMN IF NOT EXISTS auto_closed BOOLEAN NOT NULL DEFAULT false;

-- 3. worker_location_pings
CREATE TABLE IF NOT EXISTS public.worker_location_pings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  check_in_id UUID NOT NULL,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  accuracy_m NUMERIC,
  distance_m NUMERIC,
  inside_radius BOOLEAN NOT NULL DEFAULT true,
  is_mocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_worker_location_pings_checkin
  ON public.worker_location_pings(check_in_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_worker_location_pings_user
  ON public.worker_location_pings(user_id, recorded_at);

GRANT SELECT, INSERT ON public.worker_location_pings TO authenticated;
GRANT ALL ON public.worker_location_pings TO service_role;

ALTER TABLE public.worker_location_pings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers insert own pings"
  ON public.worker_location_pings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Org members view pings"
  ON public.worker_location_pings FOR SELECT TO authenticated
  USING (is_organization_member(auth.uid(), organization_id));

-- 4. worker_absence_periods
CREATE TABLE IF NOT EXISTS public.worker_absence_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  check_in_id UUID NOT NULL,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  left_at TIMESTAMPTZ NOT NULL,
  returned_at TIMESTAMPTZ,
  duration_minutes NUMERIC,
  reason TEXT,
  receipt_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_worker_absence_checkin
  ON public.worker_absence_periods(check_in_id);
CREATE INDEX IF NOT EXISTS idx_worker_absence_status
  ON public.worker_absence_periods(organization_id, status);

GRANT SELECT, INSERT, UPDATE ON public.worker_absence_periods TO authenticated;
GRANT ALL ON public.worker_absence_periods TO service_role;

ALTER TABLE public.worker_absence_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view absences"
  ON public.worker_absence_periods FOR SELECT TO authenticated
  USING (is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Workers insert own absences"
  ON public.worker_absence_periods FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Workers update own pending absences"
  ON public.worker_absence_periods FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Admins update absences"
  ON public.worker_absence_periods FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_absence_updated_at
  BEFORE UPDATE ON public.worker_absence_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
