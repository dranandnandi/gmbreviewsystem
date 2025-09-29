/*
  # Create report requests table and update user roles

  1. New Tables
    - `report_requests`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `patient_name` (text, not null)
      - `request_date` (timestamptz, default now())
      - `report_type` (text, not null, with check constraint)
      - `summary_language` (text, nullable)
      - `status` (text, not null, with check constraint)
      - `uploaded_report_urls` (jsonb, nullable)
      - `generated_report_url` (text, nullable)
      - `notes` (text, nullable)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Updates
    - Update users table role constraint to include 'super_admin'

  3. Security
    - Enable RLS on `report_requests` table
    - Add policies for regular users (own data only)
    - Add policies for super admins (all data access)
    - Update other tables to allow super admin access
*/

-- Update users table role constraint to include super_admin
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'receptionist', 'super_admin'));

-- Create report_requests table
CREATE TABLE IF NOT EXISTS report_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  patient_name text NOT NULL,
  request_date timestamptz DEFAULT now(),
  report_type text NOT NULL CHECK (report_type IN ('smart_report', 'trend_analysis', 'longitivity_report')),
  summary_language text,
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  uploaded_report_urls jsonb,
  generated_report_url text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE report_requests ENABLE ROW LEVEL SECURITY;

-- Create helper function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE auth_id = auth.uid() 
    AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for report_requests

-- Regular users can view their own report requests
CREATE POLICY "Users can view their own report requests"
  ON report_requests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_super_admin());

-- Regular users can insert their own report requests
CREATE POLICY "Users can insert their own report requests"
  ON report_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_super_admin());

-- Regular users can update their own report requests, super admins can update all
CREATE POLICY "Users can update report requests"
  ON report_requests
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR is_super_admin())
  WITH CHECK (user_id = auth.uid() OR is_super_admin());

-- Only super admins can delete report requests
CREATE POLICY "Super admins can delete report requests"
  ON report_requests
  FOR DELETE
  TO authenticated
  USING (is_super_admin());

-- Update existing tables to allow super admin access

-- Add super admin policies to users table
CREATE POLICY "Super admins can view all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admins can update all users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add super admin policies to appointments table
CREATE POLICY "Super admins can view all appointments"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admins can manage all appointments"
  ON appointments
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add super admin policies to reviews table
CREATE POLICY "Super admins can view all reviews"
  ON reviews
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admins can manage all reviews"
  ON reviews
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add super admin policies to sequence_messages table
CREATE POLICY "Super admins can view all sequence messages"
  ON sequence_messages
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admins can manage all sequence messages"
  ON sequence_messages
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add super admin policies to creatives table
CREATE POLICY "Super admins can view all creatives"
  ON creatives
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admins can manage all creatives"
  ON creatives
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS report_requests_user_id_idx ON report_requests(user_id);
CREATE INDEX IF NOT EXISTS report_requests_status_idx ON report_requests(status);
CREATE INDEX IF NOT EXISTS report_requests_report_type_idx ON report_requests(report_type);
CREATE INDEX IF NOT EXISTS report_requests_request_date_idx ON report_requests(request_date);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_report_requests_updated_at
  BEFORE UPDATE ON report_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();