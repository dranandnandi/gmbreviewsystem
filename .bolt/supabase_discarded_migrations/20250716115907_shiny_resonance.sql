/*
  # Fix sequence_templates INSERT policy for AI template generation

  1. Policy Updates
    - Drop existing restrictive INSERT policy
    - Create new INSERT policy that allows:
      - Users to insert their own templates (user_id = uid())
      - Super admins to insert any templates (including global ones)
      - Admins to insert global templates (user_id IS NULL)

  2. Security
    - Maintains RLS protection
    - Allows proper template creation for all user roles
    - Supports both personal and global template creation
*/

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can insert their own sequence templates" ON sequence_templates;

-- Create new INSERT policy that supports AI template generation
CREATE POLICY "Allow template insertion for users and admins"
  ON sequence_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Users can insert their own templates
    (user_id = uid()) OR 
    -- Super admins can insert any templates (including global ones)
    is_super_admin() OR
    -- Admins can insert global templates
    (user_id IS NULL AND (
      SELECT role FROM users WHERE auth_id = uid()
    ) IN ('admin', 'super_admin'))
  );