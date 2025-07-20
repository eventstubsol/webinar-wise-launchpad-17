import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

interface RateLimitTestRequest {
  connectionId: string;
  callsPerSecond: number;
  duration: number; // seconds
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { connectionId, callsPerSecond, duration } = await req.json() as RateLimitTestRequest;
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get connection and access token
    const { data: connection, error: connError } = await supabase
      .from('zoom_connections')
      .select('access_token')
      .eq('id', connectionId)
      .single();

    if (connError || !connection) {
      throw new Error('Connection not found');
    }

    // Test rate limiting
    let successfulCalls = 0;
    let rateLimitErrors = 0;
    let otherErrors = 0;
    const startTime = Date.now();
    const callResults: any[] = [];

    // Calculate delay between calls
    const delayMs = 1000 / callsPerSecond;
    const totalCalls = callsPerSecond * duration;

    for (let i = 0; i < totalCalls; i++) {
      const callStart = Date.now();
      
      try {
        // Make a simple API call to test rate limits
        const response = await fetch('https://api.zoom.us/v2/users/me', {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          successfulCalls++;
        } else if (response.status === 429) {
          rateLimitErrors++;
          const retryAfter = response.headers.get('Retry-After');
          callResults.push({
            call: i + 1,
            status: 429,
            retryAfter: retryAfter ? parseInt(retryAfter) : null
          });
        } else {
          otherErrors++;
        }
      } catch (error) {
        otherErrors++;
      }

      // Wait before next call
      const elapsedMs = Date.now() - callStart;
      const remainingDelay = delayMs - elapsedMs;
      if (remainingDelay > 0 && i < totalCalls - 1) {
        await new Promise(resolve => setTimeout(resolve, remainingDelay));
      }
    }

    const totalDuration = (Date.now() - startTime) / 1000;
    const actualCallsPerMinute = (successfulCalls / totalDuration) * 60;

    return new Response(
      JSON.stringify({
        success: true,
        results: {
          totalCalls,
          successfulCalls,
          rateLimitErrors,
          otherErrors,
          totalDuration,
          actualCallsPerMinute,
          targetCallsPerMinute: callsPerSecond * 60,
          rateLimitHit: rateLimitErrors > 0,
          callResults: callResults.slice(0, 10) // First 10 rate limit errors
        }
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
