-- BACKUP SCRIPT: Save current state before reverting
-- Run this FIRST to create backup tables

-- Create backup schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS backup_20250629;

-- Backup zoom_webinars table
CREATE TABLE backup_20250629.zoom_webinars AS 
SELECT * FROM public.zoom_webinars;

-- Backup zoom_participants table
CREATE TABLE backup_20250629.zoom_participants AS 
SELECT * FROM public.zoom_participants;

-- Backup zoom_participant_sessions table
CREATE TABLE backup_20250629.zoom_participant_sessions AS 
SELECT * FROM public.zoom_participant_sessions;

-- Backup zoom_sync_logs table
CREATE TABLE backup_20250629.zoom_sync_logs AS 
SELECT * FROM public.zoom_sync_logs;

-- Backup zoom_registrants table
CREATE TABLE backup_20250629.zoom_registrants AS 
SELECT * FROM public.zoom_registrants;

-- Verify backups
SELECT 
  'Backup created successfully' as status,
  (SELECT COUNT(*) FROM backup_20250629.zoom_webinars) as webinars_backed_up,
  (SELECT COUNT(*) FROM backup_20250629.zoom_participants) as participants_backed_up,
  (SELECT COUNT(*) FROM backup_20250629.zoom_sync_logs) as sync_logs_backed_up;
