/*
  # Update user email confirmation
  
  Sets email_confirmed_at for test users to allow login
*/

DO $$ 
BEGIN
  UPDATE auth.users
  SET email_confirmed_at = NOW(),
      is_sso_user = FALSE
  WHERE email IN (
    'admin1@clinic.com',
    'admin2@clinic.com',
    'receptionist1@clinic.com',
    'receptionist2@clinic.com',
    'receptionist3@clinic.com'
  );
END $$;