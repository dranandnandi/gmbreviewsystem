/*
  # Fix Storage RLS Policies for File Upload
  
  1. Changes
    - Create storage bucket for reports if it doesn't exist
    - Set up proper RLS policies for authenticated users to upload files
    - Allow users to manage their own files in the reports bucket
    
  2. Security
    - Users can only upload files to folders named with their user ID
    - Users can only access files they uploaded themselves
*/

-- Create the reports bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reports', 
  'reports', 
  false, 
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

-- Create storage policies using Supabase's policy functions
-- Policy for uploading files (users can upload to their own folder)
CREATE POLICY "Users can upload to reports bucket"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'reports' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Policy for viewing files (users can view their own files)
CREATE POLICY "Users can view own files in reports bucket"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'reports' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Policy for updating files (users can update their own files)
CREATE POLICY "Users can update own files in reports bucket"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'reports' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Policy for deleting files (users can delete their own files)
CREATE POLICY "Users can delete own files in reports bucket"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'reports' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);