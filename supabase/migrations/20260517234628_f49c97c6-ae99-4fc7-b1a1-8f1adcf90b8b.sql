ALTER TABLE public.scaffolding_jobs
  ADD COLUMN IF NOT EXISTS checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS photos jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS safety_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS safety_signed_by uuid,
  ADD COLUMN IF NOT EXISTS risk_level text NOT NULL DEFAULT 'green';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scaffolding_jobs_risk_level_check'
  ) THEN
    ALTER TABLE public.scaffolding_jobs
      ADD CONSTRAINT scaffolding_jobs_risk_level_check
      CHECK (risk_level IN ('green','yellow','red'));
  END IF;
END $$;