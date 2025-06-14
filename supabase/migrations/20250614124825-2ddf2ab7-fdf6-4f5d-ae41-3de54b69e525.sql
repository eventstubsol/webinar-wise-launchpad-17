
-- Add retry tracking columns to export_queue table
ALTER TABLE export_queue ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE export_queue ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3;
ALTER TABLE export_queue ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE export_queue ADD COLUMN IF NOT EXISTS retry_policy JSONB;
ALTER TABLE export_queue ADD COLUMN IF NOT EXISTS performance_metrics JSONB;

-- Create dead letter queue table for permanently failed jobs
CREATE TABLE IF NOT EXISTS export_dead_letter_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_job_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    export_type TEXT NOT NULL,
    export_config JSONB NOT NULL,
    failure_reason TEXT,
    retry_history JSONB,
    moved_to_dlq_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create connection health tracking table
CREATE TABLE IF NOT EXISTS connection_health_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    connection_type TEXT NOT NULL,
    status TEXT NOT NULL,
    ping_time_ms INTEGER,
    error_message TEXT,
    metrics JSONB,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE export_dead_letter_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_health_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own dead letter queue" 
    ON export_dead_letter_queue FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own connection health" 
    ON connection_health_log FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Service can insert connection health" 
    ON connection_health_log FOR INSERT 
    WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_export_queue_retry ON export_queue(next_retry_at, status) WHERE next_retry_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_connection_health_user_time ON connection_health_log(user_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_dead_letter_queue_user ON export_dead_letter_queue(user_id, moved_to_dlq_at);
