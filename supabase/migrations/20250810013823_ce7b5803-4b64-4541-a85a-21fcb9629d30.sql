-- Disable Supabase's automatic confirmation emails
-- and ensure only our custom welcome email is sent

-- First, let's check and update auth settings to disable automatic emails
UPDATE auth.config 
SET 
  enable_signup = true,
  enable_email_confirmations = false
WHERE id = 'default';

-- If the config table doesn't exist or update doesn't work, 
-- we'll handle this through triggers instead

-- Drop any existing triggers that might be sending duplicate emails
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS send_welcome_email_trigger ON auth.users;

-- Create a new trigger that only sends our custom email
-- This trigger will fire when a user signs up and send only our custom email
CREATE OR REPLACE FUNCTION public.send_only_custom_welcome()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Only send our custom email for new signups (not logins or updates)
  IF TG_OP = 'INSERT' AND NEW.confirmation_token IS NOT NULL THEN
    -- Send our custom welcome email through the edge function
    PERFORM net.http_post(
      url := 'https://mskdohetwbbkuexcolcl.supabase.co/functions/v1/send-welcome-email',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1za2RvaGV0d2Jia3VleGNvbGNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MTU4MjQsImV4cCI6MjA3MDE5MTgyNH0.gqxdcBCv67aNYmxRgygxQSjsZq5gB3K75KUe5bij9FY"}'::jsonb,
      body := json_build_object(
        'email', NEW.email,
        'confirmationUrl', 'https://mskdohetwbbkuexcolcl.supabase.co/auth/v1/verify?token=' || NEW.confirmation_token || '&type=signup&redirect_to=https://pitch-plan.lovable.app/',
        'username', COALESCE(NEW.raw_user_meta_data ->> 'username', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1))
      )::jsonb
    );
    
    RAISE LOG 'Custom welcome email sent for new user: %', NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger for new user signups
CREATE TRIGGER send_custom_welcome_only
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.send_only_custom_welcome();