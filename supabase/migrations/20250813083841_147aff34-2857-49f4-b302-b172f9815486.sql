-- Drop the existing foreign key constraint and recreate it with CASCADE
ALTER TABLE generated_warranties 
DROP CONSTRAINT IF EXISTS generated_warranties_template_id_fkey;

-- Add the foreign key constraint back with CASCADE DELETE
ALTER TABLE generated_warranties 
ADD CONSTRAINT generated_warranties_template_id_fkey 
FOREIGN KEY (template_id) 
REFERENCES warranty_templates(id) 
ON DELETE CASCADE;