ALTER TABLE public.scaffolding_jobs
  ADD COLUMN IF NOT EXISTS ai_visualization_path text,
  ADD COLUMN IF NOT EXISTS ai_visualized_at timestamptz;