-- Remove existing trigger and function with CASCADE
DROP TRIGGER IF EXISTS send_welcome_on_confirmation ON auth.users;
DROP FUNCTION IF EXISTS public.send_welcome_after_confirmation() CASCADE;

-- Create the trigger function to send welcome email after signup
CREATE OR REPLACE FUNCTION public.send_welcome_after_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Send welcome email immediately after signup
  PERFORM net.http_post(
    url := 'https://mskdohetwbbkuexcolcl.supabase.co/functions/v1/send-welcome-email',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1za2RvaGV0d2Jia3VleGNvbGNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MTU4MjQsImV4cCI6MjA3MDE5MTgyNH0.gqxdcBCv67aNYmxRgygxQSjsZq5gB3K75KUe5bij9FY"}'::jsonb,
    body := json_build_object(
      'email', NEW.email,
      'confirmationUrl', 'https://pitch-plan.lovable.app/',
      'username', COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1))
    )::jsonb
  );
  
  RAISE LOG 'Welcome email sent to new user: %', NEW.email;
  
  RETURN NEW;
END;
$function$;

-- Create trigger that fires immediately after user signup
CREATE TRIGGER send_welcome_after_signup_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.send_welcome_after_signup();