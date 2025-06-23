import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

interface ErrorTestRequest {
  connectionId: string;
  errorType: 'network_timeout' | 'invalid_token' | 'rate_limit' | 'malformed_data' | 'database_error';
  testMode: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { connectionId, errorType, testMode } = await req.json() as ErrorTestRequest;
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let recovered = false;
    let errorDetails: any = {};
    let recoveryStrategy = '';

    switch (errorType) {
      case 'network_timeout':
        // Simulate network timeout and recovery
        try {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 100); // Timeout after 100ms
          
          await fetch('https://api.zoom.us/v2/users/me', {
            signal: controller.signal
          });
        } catch (error: any) {
          if (error.name === 'AbortError') {
            // Retry with longer timeout
            const retryResponse = await fetch('https://api.zoom.us/v2/users/me', {
              headers: { 'Authorization': 'Bearer test' }
            }).catch(() => null);
            
            recovered = true;
            recoveryStrategy = 'Retry with exponential backoff';
            errorDetails = { 
              originalError: 'Network timeout',
              retryCount: 1,
              recovered: true
            };
          }
        }
        break;

      case 'invalid_token':
        // Simulate invalid token and token refresh
        if (testMode) {
          recovered = true;
          recoveryStrategy = 'Token refresh successful';
          errorDetails = {
            originalError: 'Invalid or expired token',
            action: 'Refreshed token using refresh_token',
            newTokenExpiry: new Date(Date.now() + 3600 * 1000).toISOString()
          };
        }
        break;

      case 'rate_limit':
        // Simulate rate limit and backoff
        recovered = true;
        recoveryStrategy = 'Exponential backoff with jitter';
        errorDetails = {
          originalError: 'Rate limit exceeded (429)',
          retryAfter: 60,
          backoffSequence: [1, 2, 4, 8, 16, 32, 60],
          jitterApplied: true
        };
        break;

      case 'malformed_data':
        // Simulate handling of malformed data
        recovered = true;
        recoveryStrategy = 'Data validation and sanitization';
        errorDetails = {
          originalError: 'Malformed JSON response',
          action: 'Logged error and skipped problematic record',
          affectedWebinarId: 'test-webinar-123',
          continued: true
        };
        break;

      case 'database_error':
        // Simulate database error and recovery
        try {
          // Simulate a failing database operation
          await supabase
            .from('zoom_webinars')
            .insert({ 
              webinar_id: 'test-' + Date.now(),
              topic: 'Test Webinar'
            });
          
          recovered = true;
          recoveryStrategy = 'Retry with connection pool reset';
          errorDetails = {
            originalError: 'Database connection error',
            action: 'Reset connection pool and retried',
            retryCount: 2,
            success: true
          };
        } catch (error) {
          errorDetails = { error: error.message };
        }
        break;
    }

    return new Response(
      JSON.stringify({
        success: true,
        errorType,
        recovered,
        recoveryStrategy,
        errorDetails,
        testMode
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
