-- Since Supabase sends its own emails, let's modify our approach
-- We'll update the signup process to send our custom email instead

-- First, let's check if we can disable Supabase email and use only our custom one
-- Update the webhook to trigger on email confirmation instead of insert
DROP TRIGGER IF EXISTS on_auth_user_webhook ON auth.users;

-- Create a trigger that works when user confirms email
CREATE OR REPLACE FUNCTION public.send_custom_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Only send custom email when email gets confirmed
  IF TG_OP = 'UPDATE' AND OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    -- Get username from profiles table that was created during signup
    PERFORM net.http_post(
      url := 'https://mskdohetwbbkuexcolcl.supabase.co/functions/v1/send-welcome-email',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1za2RvaGV0d2Jia3VleGNvbGNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MTU4MjQsImV4cCI6MjA3MDE5MTgyNH0.gqxdcBCv67aNYmxRgygxQSjsZq5gB3K75KUe5bij9FY"}'::jsonb,
      body := json_build_object(
        'email', NEW.email,
        'confirmationUrl', 'https://pitch-plan.lovable.app/',
        'username', (SELECT username FROM public.profiles WHERE user_id = NEW.id)
      )::jsonb
    );
    
    RAISE LOG 'Custom welcome email sent to confirmed user: %', NEW.email;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for when email is confirmed
CREATE TRIGGER on_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.send_custom_welcome_email();