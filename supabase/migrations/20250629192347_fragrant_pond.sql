/*
  # Create review request templates table

  1. New Tables
    - `review_request_templates`
      - `id` (uuid, primary key)
      - `user_id` (uuid, nullable, references users) - null for global templates
      - `name` (text, not null)
      - `template_type` (text, not null, with check constraint)
      - `message_template` (text, not null)
      - `description` (text, nullable)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on review_request_templates table
    - Add policies for authenticated users to view global and their own templates
    - Add policies for super admins to manage all templates

  3. Default Templates
    - Insert default AI-integrated and simple thank you templates
*/

-- Create review_request_templates table
CREATE TABLE IF NOT EXISTS review_request_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  name text NOT NULL,
  template_type text NOT NULL CHECK (template_type IN ('ai_integrated', 'simple_thank_you')),
  message_template text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE review_request_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can view global and own templates"
  ON review_request_templates
  FOR SELECT
  TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid() OR is_super_admin());

CREATE POLICY "Super admins can manage all templates"
  ON review_request_templates
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Create indexes for better performance
CREATE INDEX review_request_templates_user_id_idx ON review_request_templates(user_id);
CREATE INDEX review_request_templates_template_type_idx ON review_request_templates(template_type);

-- Insert default global templates
INSERT INTO review_request_templates (user_id, name, template_type, message_template, description) VALUES
(
  NULL,
  'AI-Powered Review Request',
  'ai_integrated',
  'Hello {patient_name},

We hope you had a satisfying experience with the services at {clinic_name}. Your feedback is highly valuable to us, and we would greatly appreciate it if you could share your review.

Your visit details:
📅 Date: {visit_date}
🏥 Name of Center: {clinic_name}
📍 Location: {clinic_address}

Here''s a suggested review based on your visit:

{ai_review_text}

You can submit your review here: {gmb_link}

Best regards,
Team {clinic_name}
📞 {contact_phone}',
  'AI-generated review suggestion with GMB link in one message'
),
(
  NULL,
  'Simple Thank You & Review Link',
  'simple_thank_you',
  'Hello {patient_name},

Thank you for choosing {clinic_name} for your healthcare needs. We hope you had a positive experience with our services.

Your visit details:
📅 Date: {visit_date}
🏥 Name of Center: {clinic_name}
📍 Location: {clinic_address}

We would greatly appreciate if you could take a moment to share your feedback and leave us a review: {gmb_link}

Your feedback helps us improve our services and assists other patients in making informed decisions.

Best regards,
Team {clinic_name}
📞 {contact_phone}',
  'Simple thank you message with review link'
);