/*
  # Fix uid() function reference in RLS policies

  1. Problem
    - The uid() function doesn't exist in Supabase
    - RLS policies are using uid() instead of auth.uid()

  2. Solution
    - Update all RLS policies to use auth.uid() instead of uid()
    - This applies to sequence_templates and other tables using uid()

  3. Security
    - Maintains the same security model
    - Uses the correct Supabase auth function
*/

-- Drop existing policies that use uid()
DROP POLICY IF EXISTS "Allow template insertion for users and admins" ON sequence_templates;
DROP POLICY IF EXISTS "Users can update their own sequence templates" ON sequence_templates;
DROP POLICY IF EXISTS "Users can delete their own sequence templates" ON sequence_templates;
DROP POLICY IF EXISTS "Users can view accessible sequence templates" ON sequence_templates;

-- Recreate policies with correct auth.uid() function
CREATE POLICY "Allow template insertion for users and admins"
  ON sequence_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (user_id = auth.uid()) OR 
    is_super_admin() OR 
    (
      (user_id IS NULL) AND 
      (
        SELECT users.role 
        FROM users 
        WHERE users.auth_id = auth.uid()
      ) = ANY (ARRAY['admin'::text, 'super_admin'::text])
    )
  );

CREATE POLICY "Users can update their own sequence templates"
  ON sequence_templates
  FOR UPDATE
  TO authenticated
  USING ((user_id = auth.uid()) OR is_super_admin())
  WITH CHECK ((user_id = auth.uid()) OR is_super_admin());

CREATE POLICY "Users can delete their own sequence templates"
  ON sequence_templates
  FOR DELETE
  TO authenticated
  USING ((user_id = auth.uid()) OR is_super_admin());

CREATE POLICY "Users can view accessible sequence templates"
  ON sequence_templates
  FOR SELECT
  TO authenticated
  USING (
    (
      (user_id IS NULL) AND (target_profile_type IS NULL)
    ) OR (
      (user_id IS NULL) AND 
      (target_profile_type IS NOT NULL) AND 
      user_has_profile_type(target_profile_type)
    ) OR (
      user_id = auth.uid()
    ) OR 
    is_super_admin()
  );

-- Fix other tables that might be using uid() instead of auth.uid()
-- Update users table policies
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Users can view their own data" ON users;

CREATE POLICY "Users can update their own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

CREATE POLICY "Users can view their own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

-- Update patient_profiles table policies
DROP POLICY IF EXISTS "Users can manage their own patient profiles" ON patient_profiles;
DROP POLICY IF EXISTS "Users can view their own patient profiles" ON patient_profiles;

CREATE POLICY "Users can manage their own patient profiles"
  ON patient_profiles
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()))
  WITH CHECK (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can view their own patient profiles"
  ON patient_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Update appointments table policies
DROP POLICY IF EXISTS "Users can manage their own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can view their own appointments" ON appointments;

CREATE POLICY "Users can manage their own appointments"
  ON appointments
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()))
  WITH CHECK (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can view their own appointments"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Update reviews table policies
DROP POLICY IF EXISTS "Users can insert their own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can view their own reviews" ON reviews;

CREATE POLICY "Users can insert their own reviews"
  ON reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update their own reviews"
  ON reviews
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()))
  WITH CHECK (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can delete their own reviews"
  ON reviews
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can view their own reviews"
  ON reviews
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Update sequence_messages table policies
DROP POLICY IF EXISTS "Users can insert their own sequence messages" ON sequence_messages;
DROP POLICY IF EXISTS "Users can update their own sequence messages" ON sequence_messages;
DROP POLICY IF EXISTS "Users can delete their own sequence messages" ON sequence_messages;
DROP POLICY IF EXISTS "Users can view their own sequence messages" ON sequence_messages;

CREATE POLICY "Users can insert their own sequence messages"
  ON sequence_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update their own sequence messages"
  ON sequence_messages
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()))
  WITH CHECK (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can delete their own sequence messages"
  ON sequence_messages
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can view their own sequence messages"
  ON sequence_messages
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Update creatives table policies
DROP POLICY IF EXISTS "Users can manage their own creatives" ON creatives;
DROP POLICY IF EXISTS "Users can view their own creatives" ON creatives;

CREATE POLICY "Users can manage their own creatives"
  ON creatives
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()))
  WITH CHECK (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can view their own creatives"
  ON creatives
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Update doctors table policies
DROP POLICY IF EXISTS "Users can manage their own doctors" ON doctors;
DROP POLICY IF EXISTS "Users can view their own doctors" ON doctors;

CREATE POLICY "Users can manage their own doctors"
  ON doctors
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()))
  WITH CHECK (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can view their own doctors"
  ON doctors
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));