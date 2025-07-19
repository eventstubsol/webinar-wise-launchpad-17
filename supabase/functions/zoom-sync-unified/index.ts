
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SyncRequest {
  action: 'start' | 'progress' | 'cancel'
  connectionId?: string
  syncType?: string
  syncId?: string
  webinarId?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, connectionId, syncType, syncId, webinarId }: SyncRequest = await req.json()

    console.log(`🚀 Zoom Sync Unified - Action: ${action}`, { connectionId, syncType, syncId, webinarId })

    switch (action) {
      case 'start':
        return await handleStartSync(supabaseClient, connectionId!, syncType || 'incremental', webinarId)
      
      case 'progress':
        return await handleGetProgress(supabaseClient, syncId!)
      
      case 'cancel':
        return await handleCancelSync(supabaseClient, syncId!)
      
      default:
        throw new Error(`Unknown action: ${action}`)
    }

  } catch (error) {
    console.error('Zoom Sync Unified Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function handleStartSync(supabase: any, connectionId: string, syncType: string, webinarId?: string) {
  console.log(`🔄 Starting sync for connection: ${connectionId}, type: ${syncType}`)
  
  // Get connection details
  const { data: connection, error: connError } = await supabase
    .from('zoom_connections')
    .select('*')
    .eq('id', connectionId)
    .single()

  if (connError || !connection) {
    throw new Error('Connection not found or access denied')
  }

  // Create sync log
  const { data: syncLog, error: logError } = await supabase
    .from('zoom_sync_logs')
    .insert({
      connection_id: connectionId,
      sync_type: syncType,
      sync_status: 'running',
      started_at: new Date().toISOString(),
      sync_stage: 'initializing',
      stage_progress_percentage: 5,
      total_items: 0,
      processed_items: 0
    })
    .select()
    .single()

  if (logError) {
    throw new Error(`Failed to create sync log: ${logError.message}`)
  }

  console.log(`📝 Created sync log: ${syncLog.id}`)

  // Start the sync process asynchronously
  performSync(supabase, syncLog.id, connection, syncType, webinarId)
    .catch(error => {
      console.error('Sync process error:', error)
      // Update sync log with error
      supabase
        .from('zoom_sync_logs')
        .update({
          sync_status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', syncLog.id)
    })

  return new Response(
    JSON.stringify({
      success: true,
      syncId: syncLog.id,
      message: 'Sync started successfully'
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function performSync(supabase: any, syncLogId: string, connection: any, syncType: string, webinarId?: string) {
  try {
    console.log(`🔄 Performing sync for log: ${syncLogId}`)

    // Update progress to fetching webinars
    await updateSyncProgress(supabase, syncLogId, 20, 'Fetching webinars from Zoom...')

    // Get fresh access token if needed
    const accessToken = await getValidAccessToken(supabase, connection)
    
    // Fetch webinars from Zoom
    const webinars = await fetchWebinarsFromZoom(accessToken, connection.zoom_user_id, webinarId)
    
    console.log(`📊 Found ${webinars.length} webinars to sync`)

    // Update sync log with total items
    await supabase
      .from('zoom_sync_logs')
      .update({
        total_items: webinars.length,
        stage_progress_percentage: 30
      })
      .eq('id', syncLogId)

    let processedCount = 0
    
    // Process each webinar
    for (const webinar of webinars) {
      try {
        await processWebinar(supabase, connection.id, webinar)
        processedCount++
        
        // Update progress
        const progress = 30 + Math.floor((processedCount / webinars.length) * 60)
        await updateSyncProgress(
          supabase, 
          syncLogId, 
          progress, 
          `Processing webinar: ${webinar.topic} (${processedCount}/${webinars.length})`
        )
        
        // Small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (webinarError) {
        console.error(`Error processing webinar ${webinar.id}:`, webinarError)
        // Continue with next webinar
      }
    }

    // Complete the sync
    await supabase
      .from('zoom_sync_logs')
      .update({
        sync_status: 'completed',
        processed_items: processedCount,
        completed_at: new Date().toISOString(),
        stage_progress_percentage: 100,
        sync_stage: 'completed'
      })
      .eq('id', syncLogId)

    // Update connection last sync time
    await supabase
      .from('zoom_connections')
      .update({
        last_sync_at: new Date().toISOString()
      })
      .eq('id', connection.id)

    console.log(`✅ Sync completed successfully: ${processedCount}/${webinars.length} webinars`)

  } catch (error) {
    console.error('Sync execution error:', error)
    
    await supabase
      .from('zoom_sync_logs')
      .update({
        sync_status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', syncLogId)
    
    throw error
  }
}

async function getValidAccessToken(supabase: any, connection: any): Promise<string> {
  const tokenExpiresAt = new Date(connection.token_expires_at)
  const now = new Date()
  
  if (tokenExpiresAt <= now) {
    console.log('🔄 Token expired, refreshing...')
    
    if (connection.connection_type === 'server_to_server') {
      // Get user credentials for server-to-server refresh
      const { data: credentials } = await supabase
        .from('zoom_credentials')
        .select('*')
        .eq('user_id', connection.user_id)
        .eq('is_active', true)
        .single()

      if (!credentials) {
        throw new Error('No active Zoom credentials found')
      }

      const tokenData = await getServerToServerToken(
        credentials.client_id,
        credentials.client_secret,
        credentials.account_id
      )

      // Update connection with new token
      const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString()
      
      await supabase
        .from('zoom_connections')
        .update({
          access_token: tokenData.access_token,
          token_expires_at: newExpiresAt
        })
        .eq('id', connection.id)

      return tokenData.access_token
    } else {
      throw new Error('OAuth token refresh not implemented in this simplified version')
    }
  }
  
  return connection.access_token
}

async function getServerToServerToken(clientId: string, clientSecret: string, accountId: string) {
  const tokenUrl = 'https://zoom.us/oauth/token'
  const auth = btoa(`${clientId}:${clientSecret}`)
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'account_credentials',
      account_id: accountId
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error_description || 'Failed to get access token')
  }

  return await response.json()
}

async function fetchWebinarsFromZoom(accessToken: string, userId: string, webinarId?: string): Promise<any[]> {
  const baseUrl = 'https://api.zoom.us/v2'
  
  if (webinarId) {
    // Fetch single webinar
    const response = await fetch(`${baseUrl}/webinars/${webinarId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch webinar ${webinarId}`)
    }

    const webinar = await response.json()
    return [webinar]
  } else {
    // Fetch all webinars
    const response = await fetch(`${baseUrl}/users/${userId}/webinars?page_size=100`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch webinars')
    }

    const data = await response.json()
    return data.webinars || []
  }
}

async function processWebinar(supabase: any, connectionId: string, webinar: any) {
  // Check if webinar exists
  const { data: existingWebinar } = await supabase
    .from('zoom_webinars')
    .select('id')
    .eq('zoom_webinar_id', webinar.id)
    .eq('connection_id', connectionId)
    .single()

  const webinarData = {
    connection_id: connectionId,
    zoom_webinar_id: webinar.id,
    webinar_id: webinar.id,
    uuid: webinar.uuid || webinar.id,
    topic: webinar.topic,
    start_time: webinar.start_time,
    duration: webinar.duration,
    timezone: webinar.timezone,
    agenda: webinar.agenda,
    type: webinar.type,
    status: webinar.status || 'scheduled',
    join_url: webinar.join_url,
    host_id: webinar.host_id || 'unknown',
    sync_status: 'completed',
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  if (existingWebinar) {
    // Update existing webinar
    await supabase
      .from('zoom_webinars')
      .update(webinarData)
      .eq('id', existingWebinar.id)
  } else {
    // Insert new webinar
    await supabase
      .from('zoom_webinars')
      .insert({
        ...webinarData,
        created_at: new Date().toISOString()
      })
  }
}

async function updateSyncProgress(supabase: any, syncLogId: string, percentage: number, stage: string) {
  await supabase
    .from('zoom_sync_logs')
    .update({
      stage_progress_percentage: percentage,
      sync_stage: stage,
      updated_at: new Date().toISOString()
    })
    .eq('id', syncLogId)
}

async function handleGetProgress(supabase: any, syncId: string) {
  const { data: syncLog, error } = await supabase
    .from('zoom_sync_logs')
    .select('*')
    .eq('id', syncId)
    .single()

  if (error || !syncLog) {
    throw new Error('Sync log not found')
  }

  return new Response(
    JSON.stringify({
      success: true,
      status: syncLog.sync_status,
      progress: syncLog.stage_progress_percentage || 0,
      currentOperation: syncLog.sync_stage || 'Processing...',
      processed_items: syncLog.processed_items || 0,
      total_items: syncLog.total_items || 0,
      error_message: syncLog.error_message
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function handleCancelSync(supabase: any, syncId: string) {
  await supabase
    .from('zoom_sync_logs')
    .update({
      sync_status: 'cancelled',
      completed_at: new Date().toISOString(),
      sync_stage: 'cancelled'
    })
    .eq('id', syncId)

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Sync cancelled successfully'
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}
