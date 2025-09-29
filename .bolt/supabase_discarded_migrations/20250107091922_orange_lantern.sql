/*
  # Add review templates table

  1. New Tables
    - `review_templates`
      - `id` (uuid, primary key)
      - `template` (text, the review template text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `review_templates` table
    - Add policy for authenticated users to read templates
    - Add policy for admins to modify templates
*/

CREATE TABLE IF NOT EXISTS review_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE review_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view review templates"
  ON review_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify review templates"
  ON review_templates FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ));

-- Insert default templates
INSERT INTO review_templates (template) VALUES
  ('My visit to [Clinic Name] on [Date of Visit] with Dr. [Doctor''s Name] was exceptional. Their compassionate approach and clear explanations reassured me throughout my [Treatment/Service]. Highly recommended!'),
  ('Dr. [Doctor''s Name] at [Clinic Name] provided outstanding care during my [Treatment/Service] on [Date of Visit]. The clinic''s welcoming environment and attention to detail made all the difference.'),
  ('I had an excellent experience at [Clinic Name] on [Date of Visit]. Dr. [Doctor''s Name] was attentive and explained my [Treatment/Service] thoroughly, ensuring I felt comfortable throughout.'),
  ('During my visit to [Clinic Name] on [Date of Visit], Dr. [Doctor''s Name] demonstrated expertise and genuine care during my [Treatment/Service]. The professionalism was truly commendable.'),
  ('[Clinic Name] exceeded my expectations during my [Treatment/Service] on [Date of Visit] with Dr. [Doctor''s Name]. Their attention to detail and compassionate approach were outstanding.');