-- Create storage policies for time verification photos
-- Allow authenticated users to upload verification photos
CREATE POLICY "Users can upload verification photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'lokalahantverkarna' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = 'time-verification'
);

-- Allow users to view their own verification photos
CREATE POLICY "Users can view verification photos" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'lokalahantverkarna' 
  AND auth.uid() IS NOT NULL
);

-- Allow users to delete their own verification photos
CREATE POLICY "Users can delete verification photos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'lokalahantverkarna' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = 'time-verification'
);