-- Remove the database trigger completely since we're handling emails from frontend
DROP TRIGGER IF EXISTS send_welcome_after_signup_trigger ON auth.users;
DROP FUNCTION IF EXISTS public.send_welcome_after_signup();