
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { TokenEncryption } from "../encryption/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { connectionId } = await req.json();

    if (!connectionId) {
      return new Response(
        JSON.stringify({ error: 'Connection ID is required' }),
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
        JSON.stringify({ error: 'User not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the connection
    const { data: connection, error: connectionError } = await serviceClient
      .from('zoom_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single();

    if (connectionError || !connection) {
      console.error('Connection not found:', connectionError);
      return new Response(
        JSON.stringify({ error: 'Connection not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this is a Server-to-Server connection
    const isServerToServer = !connection.refresh_token || connection.refresh_token.includes('SERVER_TO_SERVER_');

    if (isServerToServer) {
      // For Server-to-Server, generate new token using client credentials
      const { data: credentials } = await serviceClient
        .from('zoom_credentials')
        .select('client_id, client_secret, account_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!credentials) {
        return new Response(
          JSON.stringify({ error: 'No active credentials found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokenResponse = await fetch('https://zoom.us/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${credentials.client_id}:${credentials.client_secret}`)}`,
        },
        body: new URLSearchParams({
          grant_type: 'account_credentials',
          account_id: credentials.account_id
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
      const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

      // Encrypt and update connection with new token
      const encryptionSalt = Deno.env.get('ENCRYPTION_SALT') || 'default-salt';
      const encryptedAccessToken = await TokenEncryption.encryptToken(tokenData.access_token, encryptionSalt);
      
      const { data: updatedConnection, error: updateError } = await serviceClient
        .from('zoom_connections')
        .update({
          access_token: encryptedAccessToken,
          token_expires_at: newExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', connectionId)
        .select()
        .single();

      if (updateError) {
        console.error('Failed to update connection:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update connection' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          connection: updatedConnection,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // For OAuth connections, decrypt and use refresh token
      const encryptionSalt = Deno.env.get('ENCRYPTION_SALT') || 'default-salt';
      let refreshToken;
      try {
        refreshToken = await TokenEncryption.decryptToken(connection.refresh_token, encryptionSalt);
      } catch (error) {
        console.error('Failed to decrypt refresh token:', error);
        return new Response(
          JSON.stringify({ error: 'Invalid refresh token' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const tokenResponse = await fetch('https://zoom.us/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('OAuth token refresh failed:', errorText);
        
        // Mark connection as expired
        await serviceClient
          .from('zoom_connections')
          .update({ connection_status: 'expired' })
          .eq('id', connectionId);

        return new Response(
          JSON.stringify({ error: 'OAuth token refresh failed. Please re-authenticate.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokenData = await tokenResponse.json();
      const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

      // Encrypt and update connection with new tokens
      const encryptedAccessToken = await TokenEncryption.encryptToken(tokenData.access_token, encryptionSalt);
      const encryptedRefreshToken = tokenData.refresh_token ? 
        await TokenEncryption.encryptToken(tokenData.refresh_token, encryptionSalt) : 
        connection.refresh_token; // Keep existing if no new one provided
      
      const { data: updatedConnection, error: updateError } = await serviceClient
        .from('zoom_connections')
        .update({
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          token_expires_at: newExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', connectionId)
        .select()
        .single();

      if (updateError) {
        console.error('Failed to update connection:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update connection' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          connection: updatedConnection,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Token refresh error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
