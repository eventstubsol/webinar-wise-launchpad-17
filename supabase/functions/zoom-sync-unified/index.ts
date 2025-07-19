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
    console.log(`🔄 Performing enhanced sync for log: ${syncLogId}`)

    // Phase 1: Update progress to fetching webinars
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
    
    // Phase 2: Process each webinar with enhanced data collection
    for (const webinar of webinars) {
      try {
        await processWebinarWithEnhancedData(supabase, connection.id, webinar, accessToken)
        processedCount++
        
        // Update progress
        const progress = 30 + Math.floor((processedCount / webinars.length) * 50)
        await updateSyncProgress(
          supabase, 
          syncLogId, 
          progress, 
          `Processing webinar: ${webinar.topic} (${processedCount}/${webinars.length})`
        )
        
        // Small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))
        
      } catch (webinarError) {
        console.error(`Error processing webinar ${webinar.id}:`, webinarError)
        // Continue with next webinar
      }
    }

    // Phase 3: Post-sync validation and status correction
    await updateSyncProgress(supabase, syncLogId, 85, 'Validating webinar statuses...')
    
    try {
      const { data: statusCorrection } = await supabase
        .rpc('system_update_webinar_statuses_with_logging')
      
      if (statusCorrection && statusCorrection.length > 0) {
        const result = statusCorrection[0]
        console.log(`📊 Status validation complete: ${result.updated_count} corrections, ${result.upcoming_count} upcoming, ${result.live_count} live, ${result.ended_count} ended`)
        
        if (result.corrections_made && result.corrections_made.length > 0) {
          console.log('🔧 Status corrections made:', result.corrections_made)
        }
      }
    } catch (validationError) {
      console.warn('Status validation failed:', validationError)
      // Don't fail the entire sync for validation errors
    }

    // Phase 4: Complete the sync with summary
    const { data: finalStats } = await supabase
      .from('zoom_webinars')
      .select('total_registrants, total_attendees')
      .eq('connection_id', connection.id)

    const totalRegistrants = finalStats?.reduce((sum: number, w: any) => sum + (w.total_registrants || 0), 0) || 0
    const totalAttendees = finalStats?.reduce((sum: number, w: any) => sum + (w.total_attendees || 0), 0) || 0

    await supabase
      .from('zoom_sync_logs')
      .update({
        sync_status: 'completed',
        processed_items: processedCount,
        completed_at: new Date().toISOString(),
        stage_progress_percentage: 100,
        sync_stage: 'completed',
        metadata: {
          webinars_processed: processedCount,
          total_registrants: totalRegistrants,
          total_attendees: totalAttendees
        }
      })
      .eq('id', syncLogId)

    // Update connection last sync time
    await supabase
      .from('zoom_connections')
      .update({
        last_sync_at: new Date().toISOString()
      })
      .eq('id', connection.id)

    console.log(`✅ Enhanced sync completed successfully: ${processedCount}/${webinars.length} webinars, ${totalRegistrants} registrants, ${totalAttendees} attendees`)

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

async function processWebinarWithEnhancedData(supabase: any, connectionId: string, webinar: any, accessToken: string) {
  console.log(`🔄 Processing webinar with enhanced data: ${webinar.topic}`)
  
  // Step 1: Process basic webinar data (existing logic)
  const webinarDbRecord = await processWebinar(supabase, connectionId, webinar)
  
  // Step 2: Fetch and process registrant data (available for all webinars)
  try {
    const registrants = await fetchWebinarRegistrants(accessToken, webinar.id)
    if (registrants.length > 0) {
      await saveRegistrantsToDatabase(supabase, webinarDbRecord.id, registrants)
      console.log(`📋 Saved ${registrants.length} registrants for webinar: ${webinar.topic}`)
    }
  } catch (registrantError) {
    console.warn(`Failed to fetch registrants for webinar ${webinar.id}:`, registrantError.message)
  }

  // Step 3: Fetch and process participant data (only for ended webinars)
  const webinarStatus = calculateWebinarStatus(webinar.start_time, webinar.duration)
  if (webinarStatus === 'ended') {
    try {
      const participants = await fetchWebinarParticipants(accessToken, webinar.id)
      if (participants.length > 0) {
        await saveParticipantsToDatabase(supabase, webinarDbRecord.id, participants)
        console.log(`👥 Saved ${participants.length} participants for webinar: ${webinar.topic}`)
        
        // Update participant sync status
        await supabase
          .from('zoom_webinars')
          .update({
            participant_sync_status: 'completed',
            participant_sync_completed_at: new Date().toISOString()
          })
          .eq('id', webinarDbRecord.id)
      } else {
        // Mark as completed even if no participants found
        await supabase
          .from('zoom_webinars')
          .update({
            participant_sync_status: 'completed',
            participant_sync_completed_at: new Date().toISOString()
          })
          .eq('id', webinarDbRecord.id)
      }
    } catch (participantError) {
      console.warn(`Failed to fetch participants for webinar ${webinar.id}:`, participantError.message)
      
      // Mark as failed with error
      await supabase
        .from('zoom_webinars')
        .update({
          participant_sync_status: 'failed',
          participant_sync_error: participantError.message,
          participant_sync_attempted_at: new Date().toISOString()
        })
        .eq('id', webinarDbRecord.id)
    }
  } else {
    // Mark as not applicable for upcoming/live webinars
    await supabase
      .from('zoom_webinars')
      .update({
        participant_sync_status: webinarStatus === 'upcoming' ? 'not_applicable' : 'eligible'
      })
      .eq('id', webinarDbRecord.id)
  }

  return webinarDbRecord
}

async function fetchWebinarRegistrants(accessToken: string, webinarId: string): Promise<any[]> {
  const allRegistrants: any[] = []
  const statuses = ['approved', 'pending', 'denied']
  
  for (const status of statuses) {
    let nextPageToken: string | undefined
    let hasMore = true
    
    while (hasMore) {
      const url = `https://api.zoom.us/v2/webinars/${webinarId}/registrants?status=${status}&page_size=300${nextPageToken ? `&next_page_token=${nextPageToken}` : ''}`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limit hit, wait and retry
          await new Promise(resolve => setTimeout(resolve, 2000))
          continue
        }
        throw new Error(`Failed to fetch registrants: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const registrants = data.registrants || []
      
      // Add status to each registrant
      const statusRegistrants = registrants.map((r: any) => ({
        ...r,
        registration_status: status
      }))
      
      allRegistrants.push(...statusRegistrants)
      
      nextPageToken = data.next_page_token
      hasMore = !!nextPageToken && registrants.length === 300
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  
  return allRegistrants
}

async function fetchWebinarParticipants(accessToken: string, webinarId: string): Promise<any[]> {
  const allParticipants: any[] = []
  let nextPageToken: string | undefined
  let hasMore = true
  
  while (hasMore) {
    // Try detailed participants report first
    let url = `https://api.zoom.us/v2/report/webinars/${webinarId}/participants?page_size=300${nextPageToken ? `&next_page_token=${nextPageToken}` : ''}`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      if (response.status === 429) {
        // Rate limit hit, wait and retry
        await new Promise(resolve => setTimeout(resolve, 2000))
        continue
      }
      
      // If detailed report fails, try basic participants endpoint
      if (response.status === 404) {
        url = `https://api.zoom.us/v2/past_webinars/${webinarId}/participants?page_size=300${nextPageToken ? `&next_page_token=${nextPageToken}` : ''}`
        
        const basicResponse = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (!basicResponse.ok) {
          throw new Error(`Failed to fetch participants: ${basicResponse.status} ${basicResponse.statusText}`)
        }
        
        const basicData = await basicResponse.json()
        const participants = basicData.participants || []
        allParticipants.push(...participants)
        
        nextPageToken = basicData.next_page_token
        hasMore = !!nextPageToken && participants.length === 300
      } else {
        throw new Error(`Failed to fetch participants: ${response.status} ${response.statusText}`)
      }
    } else {
      const data = await response.json()
      const participants = data.participants || []
      allParticipants.push(...participants)
      
      nextPageToken = data.next_page_token
      hasMore = !!nextPageToken && participants.length === 300
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  return allParticipants
}

async function saveRegistrantsToDatabase(supabase: any, webinarDbId: string, registrants: any[]) {
  let savedCount = 0
  
  for (const registrant of registrants) {
    try {
      const registrantData = {
        webinar_id: webinarDbId,
        registrant_id: registrant.id || registrant.registrant_id || `reg_${Date.now()}_${Math.random()}`,
        email: registrant.email || 'unknown@example.com',
        first_name: registrant.first_name || null,
        last_name: registrant.last_name || null,
        address: registrant.address || null,
        city: registrant.city || null,
        country: registrant.country || null,
        zip: registrant.zip || null,
        state: registrant.state || null,
        phone: registrant.phone || null,
        industry: registrant.industry || null,
        org: registrant.org || null,
        job_title: registrant.job_title || null,
        purchasing_time_frame: registrant.purchasing_time_frame || null,
        role_in_purchase_process: registrant.role_in_purchase_process || null,
        no_of_employees: registrant.no_of_employees || null,
        comments: registrant.comments || null,
        status: registrant.registration_status || registrant.status || 'approved',
        join_url: registrant.join_url || null,
        registration_time: registrant.create_time || registrant.registration_time || null,
        custom_questions: registrant.custom_questions ? JSON.stringify(registrant.custom_questions) : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('zoom_registrants')
        .upsert(registrantData, {
          onConflict: 'webinar_id,registrant_id',
          ignoreDuplicates: false
        })

      if (!error) {
        savedCount++
      } else {
        console.warn('Failed to save registrant:', error.message)
      }
    } catch (error) {
      console.warn('Error processing registrant:', error)
    }
  }

  // Update webinar registrant count
  await supabase
    .from('zoom_webinars')
    .update({
      total_registrants: savedCount,
      updated_at: new Date().toISOString()
    })
    .eq('id', webinarDbId)

  return savedCount
}

async function saveParticipantsToDatabase(supabase: any, webinarDbId: string, participants: any[]) {
  let savedCount = 0
  
  for (const participant of participants) {
    try {
      const participantData = {
        webinar_id: webinarDbId,
        participant_uuid: participant.participant_uuid || participant.uuid || null,
        participant_user_id: participant.user_id || participant.participant_user_id || null,
        participant_name: participant.name || participant.participant_name || 'Unknown Participant',
        participant_email: participant.email || participant.participant_email || null,
        join_time: participant.join_time || null,
        leave_time: participant.leave_time || null,
        duration: participant.duration || null,
        attentiveness_score: participant.attentiveness_score?.toString() || null,
        approval_type: participant.approval_type || null,
        connection_type: participant.connection_type || null,
        registration_time: participant.registration_time || null,
        custom_questions: participant.custom_questions ? JSON.stringify(participant.custom_questions) : null,
        is_rejoin_session: participant.is_rejoin_session || false,
        user_location: participant.user_location ? JSON.stringify(participant.user_location) : null,
        device_info: participant.device_info ? JSON.stringify(participant.device_info) : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('zoom_participants')
        .upsert(participantData, {
          onConflict: 'webinar_id,participant_uuid',
          ignoreDuplicates: false
        })

      if (!error) {
        savedCount++
      } else {
        console.warn('Failed to save participant:', error.message)
      }
    } catch (error) {
      console.warn('Error processing participant:', error)
    }
  }

  // Update webinar attendee count and calculate metrics
  const totalMinutes = participants.reduce((sum, p) => sum + (p.duration || 0), 0)
  const avgDuration = savedCount > 0 ? Math.round(totalMinutes / savedCount) : 0

  await supabase
    .from('zoom_webinars')
    .update({
      total_attendees: savedCount,
      total_minutes: totalMinutes,
      avg_attendance_duration: avgDuration,
      updated_at: new Date().toISOString()
    })
    .eq('id', webinarDbId)

  return savedCount
}

function calculateWebinarStatus(startTime: string, duration: number): string {
  if (!startTime || !duration) return 'unknown'
  
  const now = new Date()
  const start = new Date(startTime)
  const end = new Date(start.getTime() + duration * 60 * 1000)
  const endWithBuffer = new Date(end.getTime() + 5 * 60 * 1000) // 5 minute buffer
  
  if (now < start) return 'upcoming'
  if (now >= start && now <= endWithBuffer) return 'live'
  return 'ended'
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

  if (existingWebinar) {
    // Update existing webinar - REMOVED status field to prevent overriding database calculation
    const updateData = {
      zoom_webinar_id: webinar.id,
      webinar_id: webinar.id,
      uuid: webinar.uuid || webinar.id,
      topic: webinar.topic,
      start_time: webinar.start_time,
      duration: webinar.duration,
      timezone: webinar.timezone,
      agenda: webinar.agenda,
      type: webinar.type,
      join_url: webinar.join_url,
      host_id: webinar.host_id || 'unknown',
      sync_status: 'completed',
      last_synced_at: new Date().toISOString()
      // Note: status field removed - let database trigger calculate the correct status
    }

    await supabase
      .from('zoom_webinars')
      .update(updateData)
      .eq('id', existingWebinar.id)
    
    return existingWebinar
  } else {
    // Insert new webinar - include status only for new records, trigger will calculate proper value
    const insertData = {
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
      status: webinar.status || 'scheduled', // Database trigger will override with calculated status
      join_url: webinar.join_url,
      host_id: webinar.host_id || 'unknown',
      sync_status: 'completed',
      last_synced_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('zoom_webinars')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to insert webinar: ${error.message}`)
    }

    return data
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
      error_message: syncLog.error_message,
      metadata: syncLog.metadata
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
