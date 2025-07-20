
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { connection_id } = await req.json();

    if (!connection_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing connection_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'User not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get connection and verify ownership
    const { data: connection, error: connectionError } = await serviceClient
      .from('zoom_connections')
      .select('*')
      .eq('id', connection_id)
      .eq('user_id', user.id)
      .single();

    if (connectionError || !connection) {
      return new Response(
        JSON.stringify({ success: false, error: 'Connection not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const startTime = Date.now();
    const tests = [];

    // Test /users/me endpoint
    try {
      const userTestStart = Date.now();
      const userResponse = await fetch('https://api.zoom.us/v2/users/me', {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (userResponse.ok) {
        tests.push({ 
          endpoint: '/users/me', 
          success: true, 
          response_time: Date.now() - userTestStart 
        });
      } else {
        tests.push({ 
          endpoint: '/users/me', 
          success: false, 
          error: `HTTP ${userResponse.status}` 
        });
      }
    } catch (error) {
      tests.push({ 
        endpoint: '/users/me', 
        success: false, 
        error: error.message 
      });
    }

    // Test /users/me/webinars endpoint
    try {
      const webinarTestStart = Date.now();
      const webinarResponse = await fetch('https://api.zoom.us/v2/users/me/webinars?page_size=5', {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (webinarResponse.ok) {
        const webinarData = await webinarResponse.json();
        tests.push({ 
          endpoint: '/users/me/webinars', 
          success: true, 
          response_time: Date.now() - webinarTestStart,
          count: webinarData.webinars?.length || 0
        });
      } else {
        tests.push({ 
          endpoint: '/users/me/webinars', 
          success: false, 
          error: `HTTP ${webinarResponse.status}` 
        });
      }
    } catch (error) {
      tests.push({ 
        endpoint: '/users/me/webinars', 
        success: false, 
        error: error.message 
      });
    }

    const totalTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Performance test completed',
        results: {
          total_time_ms: totalTime,
          tests_run: tests.length,
          tests_passed: tests.filter(t => t.success).length,
          tests_failed: tests.filter(t => !t.success).length,
          details: tests
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Performance test error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Performance test failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
