-- Add avvarat_material column to projects table to store leftover material information
ALTER TABLE public.projects 
ADD COLUMN avvarat_material jsonb DEFAULT NULL;

-- Add a comment to document the column
COMMENT ON COLUMN public.projects.avvarat_material IS 'Stores information about leftover material including hasLeftoverMaterial, materials list, storage location, etc.';