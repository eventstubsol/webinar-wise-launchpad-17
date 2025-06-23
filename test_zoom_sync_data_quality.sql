-- Testing Script for Zoom Sync Data Quality Fixes
-- Run this after applying the migrations and updating the Edge Function

-- 1. Check webinar status distribution
SELECT 
  status,
  COUNT(*) as count,
  MIN(start_time) as earliest_start,
  MAX(start_time) as latest_start
FROM zoom_webinars
GROUP BY status
ORDER BY count DESC;

-- 2. Find webinars with incorrect status (past webinars marked as scheduled)
SELECT 
  webinar_id,
  topic,
  status,
  start_time,
  NOW() - start_time as time_since_start
FROM zoom_webinars
WHERE 
  status = 'scheduled' 
  AND start_time < NOW()
ORDER BY start_time DESC
LIMIT 10;

-- 3. Check data completeness - count NULL values in important columns
SELECT 
  COUNT(*) as total_webinars,
  COUNT(host_email) as has_host_email,
  COUNT(total_registrants) as has_registrants,
  COUNT(total_attendees) as has_attendees,
  COUNT(registration_url) as has_registration_url,
  COUNT(audio) as has_audio_settings,
  COUNT(settings) as has_settings_json,
  COUNT(additional_data) as has_additional_data
FROM zoom_webinars;

-- 4. Find webinars with missing critical data
SELECT 
  webinar_id,
  topic,
  status,
  start_time,
  CASE 
    WHEN host_email IS NULL THEN 'Missing host_email, '
    ELSE ''
  END ||
  CASE 
    WHEN total_registrants IS NULL THEN 'Missing registrants, '
    ELSE ''
  END ||
  CASE 
    WHEN status = 'finished' AND total_attendees IS NULL THEN 'Missing attendees, '
    ELSE ''
  END as missing_fields
FROM zoom_webinars
WHERE 
  host_email IS NULL 
  OR total_registrants IS NULL 
  OR (status = 'finished' AND total_attendees IS NULL)
ORDER BY start_time DESC
LIMIT 20;

-- 5. Check sync progress and errors
SELECT 
  sync_id,
  processing_status,
  COUNT(*) as count,
  COUNT(error_message) as errors
FROM webinar_sync_queue
GROUP BY sync_id, processing_status
ORDER BY sync_id DESC
LIMIT 10;

-- 6. Get detailed error messages from failed syncs
SELECT 
  webinar_id,
  error_message,
  retry_count,
  started_at
FROM webinar_sync_queue
WHERE processing_status = 'failed'
ORDER BY started_at DESC
LIMIT 10;

-- 7. Check attendance rates for finished webinars
SELECT 
  webinar_id,
  topic,
  total_registrants,
  total_attendees,
  CASE 
    WHEN total_registrants > 0 
    THEN ROUND((total_attendees::NUMERIC / total_registrants::NUMERIC) * 100, 2)
    ELSE 0
  END as attendance_rate,
  avg_attendance_duration
FROM zoom_webinars
WHERE 
  status = 'finished' 
  AND total_registrants > 0
ORDER BY start_time DESC
LIMIT 20;

-- 8. Summary metrics by connection
SELECT 
  c.zoom_email,
  COUNT(w.id) as total_webinars,
  COUNT(w.id) FILTER (WHERE w.status = 'finished') as finished_webinars,
  COUNT(w.id) FILTER (WHERE w.status = 'scheduled') as scheduled_webinars,
  COUNT(w.id) FILTER (WHERE w.host_email IS NULL) as missing_host_email,
  COUNT(w.id) FILTER (WHERE w.total_registrants IS NULL) as missing_registrants
FROM zoom_connections c
LEFT JOIN zoom_webinars w ON c.id = w.connection_id
GROUP BY c.id, c.zoom_email;

-- 9. Check if additional_data is being populated
SELECT 
  webinar_id,
  topic,
  jsonb_pretty(additional_data) as additional_data
FROM zoom_webinars
WHERE 
  additional_data IS NOT NULL 
  AND additional_data != '{}'::jsonb
LIMIT 5;

-- 10. Verify the latest sync logs
SELECT 
  id as sync_id,
  status,
  started_at,
  ended_at,
  webinars_synced,
  jsonb_pretty(metadata) as metadata
FROM zoom_sync_logs
ORDER BY started_at DESC
LIMIT 5;
