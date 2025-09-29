/*
  # Set passwords for test users
  
  Sets the password 'Admin123!' for all test users
*/

DO $$ 
BEGIN
  -- Update passwords for all test users
  UPDATE auth.users
  SET encrypted_password = crypt('Admin123!', gen_salt('bf'))
  WHERE email IN (
    'admin1@clinic.com',
    'admin2@clinic.com',
    'receptionist1@clinic.com',
    'receptionist2@clinic.com',
    'receptionist3@clinic.com'
  );
END $$;