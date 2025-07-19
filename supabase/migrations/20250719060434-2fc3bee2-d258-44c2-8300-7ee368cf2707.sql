
-- Fix duplicate zoom credentials and add unique constraint
-- First, deactivate all but the most recent active credential per user
WITH ranked_credentials AS (
  SELECT id, user_id, created_at,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
  FROM zoom_credentials 
  WHERE is_active = true
)
UPDATE zoom_credentials 
SET is_active = false, updated_at = now()
WHERE id IN (
  SELECT id FROM ranked_credentials WHERE rn > 1
);

-- Add unique constraint to prevent multiple active credentials per user
DROP INDEX IF EXISTS idx_zoom_credentials_user_active;
CREATE UNIQUE INDEX idx_zoom_credentials_user_active 
ON zoom_credentials(user_id) 
WHERE is_active = true;

-- Create function to automatically deactivate old credentials when new ones are created
CREATE OR REPLACE FUNCTION deactivate_old_zoom_credentials()
RETURNS TRIGGER AS $$
BEGIN
  -- If inserting a new active credential, deactivate all other active ones for this user
  IF NEW.is_active = true THEN
    UPDATE zoom_credentials 
    SET is_active = false, updated_at = now()
    WHERE user_id = NEW.user_id 
    AND id != NEW.id 
    AND is_active = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically manage active credentials
DROP TRIGGER IF EXISTS trigger_deactivate_old_zoom_credentials ON zoom_credentials;
CREATE TRIGGER trigger_deactivate_old_zoom_credentials
  BEFORE INSERT OR UPDATE ON zoom_credentials
  FOR EACH ROW
  EXECUTE FUNCTION deactivate_old_zoom_credentials();
