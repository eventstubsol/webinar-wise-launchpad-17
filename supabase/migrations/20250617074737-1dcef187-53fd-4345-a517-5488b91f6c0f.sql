
-- Clean up the zombie sync record and add timeout protection
UPDATE zoom_sync_logs 
SET 
    sync_status = 'failed',
    completed_at = NOW(),
    error_message = 'Sync timed out - automatically cleaned up zombie record',
    updated_at = NOW()
WHERE 
    id = 'f13c7240-8d95-4518-9e1d-9d034a4386eb'
    AND sync_status = 'started';

-- Also clean up any other zombie sync records that have been stuck for more than 10 minutes
UPDATE zoom_sync_logs 
SET 
    sync_status = 'failed',
    completed_at = NOW(),
    error_message = 'Sync timed out - automatically cleaned up after 10 minutes',
    updated_at = NOW()
WHERE 
    sync_status IN ('started', 'in_progress')
    AND started_at < NOW() - INTERVAL '10 minutes'
    AND completed_at IS NULL;
