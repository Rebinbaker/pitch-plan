-- Test storage upload permissions for generated warranties
-- Create a more permissive policy temporarily for debugging
DROP POLICY IF EXISTS "Users can upload their generated warranties" ON storage.objects;

CREATE POLICY "Users can upload their generated warranties" ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'generated-warranties' AND 
  auth.uid() IS NOT NULL AND
  (auth.uid())::text = (storage.foldername(name))[1]
);