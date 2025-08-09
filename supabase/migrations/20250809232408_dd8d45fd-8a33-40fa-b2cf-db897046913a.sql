-- Create a function to get user details for admin panel
CREATE OR REPLACE FUNCTION public.get_users_for_admin()
RETURNS TABLE (
  user_id uuid,
  email text,
  username text,
  role public.app_role,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Check if the calling user has admin role
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    p.user_id,
    au.email::text,
    p.username,
    ur.role,
    p.created_at
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON p.user_id = ur.user_id
  INNER JOIN auth.users au ON p.user_id = au.id
  ORDER BY p.created_at DESC;
END;
$$;