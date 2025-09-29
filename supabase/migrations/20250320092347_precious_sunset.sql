/*
  # Update Creatives Structure for Global Categories
  
  1. Changes
    - Drop existing tables and their policies
    - Recreate creative_categories without user_id (making it global)
    - Recreate creatives table with user_id (keeping it user-specific)
    - Add proper RLS policies
    
  2. Security
    - Enable RLS on both tables
    - Global read access to categories for all authenticated users
    - User-specific access to creatives
*/

-- Drop existing tables and their dependencies
DROP TABLE IF EXISTS creatives CASCADE;
DROP TABLE IF EXISTS creative_categories CASCADE;

-- Create creative_categories table (global)
CREATE TABLE creative_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create creatives table (user-specific)
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

-- Create policies for creative_categories (global read access)
CREATE POLICY "Anyone can view categories"
  ON creative_categories
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for creatives (user-specific)
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
CREATE INDEX creatives_user_id_idx ON creatives(user_id);
CREATE INDEX creatives_category_id_idx ON creatives(category_id);
CREATE INDEX creatives_month_idx ON creatives(month);

-- Insert default global categories
INSERT INTO creative_categories (name, description) VALUES
  ('Social Media', 'Posts for social media platforms'),
  ('Banners', 'Promotional banners and posters'),
  ('Presentations', 'Slide decks and presentations'),
  ('Videos', 'Video content and animations'),
  ('Health Tips', 'Educational health content'),
  ('Lab Reports', 'Sample reports and formats'),
  ('Testimonials', 'Patient testimonials and reviews'),
  ('Announcements', 'Important updates and notices');

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
CROSS JOIN creative_categories c
WHERE u.contact_email = 'swastikcdckarwar@gmail.com'
  AND c.name = 'Presentations';