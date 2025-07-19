
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
    const { refresh_token } = await req.json();

    if (!refresh_token) {
      return new Response(
        JSON.stringify({ error: 'Refresh token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const zoomClientId = Deno.env.get('ZOOM_OAUTH_CLIENT_ID');
    const zoomClientSecret = Deno.env.get('ZOOM_OAUTH_CLIENT_SECRET');

    if (!zoomClientId || !zoomClientSecret) {
      return new Response(
        JSON.stringify({ error: 'Zoom OAuth credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Refresh the token
    const tokenResponse = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${zoomClientId}:${zoomClientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token refresh failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to refresh token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await tokenResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || refresh_token,
        expires_in: tokenData.expires_in,
        scope: tokenData.scope,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Token refresh error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
