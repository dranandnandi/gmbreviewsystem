/*
  # Update user role to admin
  
  1. Changes
    - Updates the role of user with email dranand@thedoctorpreneuracademy.com to 'admin'
  
  2. Security
    - Maintains existing RLS policies
*/

DO $$ 
BEGIN
  -- Update the profile role to admin
  UPDATE public.profiles
  SET role = 'admin'
  WHERE id IN (
    SELECT id 
    FROM auth.users 
    WHERE email = 'dranand@thedoctorpreneuracademy.com'
  );

  -- Update the user metadata to include admin role
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"admin"'
  )
  WHERE email = 'dranand@thedoctorpreneuracademy.com';
END $$;