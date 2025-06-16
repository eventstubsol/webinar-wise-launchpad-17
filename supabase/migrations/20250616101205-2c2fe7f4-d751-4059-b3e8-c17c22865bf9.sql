
-- Make registration_time nullable to handle cases where Zoom API doesn't provide this data
ALTER TABLE zoom_registrants ALTER COLUMN registration_time DROP NOT NULL;

-- Add a default value for cases where registration_time is not provided
ALTER TABLE zoom_registrants ALTER COLUMN registration_time SET DEFAULT now();
