-- Comprehensive fix for Zoom sync database constraints
-- This migration ensures all necessary unique constraints exist

-- 1. Fix zoom_webinars table constraints
DO $$
BEGIN
    -- Check if unique constraint exists for webinar_id + connection_id
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'zoom_webinars_webinar_connection_unique'
    ) THEN
        -- First, remove any duplicate webinars
        DELETE FROM zoom_webinars a
        USING zoom_webinars b
        WHERE a.id < b.id
        AND a.webinar_id = b.webinar_id
        AND a.connection_id = b.connection_id;

        -- Create the unique constraint
        ALTER TABLE zoom_webinars
        ADD CONSTRAINT zoom_webinars_webinar_connection_unique 
        UNIQUE (webinar_id, connection_id);
        
        RAISE NOTICE 'Created unique constraint on zoom_webinars(webinar_id, connection_id)';
    ELSE
        RAISE NOTICE 'Unique constraint already exists on zoom_webinars(webinar_id, connection_id)';
    END IF;
END $$;

-- 2. Fix zoom_participants table constraints
DO $$
BEGIN
    -- Check if unique constraint exists for webinar_id + participant_id
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'zoom_participants_webinar_participant_unique'
    ) THEN
        -- Remove any duplicate participants first
        DELETE FROM zoom_participants a
        USING zoom_participants b
        WHERE a.id < b.id
        AND a.webinar_id = b.webinar_id
        AND a.participant_id = b.participant_id;

        -- Create the unique constraint
        ALTER TABLE zoom_participants
        ADD CONSTRAINT zoom_participants_webinar_participant_unique 
        UNIQUE (webinar_id, participant_id);
        
        RAISE NOTICE 'Created unique constraint on zoom_participants(webinar_id, participant_id)';
    ELSE
        RAISE NOTICE 'Unique constraint already exists on zoom_participants(webinar_id, participant_id)';
    END IF;
END $$;

-- 3. Add missing indexes for better performance
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_webinar_id 
ON zoom_webinars(webinar_id);

CREATE INDEX IF NOT EXISTS idx_zoom_webinars_connection_id 
ON zoom_webinars(connection_id);

CREATE INDEX IF NOT EXISTS idx_zoom_webinars_webinar_connection 
ON zoom_webinars(webinar_id, connection_id);

CREATE INDEX IF NOT EXISTS idx_zoom_participants_webinar_id 
ON zoom_participants(webinar_id);

CREATE INDEX IF NOT EXISTS idx_zoom_participants_participant_id 
ON zoom_participants(participant_id);

CREATE INDEX IF NOT EXISTS idx_zoom_participants_webinar_participant 
ON zoom_participants(webinar_id, participant_id);

-- 4. Reset failed syncs so they can be retried
UPDATE zoom_webinars
SET 
    participant_sync_status = 'pending',
    participant_sync_error = NULL,
    participant_sync_attempted_at = NULL
WHERE 
    participant_sync_error IS NOT NULL
    AND (
        participant_sync_error LIKE '%ON CONFLICT DO UPDATE command cannot affect row a second time%'
        OR participant_sync_error LIKE '%no unique or exclusion constraint matching the ON CONFLICT specification%'
        OR participant_sync_error LIKE '%duplicate key value violates unique constraint%'
    );

-- 5. Add comments for documentation
COMMENT ON CONSTRAINT zoom_webinars_webinar_connection_unique ON zoom_webinars 
IS 'Ensures unique webinars per connection to prevent duplicate entries';

COMMENT ON CONSTRAINT zoom_participants_webinar_participant_unique ON zoom_participants 
IS 'Ensures unique participants per webinar to prevent duplicate entries';

-- 6. Display current constraint status
DO $$
DECLARE
    constraint_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO constraint_count
    FROM pg_constraint
    WHERE conname IN (
        'zoom_webinars_webinar_connection_unique',
        'zoom_participants_webinar_participant_unique'
    );
    
    RAISE NOTICE 'Total unique constraints created: %', constraint_count;
END $$;
