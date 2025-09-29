/*
  # Fix RLS policies for reports storage bucket

  1. Changes
    - Drop existing conflicting policies to ensure clean state
    - Create comprehensive RLS policies for authenticated users
    - Allow all CRUD operations on reports bucket for authenticated users
    - Set up proper bucket configuration with file limits and MIME types

  2. Security
    - Authenticated users can upload, view, update, and delete files in reports bucket
    - Public bucket access for easier file sharing
    - File size limit of 50MB per file
    - Restricted to specific MIME types for security
*/

-- Drop any existing policies for the 'reports' bucket to avoid conflicts
-- This ensures we start with a clean slate
DROP POLICY IF EXISTS "Allow authenticated uploads to reports bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads from reports bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from reports bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to reports bucket" ON storage.objects;

-- Policy to allow authenticated users to upload files to the 'reports' bucket
-- This policy permits INSERT operations for any authenticated user into the 'reports' bucket.
CREATE POLICY "Allow authenticated uploads to reports bucket"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'reports');

-- Policy to allow authenticated users to view files in the 'reports' bucket
-- This policy permits SELECT operations for any authenticated user from the 'reports' bucket.
CREATE POLICY "Allow authenticated reads from reports bucket"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'reports');

-- Policy to allow authenticated users to delete files from the 'reports' bucket
-- This policy permits DELETE operations for any authenticated user from the 'reports' bucket.
CREATE POLICY "Allow authenticated deletes from reports bucket"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'reports');

-- Policy to allow authenticated users to update files in the 'reports' bucket
-- This policy permits UPDATE operations for any authenticated user in the 'reports' bucket.
CREATE POLICY "Allow authenticated updates to reports bucket"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'reports');

-- Ensure the 'reports' bucket exists and is configured as public.
-- This statement creates the bucket if it doesn't exist, or updates its properties
-- if it does, ensuring it's public and has the specified file size and MIME type limits.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reports', 
  'reports', 
  true, -- Set to true to make the bucket publicly accessible for reads
  52428800, -- 50MB file size limit (in bytes)
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];