/*
  # Add Test Clinics and Users

  1. New Data
    - Add 20 test clinics with unique clinic codes
    - Create corresponding admin users for each clinic
    - Link auth users with custom users table
*/

-- Function to create auth user and get ID
CREATE OR REPLACE FUNCTION create_auth_user(
  p_email text,
  p_password text,
  p_name text
) RETURNS uuid AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;

  -- If user doesn't exist, create it
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      p_email,
      crypt(p_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('name', p_name),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  END IF;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create clinics and users
DO $$
DECLARE
  v_clinic_id uuid;
  v_auth_id uuid;
  v_clinic_data text[][];
  v_row text[];
BEGIN
  -- Define clinic and user data
  v_clinic_data := ARRAY[
    ARRAY['CLINIC001', 'North Clinic', 'admin_north1', 'K9#mP2$vL5nX', 'North Admin'],
    ARRAY['CLINIC002', 'South Clinic', 'south_clinic2', 'R7@jN4$qW9pY', 'South Admin'],
    ARRAY['CLINIC003', 'East Clinic', 'east_admin3', 'H5#xB8$mD3kL', 'East Admin'],
    ARRAY['CLINIC004', 'West Clinic', 'west_clinic4', 'T6@nF9$cJ4wQ', 'West Admin'],
    ARRAY['CLINIC005', 'Central Clinic', 'central_doc5', 'M2#pL7$vB5hN', 'Central Admin'],
    ARRAY['CLINIC006', 'Care Clinic', 'care_admin6', 'Y8@kR4$sX9mP', 'Care Admin'],
    ARRAY['CLINIC007', 'Health Center', 'health_mgr7', 'G3#wQ8$nM5tB', 'Health Manager'],
    ARRAY['CLINIC008', 'Medical Center', 'med_admin8', 'C9@vH6$kL4xD', 'Medical Admin'],
    ARRAY['CLINIC009', 'Lead Clinic', 'clinic_lead9', 'P5#jF2$wR7mN', 'Lead Admin'],
    ARRAY['CLINIC010', 'Doctors Clinic', 'doc_admin10', 'B8@tM4$hX3kL', 'Doctor Admin'],
    ARRAY['CLINIC011', 'Care Center', 'care_head11', 'L6#nW9$cQ5vR', 'Care Head'],
    ARRAY['CLINIC012', 'Health Clinic', 'health_dir12', 'X4@kH7$pM2tB', 'Health Director'],
    ARRAY['CLINIC013', 'Medical Clinic', 'med_chief13', 'D7#wL5$nF8xJ', 'Medical Chief'],
    ARRAY['CLINIC014', 'City Clinic', 'clinic_mgr14', 'Q2@vB6$kR4mP', 'Clinic Manager'],
    ARRAY['CLINIC015', 'Care Point', 'admin_care15', 'N8#tX4$hM5wL', 'Care Admin'],
    ARRAY['CLINIC016', 'Health Point', 'health_sup16', 'V5@jQ7$cB3kR', 'Health Supervisor'],
    ARRAY['CLINIC017', 'Med Point', 'med_lead17', 'K3#pF8$nX6tM', 'Medical Lead'],
    ARRAY['CLINIC018', 'Care Hub', 'care_dir18', 'W9@vL4$hD2xQ', 'Care Director'],
    ARRAY['CLINIC019', 'Clinic Hub', 'clinic_head19', 'M6#tR5$kP8wN', 'Clinic Head'],
    ARRAY['CLINIC020', 'Health Hub', 'health_admin20', 'B4@nH7$cX5vL', 'Health Admin']
  ];

  -- Process each clinic
  FOREACH v_row SLICE 1 IN ARRAY v_clinic_data
  LOOP
    -- Create clinic
    INSERT INTO clinic_settings (clinic_code, name, address)
    VALUES (
      v_row[1],
      v_row[2],
      format('%s Address, Medical District', v_row[2])
    )
    ON CONFLICT (clinic_code) DO NOTHING
    RETURNING id INTO v_clinic_id;

    -- If clinic wasn't inserted, get its ID
    IF v_clinic_id IS NULL THEN
      SELECT id INTO v_clinic_id
      FROM clinic_settings
      WHERE clinic_code = v_row[1];
    END IF;

    -- Create auth user
    v_auth_id := create_auth_user(v_row[3], v_row[4], v_row[5]);

    -- Create or update user
    INSERT INTO users (
      clinic_id,
      username,
      password_hash,
      name,
      role,
      auth_id
    )
    VALUES (
      v_clinic_id,
      v_row[3],
      crypt(v_row[4], gen_salt('bf')),
      v_row[5],
      'admin',
      v_auth_id
    )
    ON CONFLICT (username)
    DO UPDATE SET
      password_hash = EXCLUDED.password_hash,
      auth_id = EXCLUDED.auth_id;

  END LOOP;
END $$;