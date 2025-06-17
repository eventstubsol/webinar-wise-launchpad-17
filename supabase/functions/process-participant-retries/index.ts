
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Import the retry queue processor
    const { RetryQueueProcessor } = await import('../zoom-sync-webinars/retry-queue-processor.ts');

    console.log('=== MANUAL RETRY PROCESSING TRIGGERED ===');

    // Get retry statistics before processing
    const statsBefore = await RetryQueueProcessor.getRetryStatistics(supabase);
    console.log('Retry statistics before processing:', statsBefore);

    // Process all pending retries
    await RetryQueueProcessor.processAllPendingRetries(supabase);

    // Get retry statistics after processing
    const statsAfter = await RetryQueueProcessor.getRetryStatistics(supabase);
    console.log('Retry statistics after processing:', statsAfter);

    // Clean up old retry schedules
    await RetryQueueProcessor.cleanupOldRetries(supabase, 7);

    const response = {
      success: true,
      message: 'Participant retry processing completed',
      statistics: {
        before: statsBefore,
        after: statsAfter,
        processed: {
          sync_logs_processed: statsBefore.total_sync_logs_with_retries,
          retries_processed: statsBefore.total_pending_retries - statsAfter.total_pending_retries,
          remaining_retries: statsAfter.total_pending_retries
        }
      }
    };

    return new Response(JSON.stringify(response, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Retry processing error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
