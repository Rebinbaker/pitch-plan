-- Add material_order column to projects table to store material orders
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS material_order jsonb DEFAULT null;

COMMENT ON COLUMN public.projects.material_order IS 'Stores the material order data including items, status, and metadata';