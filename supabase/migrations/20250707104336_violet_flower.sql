/*
  # Add user_id column to sequence_templates table

  1. Changes
    - Add user_id column to sequence_templates table
    - Make it nullable to support both global and user-specific templates
    - Add foreign key constraint to users table
    - Update RLS policies to support user-specific templates

  2. Security
    - Update RLS policies to allow users to create their own templates
    - Maintain read access to global templates (where user_id is NULL)
*/

-- Add user_id column to sequence_templates table
DO $$ 
BEGIN
  -- Check if column doesn't exist before adding it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sequence_templates' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE sequence_templates 
    ADD COLUMN user_id uuid REFERENCES users(id);
  END IF;
END $$;

-- Update RLS policies to support user-specific templates
DROP POLICY IF EXISTS "Users can view sequence templates" ON sequence_templates;

-- Users can view global templates (user_id IS NULL) and their own templates
CREATE POLICY "Users can view global and own sequence templates"
  ON sequence_templates
  FOR SELECT
  TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid() OR is_super_admin());

-- Users can insert their own templates
CREATE POLICY "Users can insert their own sequence templates"
  ON sequence_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_super_admin());

-- Users can update their own templates
CREATE POLICY "Users can update their own sequence templates"
  ON sequence_templates
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR is_super_admin())
  WITH CHECK (user_id = auth.uid() OR is_super_admin());

-- Users can delete their own templates
CREATE POLICY "Users can delete their own sequence templates"
  ON sequence_templates
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR is_super_admin());

-- Super admins can manage all templates
CREATE POLICY "Super admins can manage all sequence templates"
  ON sequence_templates
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Create index for better performance
CREATE INDEX IF NOT EXISTS sequence_templates_user_id_idx ON sequence_templates(user_id);