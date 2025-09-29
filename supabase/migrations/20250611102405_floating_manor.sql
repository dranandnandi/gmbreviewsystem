/*
  # Create Storage Bucket for Reports

  1. Storage Setup
    - Create 'reports' bucket for file uploads
    - Enable public access for file downloads
    - Set up RLS policies for secure access

  2. Security
    - Users can upload files to their own folders
    - Users can view their own uploaded files
    - Admin users can access all files
*/

-- Create the reports bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on the bucket
UPDATE storage.buckets 
SET public = true 
WHERE id = 'reports';

-- Create RLS policies for the reports bucket

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'reports' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own files
CREATE POLICY "Users can view their own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'reports' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'reports' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow super admins to access all files
CREATE POLICY "Super admins can access all files"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'reports' AND 
  EXISTS (
    SELECT 1 FROM users 
    WHERE auth_id = auth.uid() 
    AND role = 'super_admin'
  )
);