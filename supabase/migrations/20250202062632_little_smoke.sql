/*
  # Create sequence messages table

  1. New Tables
    - `sequence_messages`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `profile_id` (uuid)
      - `patient_name` (text)
      - `whatsapp_number` (text)
      - `scheduled_date` (date)
      - `message_content` (text)
      - `status` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `sequence_messages` table
    - Add policies for authenticated users to manage their own messages
*/

-- Create sequence_messages table
CREATE TABLE IF NOT EXISTS sequence_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  profile_id uuid NOT NULL,
  patient_name text NOT NULL,
  whatsapp_number text NOT NULL,
  scheduled_date date NOT NULL,
  message_content text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE sequence_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can view their own sequence messages"
  ON sequence_messages
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own sequence messages"
  ON sequence_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own sequence messages"
  ON sequence_messages
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own sequence messages"
  ON sequence_messages
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create index for better performance
CREATE INDEX sequence_messages_user_id_idx ON sequence_messages(user_id);
CREATE INDEX sequence_messages_profile_id_idx ON sequence_messages(profile_id);