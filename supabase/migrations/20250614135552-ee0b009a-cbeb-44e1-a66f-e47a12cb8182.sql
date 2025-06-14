
-- Add columns for secure preference management to the email_preferences table
ALTER TABLE public.email_preferences
ADD COLUMN IF NOT EXISTS preference_management_token UUID UNIQUE,
ADD COLUMN IF NOT EXISTS preference_token_expires_at TIMESTAMPTZ;

-- Add an index on the new token for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_preferences_token ON public.email_preferences(preference_management_token);

-- This function will ensure that every user profile has a corresponding
-- entry in the email_preferences table, creating one if it doesn't exist.
-- This is crucial for managing subscriptions for all users.
CREATE OR REPLACE FUNCTION public.ensure_email_preferences_for_profile(p_profile_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  preference_id uuid;
BEGIN
  -- Check if an entry already exists for the given profile ID
  SELECT id INTO preference_id FROM public.email_preferences WHERE user_id = p_profile_id;

  -- If no entry is found, create a new one
  IF preference_id IS NULL THEN
    INSERT INTO public.email_preferences (user_id) VALUES (p_profile_id) RETURNING id INTO preference_id;
  END IF;

  RETURN preference_id;
END;
$$;
