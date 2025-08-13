-- Drop existing policies for warranty templates storage
DROP POLICY IF EXISTS "Users can view warranty template files" ON storage.objects;
DROP POLICY IF EXISTS "Admin can upload warranty templates" ON storage.objects;

-- Create better storage policies for warranty templates
CREATE POLICY "Anyone can view warranty template files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'warranty-templates');

CREATE POLICY "Admin can upload warranty templates" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'warranty-templates' AND 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admin can delete warranty templates" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'warranty-templates' AND 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);