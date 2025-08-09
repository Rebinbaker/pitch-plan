-- Check if you already have a role and assign admin if needed
DO $$
DECLARE
    rebin_user_id uuid;
BEGIN
    -- Get your user ID based on email
    SELECT id INTO rebin_user_id 
    FROM auth.users 
    WHERE email = 'rebin@lokalahantverkarna.se';
    
    IF rebin_user_id IS NOT NULL THEN
        -- Insert admin role if it doesn't exist
        INSERT INTO public.user_roles (user_id, role)
        VALUES (rebin_user_id, 'admin'::app_role)
        ON CONFLICT (user_id, role) DO NOTHING;
        
        -- Also ensure you have a profile
        INSERT INTO public.profiles (user_id, username)
        VALUES (rebin_user_id, 'Rebin')
        ON CONFLICT (user_id) DO UPDATE SET username = 'Rebin';
        
        RAISE NOTICE 'Admin role assigned to user: %', rebin_user_id;
    ELSE
        RAISE NOTICE 'User with email rebin@lokalahantverkarna.se not found';
    END IF;
END $$;