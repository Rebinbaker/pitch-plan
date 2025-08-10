-- Fix the delete_user_as_admin function to also delete from auth.users
CREATE OR REPLACE FUNCTION public.delete_user_as_admin(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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

  -- Delete from user_roles
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  
  -- Delete from profiles
  DELETE FROM public.profiles WHERE user_id = target_user_id;

  -- Delete from auth.users (this will completely remove the user)
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN true;
END;
$function$;