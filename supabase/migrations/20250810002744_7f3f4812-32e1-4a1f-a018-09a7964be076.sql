-- Update handle_new_user function to handle duplicate usernames
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  base_username text;
  final_username text;
  counter integer := 1;
BEGIN
  -- Generate base username from metadata or email
  base_username := COALESCE(
    NEW.raw_user_meta_data ->> 'username', 
    NEW.raw_user_meta_data ->> 'name', 
    split_part(NEW.email, '@', 1)
  );
  
  -- Ensure we have a base username
  IF base_username IS NULL OR base_username = '' THEN
    base_username := 'user_' || substr(NEW.id::text, 1, 8);
  END IF;
  
  final_username := base_username;
  
  -- Find a unique username by appending numbers if needed
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    final_username := base_username || '_' || counter;
    counter := counter + 1;
  END LOOP;
  
  -- Insert profile with unique username
  INSERT INTO public.profiles (user_id, username)
  VALUES (NEW.id, final_username);
  
  -- Assign role: admin if first user, otherwise user
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE 
      WHEN (SELECT COUNT(*) FROM auth.users) = 1 THEN 'admin'::public.app_role
      ELSE 'user'::public.app_role
    END
  );
  
  RETURN NEW;
END;
$function$