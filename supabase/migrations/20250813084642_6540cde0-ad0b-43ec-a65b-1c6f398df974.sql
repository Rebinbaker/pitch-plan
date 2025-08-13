-- Update storage policy for generated-warranties to be more permissive
DROP POLICY IF EXISTS "Users can upload their generated warranties" ON storage.objects;

-- Create a more robust policy for uploading warranties
CREATE POLICY "Users can upload their generated warranties" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'generated-warranties' 
  AND auth.uid() IS NOT NULL 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Also ensure users can update files in their own folder
DROP POLICY IF EXISTS "Users can update their warranty files" ON storage.objects;

CREATE POLICY "Users can update their warranty files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'generated-warranties' 
  AND auth.uid() IS NOT NULL 
  AND (auth.uid())::text = (storage.foldername(name))[1]
) 
WITH CHECK (
  bucket_id = 'generated-warranties' 
  AND auth.uid() IS NOT NULL 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);