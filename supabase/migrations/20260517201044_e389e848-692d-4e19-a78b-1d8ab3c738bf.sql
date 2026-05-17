
ALTER TABLE public.worker_check_ins ADD COLUMN IF NOT EXISTS check_in_photo_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('worker-checkin-photos', 'worker-checkin-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Workers upload own checkin photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'worker-checkin-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Workers view own checkin photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'worker-checkin-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins view all checkin photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'worker-checkin-photos'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Admins delete checkin photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'worker-checkin-photos'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);
