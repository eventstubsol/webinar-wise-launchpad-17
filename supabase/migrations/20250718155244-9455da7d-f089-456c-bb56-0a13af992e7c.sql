
-- Drop all Zoom-related tables and their dependencies
-- Start with tables that have foreign key dependencies first

-- Drop tables that reference zoom_webinars
DROP TABLE IF EXISTS zoom_recordings CASCADE;
DROP TABLE IF EXISTS zoom_participants CASCADE;
DROP TABLE IF EXISTS zoom_registrants CASCADE;
DROP TABLE IF EXISTS zoom_polls CASCADE;
DROP TABLE IF EXISTS zoom_poll_responses CASCADE;
DROP TABLE IF EXISTS zoom_qna CASCADE;
DROP TABLE IF EXISTS zoom_participant_sessions CASCADE;
DROP TABLE IF EXISTS webinar_metrics CASCADE;

-- Drop tables that reference zoom_connections
DROP TABLE IF EXISTS zoom_webinars CASCADE;
DROP TABLE IF EXISTS zoom_webinars_backup CASCADE;
DROP TABLE IF EXISTS zoom_sync_logs CASCADE;
DROP TABLE IF EXISTS zoom_token_refresh_log CASCADE;
DROP TABLE IF EXISTS scheduled_syncs CASCADE;

-- Drop the main Zoom tables
DROP TABLE IF EXISTS zoom_connections CASCADE;
DROP TABLE IF EXISTS zoom_credentials CASCADE;

-- Drop any remaining Zoom-related tables
DROP TABLE IF EXISTS zoom_segmentation_rules CASCADE;
DROP TABLE IF EXISTS sync_state CASCADE;
DROP TABLE IF EXISTS webinar_sync_queue CASCADE;
DROP TABLE IF EXISTS sync_performance_metrics CASCADE;
DROP TABLE IF EXISTS rate_limit_tracking CASCADE;

-- Clean up any Zoom-related functions
DROP FUNCTION IF EXISTS public.aggregate_participant_sessions(uuid);
DROP FUNCTION IF EXISTS public.calculate_webinar_stats(uuid);
DROP FUNCTION IF EXISTS public.batch_update_webinar_statuses();
DROP FUNCTION IF EXISTS public.calculate_webinar_status(timestamp with time zone, integer);
DROP FUNCTION IF EXISTS public.calculate_webinar_status(timestamp with time zone, integer, timestamp with time zone);
DROP FUNCTION IF EXISTS public.get_webinar_status(timestamp with time zone, integer);
DROP FUNCTION IF EXISTS public.update_webinar_status();
DROP FUNCTION IF EXISTS public.update_webinar_status_based_on_time();
DROP FUNCTION IF EXISTS public.trigger_aggregate_sessions();

-- Remove any Zoom-related organization columns if they exist
ALTER TABLE IF EXISTS organizations DROP COLUMN IF EXISTS zoom_account_id CASCADE;
ALTER TABLE IF EXISTS organization_members DROP COLUMN IF EXISTS zoom_user_id CASCADE;
ALTER TABLE IF EXISTS user_organizations DROP COLUMN IF EXISTS zoom_account_id CASCADE;
ALTER TABLE IF EXISTS profiles DROP COLUMN IF EXISTS zoom_user_id CASCADE;
ALTER TABLE IF EXISTS profiles DROP COLUMN IF EXISTS is_zoom_admin CASCADE;
