-- Add GPS coordinates and photo verification to time_entries table
ALTER TABLE public.time_entries 
ADD COLUMN gps_latitude DECIMAL(10, 8),
ADD COLUMN gps_longitude DECIMAL(11, 8),
ADD COLUMN location_address TEXT,
ADD COLUMN verification_photo_url TEXT,
ADD COLUMN location_verified BOOLEAN DEFAULT false,
ADD COLUMN photo_verified BOOLEAN DEFAULT false;