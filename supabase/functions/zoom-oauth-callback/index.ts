
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, zoom_connection_id, test_mode',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  console.log('=== ZOOM OAUTH CALLBACK FUNCTION ===');
  console.log('This function redirects to the correct sync function');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables');
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Log the request for debugging
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));

    // Forward the request to the correct sync function
    const syncFunctionUrl = `${supabaseUrl}/functions/v1/zoom-sync-webinars`;
    
    // Get the request body if it exists
    let body = null;
    if (req.method === 'POST' || req.method === 'PUT') {
      body = await req.text();
    }

    console.log('Forwarding to zoom-sync-webinars function...');

    // Forward the request
    const response = await fetch(syncFunctionUrl, {
      method: req.method,
      headers: {
        'Authorization': req.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
        'x-supabase-service-role-key': supabaseServiceKey
      },
      body: body
    });

    const responseData = await response.text();
    
    console.log('Response status:', response.status);
    console.log('Response data:', responseData);

    // Return the response
    return new Response(responseData, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error in zoom-oauth-callback:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        note: 'This is a redirect function. The actual sync function is zoom-sync-webinars.'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
