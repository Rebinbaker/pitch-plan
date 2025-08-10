-- Drop the current trigger since det verkar inte fungera som förväntat
DROP TRIGGER IF EXISTS send_custom_welcome_only ON auth.users;
DROP FUNCTION IF EXISTS public.send_only_custom_welcome();

-- Create a trigger that runs when email is confirmed instead
CREATE OR REPLACE FUNCTION public.send_welcome_after_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Only send when email gets confirmed (UPDATE from null to not null)
  IF TG_OP = 'UPDATE' AND OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    -- Get username from profiles table
    PERFORM net.http_post(
      url := 'https://mskdohetwbbkuexcolcl.supabase.co/functions/v1/send-welcome-email',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1za2RvaGV0d2Jia3VleGNvbGNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MTU4MjQsImV4cCI6MjA3MDE5MTgyNH0.gqxdcBCv67aNYmxRgygxQSjsZq5gB3K75KUe5bij9FY"}'::jsonb,
      body := json_build_object(
        'email', NEW.email,
        'confirmationUrl', 'https://pitch-plan.lovable.app/',
        'username', (SELECT username FROM public.profiles WHERE user_id = NEW.id)
      )::jsonb
    );
    
    RAISE LOG 'Welcome email sent to confirmed user: %', NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger for email confirmation
CREATE TRIGGER send_welcome_on_confirmation
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.send_welcome_after_confirmation();