import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('No authorization header provided')
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Set the auth header for the client
    supabaseClient.auth.setSession = () => Promise.resolve({ data: { session: null }, error: null })
    
    // Get user from JWT
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      console.log('Error getting user:', userError)
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Syncing user role for user: ${user.id}`)

    // Check if user has a profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      console.log('Error fetching profile:', profileError)
      return new Response(
        JSON.stringify({ error: 'Error fetching user profile' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // If no profile exists, create one
    if (!profile) {
      console.log('Creating profile for user:', user.id)
      const { error: createProfileError } = await supabaseClient
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || user.email || '',
          is_zoom_admin: false
        })

      if (createProfileError) {
        console.log('Error creating profile:', createProfileError)
        return new Response(
          JSON.stringify({ error: 'Error creating user profile' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // Check if user has any Zoom connections
    const { data: connections, error: connectionsError } = await supabaseClient
      .from('zoom_connections')
      .select('*')
      .eq('user_id', user.id)

    if (connectionsError) {
      console.log('Error fetching Zoom connections:', connectionsError)
      // Don't return error here - this is normal for new users
      connections = []
    }

    // Update profile with Zoom admin status if they have connections
    const isZoomAdmin = connections && connections.length > 0 && 
      connections.some((conn: any) => conn.zoom_account_type === 'paid' || conn.zoom_account_type === 'pro')

    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ 
        is_zoom_admin: isZoomAdmin,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.log('Error updating profile:', updateError)
      return new Response(
        JSON.stringify({ error: 'Error updating user profile' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Successfully synced user role for ${user.id}. Zoom admin: ${isZoomAdmin}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: user.id,
        is_zoom_admin: isZoomAdmin,
        connections_count: connections?.length || 0
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Unexpected error in sync-zoom-user-role:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})