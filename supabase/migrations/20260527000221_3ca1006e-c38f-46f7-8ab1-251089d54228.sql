
-- 1. Add motion_activity column to existing pings table
ALTER TABLE public.worker_location_pings
  ADD COLUMN IF NOT EXISTS motion_activity TEXT;

-- 2. stationary_device_flags
CREATE TABLE public.stationary_device_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  check_in_id UUID NOT NULL,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  project_id UUID NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('medium','high')),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_minutes NUMERIC,
  total_movement_m NUMERIC,
  gps_variance_m NUMERIC,
  avg_accuracy_m NUMERIC,
  accelerometer_activity TEXT,
  last_verification_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','verified_after_manual_check','legitimate','ignored','escalated')),
  admin_comment TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.stationary_device_flags TO authenticated;
GRANT ALL ON public.stationary_device_flags TO service_role;
ALTER TABLE public.stationary_device_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members view stationary flags" ON public.stationary_device_flags
  FOR SELECT TO authenticated USING (public.is_organization_member(auth.uid(), organization_id));
CREATE POLICY "Admins update stationary flags" ON public.stationary_device_flags
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE INDEX idx_stationary_flags_checkin ON public.stationary_device_flags(check_in_id);
CREATE INDEX idx_stationary_flags_status ON public.stationary_device_flags(status);

-- 3. manual_presence_verifications
CREATE TABLE public.manual_presence_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flag_id UUID,
  check_in_id UUID NOT NULL,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  project_id UUID NOT NULL,
  requested_by UUID,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','passed','missed','failed')),
  selfie_url TEXT,
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  gps_accuracy NUMERIC,
  distance_from_project_m NUMERIC,
  failure_reason TEXT,
  device_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.manual_presence_verifications TO authenticated;
GRANT ALL ON public.manual_presence_verifications TO service_role;
ALTER TABLE public.manual_presence_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members view mpv" ON public.manual_presence_verifications
  FOR SELECT TO authenticated USING (public.is_organization_member(auth.uid(), organization_id));
CREATE POLICY "Admins insert mpv" ON public.manual_presence_verifications
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Workers update own pending mpv" ON public.manual_presence_verifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "Admins update mpv" ON public.manual_presence_verifications
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE INDEX idx_mpv_user_pending ON public.manual_presence_verifications(user_id, status);
CREATE INDEX idx_mpv_flag ON public.manual_presence_verifications(flag_id);

-- 4. user_risk_scores
CREATE TABLE public.user_risk_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  organization_id UUID NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  last_event_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_risk_scores TO authenticated;
GRANT ALL ON public.user_risk_scores TO service_role;
ALTER TABLE public.user_risk_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members view risk scores" ON public.user_risk_scores
  FOR SELECT TO authenticated USING (public.is_organization_member(auth.uid(), organization_id));

-- 5. risk_score_events
CREATE TABLE public.risk_score_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  delta INTEGER NOT NULL,
  reason TEXT,
  related_flag_id UUID,
  related_verification_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.risk_score_events TO authenticated;
GRANT ALL ON public.risk_score_events TO service_role;
ALTER TABLE public.risk_score_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members view risk events" ON public.risk_score_events
  FOR SELECT TO authenticated USING (public.is_organization_member(auth.uid(), organization_id));
CREATE INDEX idx_risk_events_user ON public.risk_score_events(user_id, created_at DESC);
