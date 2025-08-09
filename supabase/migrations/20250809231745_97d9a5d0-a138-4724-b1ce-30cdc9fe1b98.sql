-- Create a webhook to trigger custom email sending for auth signup
-- This will replace the default Supabase auth emails

-- First, create a function to handle auth webhook events
CREATE OR REPLACE FUNCTION public.handle_auth_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only handle signup confirmations
  IF TG_OP = 'INSERT' AND NEW.email_confirmed_at IS NULL AND NEW.confirmation_token IS NOT NULL THEN
    -- Call our custom email edge function
    PERFORM net.http_post(
      url := 'https://mskdohetwbbkuexcolcl.supabase.co/functions/v1/send-welcome-email',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1za2RvaGV0d2Jia3VleGNvbGNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MTU4MjQsImV4cCI6MjA3MDE5MTgyNH0.gqxdcBCv67aNYmxRgygxQSjsZq5gB3K75KUe5bij9FY"}'::jsonb,
      body := json_build_object(
        'email', NEW.email,
        'confirmationUrl', 'https://mskdohetwbbkuexcolcl.supabase.co/auth/v1/verify?token=' || NEW.confirmation_token || '&type=signup&redirect_to=' || encode(convert_to('https://pitch-plan.lovable.app/', 'utf8'), 'base64'),
        'username', COALESCE(NEW.raw_user_meta_data ->> 'username', 'Ny användare')
      )::jsonb
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Note: We cannot create a trigger on auth.users as it's a protected schema
-- Instead, we'll need to use the auth hook in Supabase dashboard or modify the signup process