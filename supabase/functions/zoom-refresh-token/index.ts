
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request): Promise<Response> => {
  console.log('=== ZOOM TOKEN REFRESH FUNCTION START ===');
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { connectionId } = await req.json();

    if (!connectionId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Connection ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🔄 Refreshing token for connection: ${connectionId}`);

    // Create authenticated client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('❌ User authentication failed:', userError);
      return new Response(
        JSON.stringify({ success: false, error: 'User not authenticated' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Use service role client for database operations
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the connection with user verification
    const { data: connection, error: connectionError } = await serviceClient
      .from('zoom_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single();

    if (connectionError || !connection) {
      console.error('❌ Connection not found:', connectionError);
      return new Response(
        JSON.stringify({ success: false, error: 'Connection not found or access denied' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`✅ Found connection: ${connection.connection_type} for user ${user.id}`);

    // Check if this is a Server-to-Server connection
    const isServerToServer = connection.connection_type === 'server_to_server' || 
                             !connection.refresh_token || 
                             connection.refresh_token.includes('SERVER_TO_SERVER_');

    if (isServerToServer) {
      console.log('🔧 Refreshing Server-to-Server token...');
      
      // Get user's credentials for Server-to-Server refresh
      const { data: credentials } = await serviceClient
        .from('zoom_credentials')
        .select('client_id, client_secret, account_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!credentials) {
        console.error('❌ No active credentials found for user');
        return new Response(
          JSON.stringify({ success: false, error: 'No active credentials found' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Get new token using Server-to-Server OAuth
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
        console.error('❌ Server-to-Server token refresh failed:', errorText);
        
        // Update connection status to expired
        await serviceClient
          .from('zoom_connections')
          .update({ 
            connection_status: 'expired',
            updated_at: new Date().toISOString()
          })
          .eq('id', connectionId);

        return new Response(
          JSON.stringify({ success: false, error: 'Failed to refresh Server-to-Server token' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const tokenData = await tokenResponse.json();
      const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

      console.log(`✅ Got new Server-to-Server token, expires at: ${newExpiresAt}`);

      // Update connection with new token
      const { data: updatedConnection, error: updateError } = await serviceClient
        .from('zoom_connections')
        .update({
          access_token: tokenData.access_token,
          token_expires_at: newExpiresAt,
          connection_status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', connectionId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Failed to update connection:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update connection' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('✅ Server-to-Server token refresh completed successfully');

      return new Response(
        JSON.stringify({
          success: true,
          connection: updatedConnection,
          refreshType: 'server_to_server'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      console.log('🔧 Refreshing OAuth token...');

      // Handle OAuth token refresh
      if (!connection.refresh_token) {
        console.error('❌ No refresh token available for OAuth connection');
        return new Response(
          JSON.stringify({ success: false, error: 'No refresh token available' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const tokenResponse = await fetch('https://zoom.us/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: connection.refresh_token,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('❌ OAuth token refresh failed:', errorText);
        
        // Mark connection as expired
        await serviceClient
          .from('zoom_connections')
          .update({ 
            connection_status: 'expired',
            updated_at: new Date().toISOString()
          })
          .eq('id', connectionId);

        return new Response(
          JSON.stringify({ success: false, error: 'OAuth token refresh failed. Please re-authenticate.' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const tokenData = await tokenResponse.json();
      const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

      console.log(`✅ Got new OAuth token, expires at: ${newExpiresAt}`);

      // Update connection with new tokens
      const { data: updatedConnection, error: updateError } = await serviceClient
        .from('zoom_connections')
        .update({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || connection.refresh_token,
          token_expires_at: newExpiresAt,
          connection_status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', connectionId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Failed to update connection:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update connection' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('✅ OAuth token refresh completed successfully');

      return new Response(
        JSON.stringify({
          success: true,
          connection: updatedConnection,
          refreshType: 'oauth'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('💥 Token refresh error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
