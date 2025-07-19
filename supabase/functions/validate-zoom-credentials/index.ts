
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== VALIDATE ZOOM CREDENTIALS START ===')
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header provided')
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('Token received, length:', token.length)

    // Create Supabase client with service key for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    // Create client with user token for auth verification
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      auth: { persistSession: false },
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    })

    // Verify the user token
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token)
    if (authError || !user) {
      console.error('User authentication failed:', authError)
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed',
          details: authError?.message 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User authenticated:', user.id)

    const { account_id, client_id, client_secret } = await req.json()

    if (!account_id || !client_id || !client_secret) {
      console.error('Missing required credentials')
      return new Response(
        JSON.stringify({ error: 'Missing required credentials' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Validating credentials with Zoom API...')

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
    console.log('Zoom token obtained successfully')
    
    // Test the token by making a simple API call
    const testResponse = await fetch('https://api.zoom.us/v2/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    })

    if (!testResponse.ok) {
      console.error('Zoom API test failed:', testResponse.status)
      return new Response(
        JSON.stringify({ 
          error: 'Zoom API access failed',
          details: 'Credentials are valid but API access is limited'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userInfo = await testResponse.json()
    console.log('Zoom user info retrieved:', userInfo.email)

    // Check for existing connection and remove it if it exists
    console.log('Checking for existing connections...')
    const { data: existingConnections, error: existingError } = await supabaseAdmin
      .from('zoom_connections')
      .select('id')
      .eq('user_id', user.id)

    if (existingError) {
      console.error('Error checking existing connections:', existingError)
    } else if (existingConnections && existingConnections.length > 0) {
      console.log(`Found ${existingConnections.length} existing connections, removing them...`)
      const { error: deleteError } = await supabaseAdmin
        .from('zoom_connections')
        .delete()
        .eq('user_id', user.id)
      
      if (deleteError) {
        console.error('Error deleting existing connections:', deleteError)
      } else {
        console.log('Existing connections removed successfully')
      }
    }

    // Create zoom connection record using service key to bypass RLS
    const connectionData = {
      user_id: user.id,
      zoom_user_id: userInfo.id,
      zoom_account_id: account_id,
      zoom_email: userInfo.email,
      zoom_account_type: userInfo.type === 1 ? 'Basic' : 'Licensed',
      access_token: tokenData.access_token,
      token_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
      connection_status: 'active',
      connection_type: 'server_to_server',
      client_id: client_id,
      client_secret: client_secret,
      account_id: account_id,
      scopes: tokenData.scope ? tokenData.scope.split(' ') : [],
      is_primary: true,
      auto_sync_enabled: true,
      sync_frequency_hours: 24
    }

    console.log('Creating zoom connection...')
    const { data: connection, error: connectionError } = await supabaseAdmin
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

    console.log('Connection created successfully:', connection.id)

    return new Response(
      JSON.stringify({ 
        success: true,
        connection: {
          id: connection.id,
          zoom_email: connection.zoom_email,
          zoom_account_type: connection.zoom_account_type,
          connection_status: connection.connection_status,
          created_at: connection.created_at
        },
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
