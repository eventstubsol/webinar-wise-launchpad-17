-- Migration: 002_cleanup_backup_tables
-- Created: 2025-06-21
-- Purpose: Remove redundant backup tables and implement proper backup strategy

-- This migration has already been applied
-- The zoom_webinars_backup_20250620 table has been removed
-- Backup strategy now uses audit_log and Supabase automatic backups
