
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { code, state, redirectUri } = await req.json()
    
    console.log('OAuth exchange request received', { code: code?.substring(0, 10) + '...', state })

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Authorization code is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Exchange code for tokens with Zoom
    const clientId = Deno.env.get('ZOOM_CLIENT_ID')
    const clientSecret = Deno.env.get('ZOOM_CLIENT_SECRET')
    
    if (!clientId || !clientSecret) {
      console.error('Missing Zoom OAuth credentials')
      return new Response(
        JSON.stringify({ error: 'OAuth configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const tokenUrl = 'https://zoom.us/oauth/token'
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri || `${new URL(req.url).origin}/auth/zoom/callback`
    })

    const basicAuth = btoa(`${clientId}:${clientSecret}`)
    
    console.log('Exchanging code with Zoom API')
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Zoom token exchange failed:', tokenResponse.status, errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to exchange authorization code' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const tokenData = await tokenResponse.json()
    console.log('Token exchange successful')

    // Get user info from Zoom
    const userInfoResponse = await fetch('https://api.zoom.us/v2/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    })

    if (!userInfoResponse.ok) {
      console.error('Failed to get Zoom user info:', userInfoResponse.status)
      return new Response(
        JSON.stringify({ error: 'Failed to get user information from Zoom' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const zoomUser = await userInfoResponse.json()
    console.log('Got Zoom user info:', { email: zoomUser.email, id: zoomUser.id })

    // Calculate token expiration
    const tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString()

    // Prepare connection data
    const connectionData = {
      user_id: user.id,
      zoom_user_id: zoomUser.id,
      zoom_account_id: zoomUser.account_id || zoomUser.id,
      zoom_email: zoomUser.email,
      access_token: btoa(tokenData.access_token), // Simple base64 encoding for demo
      refresh_token: btoa(tokenData.refresh_token), // Simple base64 encoding for demo
      token_expires_at: tokenExpiresAt,
      connection_status: 'active',
      scopes: tokenData.scope ? tokenData.scope.split(' ') : ['webinar:read:admin', 'user:read:admin'],
      is_primary: true, // Set as primary connection
      auto_sync_enabled: true,
      sync_frequency_hours: 24,
      zoom_account_type: zoomUser.type === 1 ? 'Basic' : zoomUser.type === 2 ? 'Pro' : 'Business'
    }

    // Check if user already has connections and unset primary status
    const { error: unsetError } = await supabase
      .from('zoom_connections')
      .update({ is_primary: false })
      .eq('user_id', user.id)

    if (unsetError) {
      console.warn('Failed to unset existing primary connections:', unsetError)
    }

    // Insert the new connection
    const { data: connection, error: insertError } = await supabase
      .from('zoom_connections')
      .insert(connectionData)
      .select()
      .single()

    if (insertError) {
      console.error('Failed to insert connection:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to save connection' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Connection saved successfully:', connection.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        connection: {
          id: connection.id,
          zoom_email: connection.zoom_email,
          zoom_account_type: connection.zoom_account_type
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error in OAuth exchange:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
