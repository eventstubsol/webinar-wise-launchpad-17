
-- Step 1: Rename incorrectly named fields to match Zoom API
ALTER TABLE zoom_webinars 
RENAME COLUMN h323_password TO h323_passcode;

ALTER TABLE zoom_webinars 
RENAME COLUMN pstn_passcode TO pstn_password;

ALTER TABLE zoom_webinars 
RENAME COLUMN encrypted_password TO encrypted_passcode;

-- Step 2: Add missing Zoom API fields
ALTER TABLE zoom_webinars 
ADD COLUMN IF NOT EXISTS start_url TEXT,
ADD COLUMN IF NOT EXISTS registration_type INTEGER,
ADD COLUMN IF NOT EXISTS pmi BIGINT,
ADD COLUMN IF NOT EXISTS webinar_passcode TEXT;

-- Step 3: Create indexes for new fields that might be queried
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_pmi ON zoom_webinars(pmi);
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_registration_type ON zoom_webinars(registration_type);

-- Step 4: Add comments for documentation
COMMENT ON COLUMN zoom_webinars.h323_passcode IS 'H.323/SIP room system passcode';
COMMENT ON COLUMN zoom_webinars.pstn_password IS 'PSTN password for phone users';
COMMENT ON COLUMN zoom_webinars.encrypted_passcode IS 'Encrypted passcode for webinar';
COMMENT ON COLUMN zoom_webinars.start_url IS 'URL for host to start the webinar';
COMMENT ON COLUMN zoom_webinars.registration_type IS 'Registration type: 1=required, 2=not required, 3=not required but show';
COMMENT ON COLUMN zoom_webinars.pmi IS 'Personal Meeting ID if webinar uses PMI';
COMMENT ON COLUMN zoom_webinars.webinar_passcode IS 'Plain text webinar passcode';
