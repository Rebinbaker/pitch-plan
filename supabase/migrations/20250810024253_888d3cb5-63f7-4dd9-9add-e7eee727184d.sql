-- Create storage bucket for videos
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true);

-- Create RLS policies for video uploads
CREATE POLICY "Videos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'videos');

CREATE POLICY "Users can upload videos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'videos');

CREATE POLICY "Users can update videos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'videos');

CREATE POLICY "Users can delete videos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'videos');