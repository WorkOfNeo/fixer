-- Enhanced customer sync tracking
-- This migration will automatically deploy when pushed to GitHub!

-- Add sync performance tracking
ALTER TABLE customer_sync_logs 
ADD COLUMN IF NOT EXISTS performance_metrics JSONB DEFAULT '{}';

-- Add sync status enum for better tracking
DO $$ BEGIN
    CREATE TYPE sync_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add status column with default
ALTER TABLE customer_sync_logs 
ADD COLUMN IF NOT EXISTS status sync_status DEFAULT 'pending';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_customer_sync_logs_status 
ON customer_sync_logs(status);

-- Add sync duration tracking
ALTER TABLE customer_sync_logs 
ADD COLUMN IF NOT EXISTS duration_ms INTEGER;

-- Comment on enhancements
COMMENT ON COLUMN customer_sync_logs.performance_metrics IS 'JSON object containing detailed sync performance data';
COMMENT ON COLUMN customer_sync_logs.status IS 'Current status of the sync operation';
COMMENT ON COLUMN customer_sync_logs.duration_ms IS 'Total sync duration in milliseconds';