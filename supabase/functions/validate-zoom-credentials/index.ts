import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    })

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { account_id, client_id, client_secret } = await req.json()

    if (!account_id || !client_id || !client_secret) {
      return new Response(
        JSON.stringify({ error: 'Missing required credentials' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate credentials by trying to get an access token
    const tokenResponse = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${client_id}:${client_secret}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'account_credentials',
        account_id: account_id
      })
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Zoom token validation failed:', errorData)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid Zoom credentials',
          details: 'Unable to authenticate with Zoom API'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tokenData = await tokenResponse.json()
    
    // Test the token by making a simple API call
    const testResponse = await fetch('https://api.zoom.us/v2/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    })

    if (!testResponse.ok) {
      return new Response(
        JSON.stringify({ 
          error: 'Zoom API access failed',
          details: 'Credentials are valid but API access is limited'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userInfo = await testResponse.json()

    // Create zoom connection record
    const connectionData = {
      user_id: user.id,
      zoom_user_id: userInfo.id,
      zoom_account_id: account_id,
      zoom_email: userInfo.email,
      zoom_account_type: userInfo.type,
      access_token: tokenData.access_token,
      token_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
      connection_status: 'active',
      connection_type: 'server_to_server',
      client_id: client_id,
      client_secret: client_secret,
      account_id: account_id,
      scopes: tokenData.scope ? tokenData.scope.split(' ') : []
    }

    const { data: connection, error: connectionError } = await supabase
      .from('zoom_connections')
      .insert(connectionData)
      .select()
      .single()

    if (connectionError) {
      console.error('Error creating zoom connection:', connectionError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to save connection',
          details: connectionError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        connection: connection,
        message: 'Zoom credentials validated and connection established successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Validation error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})