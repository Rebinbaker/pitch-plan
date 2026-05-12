ALTER TABLE public.scaffolding
ADD COLUMN IF NOT EXISTS last_project_name text,
ADD COLUMN IF NOT EXISTS last_project_location text,
ADD COLUMN IF NOT EXISTS last_released_at timestamp with time zone;