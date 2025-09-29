/*
  # Add Creatives Management Structure
  
  1. New Tables
    - `creative_categories` - For organizing creatives by type
    - `creatives` - Main table for storing creative content
    
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create creative_categories table
CREATE TABLE creative_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Create creatives table
CREATE TABLE creatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  category_id uuid REFERENCES creative_categories(id) NOT NULL,
  title text NOT NULL,
  description text,
  content_type text NOT NULL CHECK (content_type IN ('image', 'video', 'iframe', 'link')),
  content text NOT NULL,
  thumbnail_url text,
  month date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE creative_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE creatives ENABLE ROW LEVEL SECURITY;

-- Create policies for creative_categories
CREATE POLICY "Users can view their own categories"
  ON creative_categories
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own categories"
  ON creative_categories
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create policies for creatives
CREATE POLICY "Users can view their own creatives"
  ON creatives
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own creatives"
  ON creatives
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create indexes
CREATE INDEX creative_categories_user_id_idx ON creative_categories(user_id);
CREATE INDEX creatives_user_id_idx ON creatives(user_id);
CREATE INDEX creatives_category_id_idx ON creatives(category_id);
CREATE INDEX creatives_month_idx ON creatives(month);

-- Insert default categories for existing users
INSERT INTO creative_categories (user_id, name, description)
SELECT 
  id as user_id,
  unnest(ARRAY['Social Media', 'Banners', 'Presentations', 'Videos']) as name,
  unnest(ARRAY[
    'Posts for social media platforms',
    'Promotional banners and posters',
    'Slide decks and presentations',
    'Video content and animations'
  ]) as description
FROM users;

-- Insert sample creative for specific user
INSERT INTO creatives (
  user_id,
  category_id,
  title,
  description,
  content_type,
  content,
  month
)
SELECT 
  u.id as user_id,
  c.id as category_id,
  'Precision for a Healthier 2025',
  'Health awareness presentation',
  'iframe',
  '<iframe src="https://gamma.app/embed/bimp1ueuw5ahjsr" style="width: 700px; max-width: 100%; height: 450px" allow="fullscreen" title="Precision for a Healthier 2025"></iframe>',
  '2025-03-01'::date
FROM users u
JOIN creative_categories c ON c.user_id = u.id AND c.name = 'Presentations'
WHERE u.contact_email = 'swastikcdckarwar@gmail.com';