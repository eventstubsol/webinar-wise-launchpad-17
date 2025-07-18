
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  console.log('=== ZOOM OAUTH INIT FUNCTION ===');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const zoomClientId = Deno.env.get('ZOOM_OAUTH_CLIENT_ID');
    const zoomClientSecret = Deno.env.get('ZOOM_OAUTH_CLIENT_SECRET');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    if (!zoomClientId || !zoomClientSecret) {
      console.error('Missing Zoom OAuth credentials');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Zoom OAuth not configured',
          message: 'Please configure your Zoom OAuth credentials in Supabase secrets.',
          configRequired: true
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body
    const requestBody = await req.json().catch(() => ({}));
    const returnUrl = requestBody.returnUrl || '/dashboard';

    // Generate secure state
    const state = crypto.randomUUID();

    // Store state in database for security
    const { error: stateError } = await supabase
      .from('oauth_states')
      .insert({
        state,
        return_url: returnUrl,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
        metadata: {
          origin: req.headers.get('origin'),
          userAgent: req.headers.get('user-agent')?.substring(0, 100)
        }
      });

    if (stateError) {
      console.error('Failed to store OAuth state:', stateError);
      throw new Error('Failed to initialize OAuth flow');
    }

    // Use the frontend callback endpoint instead of the edge function
    const redirectUri = 'https://webinarwise.io/auth/zoom/callback';
    
    const scopes = [
      'user:read',
      'webinar:read',
      'webinar:read:admin', 
      'report:read:admin',
      'recording:read'
    ].join(' ');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: zoomClientId,
      redirect_uri: redirectUri,
      state: state,
      scope: scopes
    });

    const authUrl = `https://zoom.us/oauth/authorize?${params.toString()}`;

    console.log('Generated OAuth URL successfully');
    console.log('Redirect URI:', redirectUri);

    return new Response(
      JSON.stringify({
        success: true,
        authUrl,
        state,
        redirectUri
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in zoom-oauth-init:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
