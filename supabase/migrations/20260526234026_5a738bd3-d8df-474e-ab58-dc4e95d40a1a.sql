-- 1. Extend worker_check_ins
ALTER TABLE public.worker_check_ins
  ADD COLUMN IF NOT EXISTS checkout_reason TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS auto_checkout_triggered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS device_id TEXT;

-- 2. Extend worker_absence_periods
ALTER TABLE public.worker_absence_periods
  ADD COLUMN IF NOT EXISTS auto_checkout_triggered BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS warning_sent_at TIMESTAMPTZ;

-- 3. random_presence_verifications
CREATE TABLE IF NOT EXISTS public.random_presence_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  check_in_id UUID NOT NULL,
  project_id UUID NOT NULL,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|passed|missed|failed
  selfie_url TEXT,
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  gps_accuracy NUMERIC,
  distance_from_project_m NUMERIC,
  failure_reason TEXT,
  device_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rpv_check_in ON public.random_presence_verifications(check_in_id);
CREATE INDEX IF NOT EXISTS idx_rpv_user_day ON public.random_presence_verifications(user_id, triggered_at);

GRANT SELECT, INSERT, UPDATE ON public.random_presence_verifications TO authenticated;
GRANT ALL ON public.random_presence_verifications TO service_role;
ALTER TABLE public.random_presence_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view rpv" ON public.random_presence_verifications
  FOR SELECT TO authenticated USING (is_organization_member(auth.uid(), organization_id));
CREATE POLICY "Workers insert own rpv" ON public.random_presence_verifications
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND is_organization_member(auth.uid(), organization_id));
CREATE POLICY "Workers update own rpv" ON public.random_presence_verifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "Admins update rpv" ON public.random_presence_verifications
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. user_devices
CREATE TABLE IF NOT EXISTS public.user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  device_id TEXT NOT NULL,
  device_name TEXT,
  platform TEXT NOT NULL DEFAULT 'web',
  app_version TEXT,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  last_seen_at TIMESTAMPTZ,
  approved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS user_devices_one_approved
  ON public.user_devices(user_id) WHERE status = 'approved';

GRANT SELECT, INSERT, UPDATE ON public.user_devices TO authenticated;
GRANT ALL ON public.user_devices TO service_role;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view devices" ON public.user_devices
  FOR SELECT TO authenticated USING (is_organization_member(auth.uid(), organization_id));
CREATE POLICY "Users insert own device" ON public.user_devices
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND is_organization_member(auth.uid(), organization_id));
CREATE POLICY "Users update own device last_seen" ON public.user_devices
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins manage devices" ON public.user_devices
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. helper function
CREATE OR REPLACE FUNCTION public.is_device_approved(_user_id UUID, _device_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_devices
    WHERE user_id = _user_id AND device_id = _device_id AND status = 'approved'
  )
$$;