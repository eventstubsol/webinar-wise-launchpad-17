-- Migration to fix unique attendee counts for all past webinars
-- This updates the total_attendees to reflect unique attendees instead of total sessions

-- First, let's analyze the current situation
DO $$
DECLARE
    v_total_webinars integer;
    v_webinars_to_fix integer;
BEGIN
    -- Count webinars
    SELECT COUNT(*) INTO v_total_webinars
    FROM zoom_webinars
    WHERE status = 'ended';
    
    -- Count webinars that need fixing
    SELECT COUNT(*) INTO v_webinars_to_fix
    FROM zoom_webinars w
    WHERE w.status = 'ended'
      AND w.total_attendees > 0
      AND EXISTS (
          SELECT 1
          FROM zoom_participants p
          WHERE p.webinar_id = w.id
      );
    
    RAISE NOTICE 'Total ended webinars: %', v_total_webinars;
    RAISE NOTICE 'Webinars that may need fixing: %', v_webinars_to_fix;
END $$;

-- Update webinars with correct unique attendee counts
WITH unique_attendee_counts AS (
    SELECT 
        w.id as webinar_id,
        -- Count unique attendees by email, or participant_id if email is null
        COUNT(DISTINCT COALESCE(p.email, p.participant_id, p.participant_user_id)) as unique_attendees,
        -- Also count total participant sessions for reference
        COUNT(*) as total_sessions
    FROM zoom_webinars w
    LEFT JOIN zoom_participants p ON p.webinar_id = w.id
    WHERE w.status = 'ended'
    GROUP BY w.id
),
updates AS (
    UPDATE zoom_webinars w
    SET 
        -- Update total_attendees to reflect unique count
        total_attendees = COALESCE(uac.unique_attendees, 0),
        -- Update unique_participant_count if it exists
        unique_participant_count = COALESCE(uac.unique_attendees, 0),
        -- Update actual_participant_count to store total sessions if column exists
        actual_participant_count = CASE 
            WHEN column_exists('zoom_webinars', 'actual_participant_count') 
            THEN COALESCE(uac.total_sessions, 0) 
            ELSE actual_participant_count 
        END,
        -- Recalculate absentees based on unique attendees
        total_absentees = GREATEST(0, w.total_registrants - COALESCE(uac.unique_attendees, 0)),
        -- Update timestamp
        updated_at = NOW()
    FROM unique_attendee_counts uac
    WHERE w.id = uac.webinar_id
      AND w.status = 'ended'
      -- Only update if values are different
      AND (w.total_attendees != COALESCE(uac.unique_attendees, 0) 
           OR w.total_absentees != GREATEST(0, w.total_registrants - COALESCE(uac.unique_attendees, 0)))
    RETURNING w.id, w.topic, w.total_attendees, w.unique_participant_count, w.total_registrants, w.total_absentees
)
SELECT COUNT(*) as updated_count FROM updates;

-- Create a helper function to check if a column exists
CREATE OR REPLACE FUNCTION column_exists(p_table_name text, p_column_name text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = p_table_name 
          AND column_name = p_column_name
    );
END;
$$ LANGUAGE plpgsql;

-- Log some examples of the fixes
DO $$
DECLARE
    rec record;
    v_count integer := 0;
BEGIN
    RAISE NOTICE 'Examples of fixed webinars:';
    RAISE NOTICE '%-50s | %-15s | %-15s | %-15s | %-15s', 
                 'Topic', 'Attendees', 'Unique', 'Registrants', 'Absentees';
    RAISE NOTICE '%', REPEAT('-', 130);
    
    FOR rec IN 
        SELECT 
            LEFT(topic, 50) as topic,
            total_attendees,
            unique_participant_count,
            total_registrants,
            total_absentees
        FROM zoom_webinars
        WHERE status = 'ended'
          AND total_attendees > 0
        ORDER BY updated_at DESC
        LIMIT 10
    LOOP
        RAISE NOTICE '%-50s | %-15s | %-15s | %-15s | %-15s', 
                     rec.topic, 
                     rec.total_attendees, 
                     rec.unique_participant_count,
                     rec.total_registrants,
                     rec.total_absentees;
        v_count := v_count + 1;
    END LOOP;
    
    IF v_count = 0 THEN
        RAISE NOTICE 'No webinars with attendees found.';
    END IF;
END $$;

-- Clean up the helper function
DROP FUNCTION IF EXISTS column_exists(text, text);
