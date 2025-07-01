-- Script to update all webinar metrics with proper unique attendee counts
-- This will fix the total_attendees field for all webinars

WITH participant_metrics AS (
  SELECT 
    p.webinar_id,
    COUNT(DISTINCT COALESCE(p.participant_id, p.participant_email, p.id::text)) as unique_attendees,
    SUM(COALESCE(p.duration, 0)) as total_minutes,
    AVG(COALESCE(p.duration, 0))::integer as avg_duration
  FROM zoom_participants p
  GROUP BY p.webinar_id
),
registrant_metrics AS (
  SELECT 
    r.webinar_id,
    COUNT(DISTINCT r.registrant_id) as total_registrants
  FROM zoom_registrants r
  GROUP BY r.webinar_id
)
UPDATE zoom_webinars w
SET 
  total_attendees = COALESCE(pm.unique_attendees, 0),
  total_minutes = COALESCE(pm.total_minutes, 0),
  avg_attendance_duration = COALESCE(pm.avg_duration, 0),
  total_registrants = COALESCE(rm.total_registrants, 0),
  updated_at = NOW()
FROM participant_metrics pm
FULL OUTER JOIN registrant_metrics rm ON pm.webinar_id = rm.webinar_id
WHERE w.id = COALESCE(pm.webinar_id, rm.webinar_id);
