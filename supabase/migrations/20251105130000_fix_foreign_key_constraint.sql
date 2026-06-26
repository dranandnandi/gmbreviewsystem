-- Fix foreign key constraint for clinic_information table
-- First, let's check what users table structure we have and fix the constraint

-- Drop the existing foreign key constraint
ALTER TABLE public.clinic_information 
DROP CONSTRAINT IF EXISTS clinic_information_user_id_fkey;

-- Check if we need to reference auth.users (Supabase default) or public.users
-- Supabase uses auth.users for authenticated users, so let's use that
DO $$
BEGIN
    -- Try to add constraint referencing auth.users
    BEGIN
        ALTER TABLE public.clinic_information 
        ADD CONSTRAINT clinic_information_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Successfully created foreign key constraint referencing auth.users';
    EXCEPTION WHEN OTHERS THEN
        -- If that fails, try public.users
        BEGIN
            ALTER TABLE public.clinic_information 
            ADD CONSTRAINT clinic_information_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE;
            
            RAISE NOTICE 'Successfully created foreign key constraint referencing public.users';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not create foreign key constraint: %', SQLERRM;
        END;
    END;
END $$;

-- Alternative: Remove the foreign key constraint entirely if it's causing issues
-- This is not recommended for production but can help with debugging
-- ALTER TABLE public.clinic_information DROP CONSTRAINT IF EXISTS clinic_information_user_id_fkey;