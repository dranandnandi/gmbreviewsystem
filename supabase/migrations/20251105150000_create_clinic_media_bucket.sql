-- Create storage bucket for clinic media uploads
-- This creates the 'clinic-media' bucket that the upload service expects

-- Create the clinic-media storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'clinic-media',
  'clinic-media', 
  true, -- public bucket so images can be displayed
  10485760, -- 10MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the clinic-media bucket
-- Policy 1: Anyone can view/download files (since bucket is public)
CREATE POLICY "Public Access for clinic-media" ON storage.objects
FOR SELECT USING (bucket_id = 'clinic-media');

-- Policy 2: Authenticated users can upload files
CREATE POLICY "Authenticated users can upload to clinic-media" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'clinic-media' 
  AND auth.role() = 'authenticated'
);

-- Policy 3: Users can update their own files
CREATE POLICY "Users can update own files in clinic-media" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'clinic-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
) WITH CHECK (
  bucket_id = 'clinic-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: Users can delete their own files
CREATE POLICY "Users can delete own files in clinic-media" ON storage.objects
FOR DELETE USING (
  bucket_id = 'clinic-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);