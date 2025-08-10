-- Add logging to webhook handler to debug the issue
CREATE OR REPLACE FUNCTION public.handle_auth_webhook()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Log when function is triggered
  RAISE LOG 'handle_auth_webhook triggered for user: %', NEW.email;
  
  -- Only handle signup confirmations
  IF TG_OP = 'INSERT' AND NEW.email_confirmed_at IS NULL AND NEW.confirmation_token IS NOT NULL THEN
    -- Log the username being extracted
    RAISE LOG 'Extracted username: %', COALESCE(NEW.raw_user_meta_data ->> 'username', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1));
    
    -- Call our custom email edge function with proper username
    PERFORM net.http_post(
      url := 'https://mskdohetwbbkuexcolcl.supabase.co/functions/v1/send-welcome-email',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1za2RvaGV0d2Jia3VleGNvbGNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MTU4MjQsImV4cCI6MjA3MDE5MTgyNH0.gqxdcBCv67aNYmxRgygxQSjsZq5gB3K75KUe5bij9FY"}'::jsonb,
      body := json_build_object(
        'email', NEW.email,
        'confirmationUrl', 'https://mskdohetwbbkuexcolcl.supabase.co/auth/v1/verify?token=' || NEW.confirmation_token || '&type=signup&redirect_to=' || encode(convert_to('https://pitch-plan.lovable.app/', 'utf8'), 'base64'),
        'username', COALESCE(NEW.raw_user_meta_data ->> 'username', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1))
      )::jsonb
    );
    
    RAISE LOG 'Webhook called edge function for user: %', NEW.email;
  ELSE
    RAISE LOG 'Webhook conditions not met - TG_OP: %, email_confirmed_at: %, confirmation_token exists: %', 
      TG_OP, NEW.email_confirmed_at, (NEW.confirmation_token IS NOT NULL);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$