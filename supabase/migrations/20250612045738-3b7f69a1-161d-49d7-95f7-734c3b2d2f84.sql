
-- Update the function to create both profile and user settings on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  INSERT INTO public.user_settings (id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the separate user settings trigger since we're handling it in the main function
DROP TRIGGER IF EXISTS on_auth_user_created_settings ON auth.users;

-- Drop the separate user settings function since it's no longer needed
DROP FUNCTION IF EXISTS public.handle_new_user_settings();
