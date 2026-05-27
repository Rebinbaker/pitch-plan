ALTER TABLE public.worker_check_ins
  ADD COLUMN IF NOT EXISTS regular_hours NUMERIC,
  ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC,
  ADD COLUMN IF NOT EXISTS regular_pay NUMERIC,
  ADD COLUMN IF NOT EXISTS overtime_pay NUMERIC,
  ADD COLUMN IF NOT EXISTS overtime_hourly_rate_snapshot NUMERIC;