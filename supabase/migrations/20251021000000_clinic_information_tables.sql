-- Create clinic_information table
CREATE TABLE IF NOT EXISTS clinic_information (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_name VARCHAR(255) NOT NULL,
  clinic_address TEXT,
  clinic_phone VARCHAR(20),
  clinic_email VARCHAR(255),
  clinic_website VARCHAR(255),
  gmb_link TEXT,
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#10B981',
  secondary_color VARCHAR(7) DEFAULT '#6366F1',
  business_hours JSONB DEFAULT '{}',
  specializations TEXT[],
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sequence_themes table for AI template generation
CREATE TABLE IF NOT EXISTS sequence_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_name VARCHAR(255) NOT NULL,
  theme_description TEXT,
  profile_type VARCHAR(100) NOT NULL,
  language VARCHAR(10) NOT NULL DEFAULT 'en',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sequence_templates_ai table (enhanced version)
CREATE TABLE IF NOT EXISTS sequence_templates_ai (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_id UUID REFERENCES sequence_themes(id) ON DELETE CASCADE,
  message_template TEXT NOT NULL,
  sequence_days INTEGER NOT NULL,
  sequence_order INTEGER NOT NULL,
  profile_type VARCHAR(100) NOT NULL,
  language VARCHAR(10) NOT NULL DEFAULT 'en',
  tone VARCHAR(50) DEFAULT 'professional',
  max_words INTEGER DEFAULT 300,
  placeholders JSONB DEFAULT '{}', -- stores available placeholders
  is_active BOOLEAN DEFAULT true,
  generated_by VARCHAR(50) DEFAULT 'ai', -- 'ai', 'manual', 'imported'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clinic_information_user_id ON clinic_information(user_id);
CREATE INDEX IF NOT EXISTS idx_sequence_themes_user_id ON sequence_themes(user_id);
CREATE INDEX IF NOT EXISTS idx_sequence_themes_profile_type ON sequence_themes(profile_type);
CREATE INDEX IF NOT EXISTS idx_sequence_themes_language ON sequence_themes(language);
CREATE INDEX IF NOT EXISTS idx_sequence_templates_ai_user_id ON sequence_templates_ai(user_id);
CREATE INDEX IF NOT EXISTS idx_sequence_templates_ai_theme_id ON sequence_templates_ai(theme_id);
CREATE INDEX IF NOT EXISTS idx_sequence_templates_ai_profile_type ON sequence_templates_ai(profile_type);
CREATE INDEX IF NOT EXISTS idx_sequence_templates_ai_language ON sequence_templates_ai(language);
CREATE INDEX IF NOT EXISTS idx_sequence_templates_ai_sequence_order ON sequence_templates_ai(sequence_order);

-- Add unique constraints
ALTER TABLE clinic_information ADD CONSTRAINT unique_clinic_per_user UNIQUE(user_id);
ALTER TABLE sequence_themes ADD CONSTRAINT unique_theme_per_user_profile UNIQUE(user_id, theme_name, profile_type);
ALTER TABLE sequence_templates_ai ADD CONSTRAINT unique_template_order UNIQUE(theme_id, sequence_order);

-- Add check constraints
ALTER TABLE sequence_templates_ai ADD CONSTRAINT check_sequence_days_positive CHECK (sequence_days > 0);
ALTER TABLE sequence_templates_ai ADD CONSTRAINT check_sequence_order_positive CHECK (sequence_order > 0);
ALTER TABLE sequence_templates_ai ADD CONSTRAINT check_max_words_reasonable CHECK (max_words > 0 AND max_words <= 1000);

-- Create RLS policies
ALTER TABLE clinic_information ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_templates_ai ENABLE ROW LEVEL SECURITY;

-- Clinic information policies
CREATE POLICY "Users can view own clinic information" ON clinic_information
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clinic information" ON clinic_information
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clinic information" ON clinic_information
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clinic information" ON clinic_information
  FOR DELETE USING (auth.uid() = user_id);

-- Sequence themes policies
CREATE POLICY "Users can view own sequence themes" ON sequence_themes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sequence themes" ON sequence_themes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sequence themes" ON sequence_themes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sequence themes" ON sequence_themes
  FOR DELETE USING (auth.uid() = user_id);

-- Sequence templates AI policies
CREATE POLICY "Users can view own sequence templates" ON sequence_templates_ai
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sequence templates" ON sequence_templates_ai
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sequence templates" ON sequence_templates_ai
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sequence templates" ON sequence_templates_ai
  FOR DELETE USING (auth.uid() = user_id);

-- Insert sample data (optional - for testing)
INSERT INTO clinic_information (user_id, clinic_name, clinic_address, clinic_phone, clinic_email, description, specializations)
VALUES 
  (gen_random_uuid(), 'Article Pathology Laboratory', 'Loft Garden, 105, near Eulogia Hotel Road, Gota, Ahmedabad, Gujarat 382481', '+91-79-1234-5678', 'info@articlepathology.com', 'Leading pathology laboratory providing comprehensive diagnostic services', ARRAY['Pathology', 'Diagnostics', 'Blood Tests', 'Radiology'])
ON CONFLICT DO NOTHING;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clinic_information_updated_at BEFORE UPDATE ON clinic_information
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sequence_themes_updated_at BEFORE UPDATE ON sequence_themes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sequence_templates_ai_updated_at BEFORE UPDATE ON sequence_templates_ai
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();