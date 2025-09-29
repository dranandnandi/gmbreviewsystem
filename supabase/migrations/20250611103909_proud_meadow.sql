/*
  # Disable RLS for Report Requests and Reports Storage

  1. Changes
    - Disable RLS on report_requests table
    - Drop all existing RLS policies for report_requests
    - Drop all existing RLS policies for storage.objects (reports bucket)
    - Create the reports bucket with public access

  2. Security
    - Remove all row-level security restrictions
    - Allow full access to report requests and file storage
*/

-- Disable RLS on report_requests table
ALTER TABLE report_requests DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies for report_requests
DROP POLICY IF EXISTS "Users can view their own report requests" ON report_requests;
DROP POLICY IF EXISTS "Users can insert their own report requests" ON report_requests;
DROP POLICY IF EXISTS "Users can update report requests" ON report_requests;
DROP POLICY IF EXISTS "Super admins can delete report requests" ON report_requests;

-- Drop all existing policies for storage.objects (reports bucket)
DROP POLICY IF EXISTS "Users can upload to reports bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own files in reports bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files in reports bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files in reports bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Super admins can access all files" ON storage.objects;

-- Create the reports bucket with public access
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reports', 
  'reports', 
  true, -- Make bucket public
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];