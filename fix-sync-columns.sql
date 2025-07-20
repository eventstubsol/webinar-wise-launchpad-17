-- Fix for webinar sync not updating columns properly

-- First, let's check what's actually in the zoom_webinars table
SELECT 
  zw.id,
  zw.topic,
  zw.status,
  zw.start_time,
  zw.total_registrants,
  zw.total_attendees,
  zw.total_absentees,
  zw.total_minutes,
  zw.avg_attendance_duration,
  zw.participant_sync_status,
  zw.last_synced_at,
  zw.updated_at
FROM zoom_webinars zw
WHERE zw.connection_id = '511b5833-b466-4cf1-b0a3-ef922df1d681'
  AND zw.status = 'ended'
ORDER BY zw.start_time DESC
LIMIT 5;

-- Check if there are any webinars that show as synced but have 0 attendees
SELECT COUNT(*) as webinars_with_zero_attendees
FROM zoom_webinars
WHERE connection_id = '511b5833-b466-4cf1-b0a3-ef922df1d681'
  AND status = 'ended'
  AND total_registrants > 0
  AND total_attendees = 0;

-- Check the actual columns in the table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'zoom_webinars'
  AND column_name IN (
    'total_registrants', 
    'total_attendees', 
    'total_absentees',
    'total_minutes',
    'avg_attendance_duration'
  )
ORDER BY ordinal_position;
