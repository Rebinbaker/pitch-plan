-- Add missing fields to teams table
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS leader TEXT,
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Internt',
ADD COLUMN IF NOT EXISTS current_job TEXT,
ADD COLUMN IF NOT EXISTS performance_notes TEXT,
ADD COLUMN IF NOT EXISTS contact_info TEXT,
ADD COLUMN IF NOT EXISTS members JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS sellers JSONB DEFAULT '[]';

-- Add missing size field to files table
ALTER TABLE public.files 
ADD COLUMN IF NOT EXISTS size INTEGER DEFAULT 0;