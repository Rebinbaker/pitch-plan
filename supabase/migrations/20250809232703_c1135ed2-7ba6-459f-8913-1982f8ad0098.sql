-- Create a function to safely delete users (admin only)
CREATE OR REPLACE FUNCTION public.delete_user_as_admin(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Check if the calling user has admin role
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  -- Prevent admin from deleting themselves
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own account.';
  END IF;

  -- Check if target user exists and is not admin
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = target_user_id AND role = 'admin'::public.app_role
  ) THEN
    RAISE EXCEPTION 'Cannot delete admin users.';
  END IF;

  -- Delete from user_roles (this will trigger cascade delete if set up properly)
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  
  -- Delete from profiles
  DELETE FROM public.profiles WHERE user_id = target_user_id;

  -- Note: Cannot delete from auth.users directly from this function
  -- The frontend will need to handle auth user deletion separately
  -- or this would need to be implemented as an edge function

  RETURN true;
END;
$$;