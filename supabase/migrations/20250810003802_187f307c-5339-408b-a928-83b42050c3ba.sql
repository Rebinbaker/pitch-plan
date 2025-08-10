-- Check if webhook trigger exists and recreate it if needed
DROP TRIGGER IF EXISTS on_auth_user_webhook ON auth.users;

-- Create webhook trigger for sending custom welcome emails
CREATE TRIGGER on_auth_user_webhook
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_webhook();

-- Also ensure the main user creation trigger exists  
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();