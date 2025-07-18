import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

interface DeltaSyncRequest {
  connectionId: string;
  lastSyncTime?: string;
  forceFullSync?: boolean;
}

interface WebinarChange {
  webinar_id: string;
  change_type: 'created' | 'updated' | 'deleted';
  last_modified: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { connectionId, lastSyncTime, forceFullSync } = await req.json() as DeltaSyncRequest;

    // Get connection
    const { data: connection, error: connError } = await supabase
      .from('zoom_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (connError || !connection) {
      throw new Error('Connection not found');
    }

    // Determine last successful sync time
    let syncFromTime: Date;
    
    if (forceFullSync) {
      // Full sync - go back 90 days
      syncFromTime = new Date();
      syncFromTime.setDate(syncFromTime.getDate() - 90);
    } else if (lastSyncTime) {
      syncFromTime = new Date(lastSyncTime);
    } else {
      // Get last successful sync
      const { data: lastSync } = await supabase
        .from('zoom_sync_logs')
        .select('completed_at')
        .eq('connection_id', connectionId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      if (lastSync?.completed_at) {
        syncFromTime = new Date(lastSync.completed_at);
      } else {
        // No previous sync - do full sync
        syncFromTime = new Date();
        syncFromTime.setDate(syncFromTime.getDate() - 90);
      }
    }

    // Create sync log
    const { data: syncLog, error: syncError } = await supabase
      .from('zoom_sync_logs')
      .insert({
        connection_id: connectionId,
        status: 'running',
        started_at: new Date().toISOString(),
        sync_type: forceFullSync ? 'full' : 'delta',
        metadata: {
          syncFromTime: syncFromTime.toISOString(),
          deltaSync: !forceFullSync
        }
      })
      .select()
      .single();

    if (syncError || !syncLog) {
      throw new Error('Failed to create sync log');
    }

    // Get access token
    const accessToken = await getZoomAccessToken(supabase, connection);

    // Fetch changes from Zoom
    const changes = await fetchWebinarChanges(
      accessToken,
      syncFromTime,
      new Date()
    );

    // Process changes
    let processed = 0;
    let errors = 0;

    for (const change of changes) {
      try {
        await processWebinarChange(
          supabase,
          accessToken,
          change,
          syncLog.id
        );
        processed++;
        
        // Broadcast progress
        await supabase.from('sync_progress_updates').insert({
          sync_id: syncLog.id,
          update_type: 'progress',
          message: `Processing ${change.change_type} for webinar: ${change.webinar_id}`,
          progress_percentage: (processed / changes.length) * 100
        });
      } catch (error) {
        console.error(`Failed to process change for ${change.webinar_id}:`, error);
        errors++;
      }
    }

    // Update sync log
    await supabase
      .from('zoom_sync_logs')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        webinars_synced: processed,
        metadata: {
          ...syncLog.metadata,
          totalChanges: changes.length,
          processed,
          errors,
          deltaSync: !forceFullSync
        }
      })
      .eq('id', syncLog.id);

    return new Response(
      JSON.stringify({
        success: true,
        syncId: syncLog.id,
        changes: changes.length,
        processed,
        errors,
        syncType: forceFullSync ? 'full' : 'delta'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Delta sync error:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'An error occurred during delta sync'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function getZoomAccessToken(supabase: any, connection: any): Promise<string> {
  // Check if token needs refresh
  const expiresAt = new Date(connection.token_expires_at);
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (expiresAt <= fiveMinutesFromNow) {
    // Token expired or expiring soon, refresh it
    const refreshResponse = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${Deno.env.get('ZOOM_OAUTH_CLIENT_ID')}:${Deno.env.get('ZOOM_OAUTH_CLIENT_SECRET')}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: connection.refresh_token
      })
    });

    if (!refreshResponse.ok) {
      throw new Error('Failed to refresh token');
    }

    const tokens = await refreshResponse.json();
    
    // Update tokens in database
    await supabase
      .from('zoom_connections')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      })
      .eq('id', connection.id);

    return tokens.access_token;
  }

  return connection.access_token;
}

async function fetchWebinarChanges(
  accessToken: string,
  fromTime: Date,
  toTime: Date
): Promise<WebinarChange[]> {
  const changes: WebinarChange[] = [];
  
  // Fetch past webinars that have been modified
  const pastWebinarsResponse = await fetch(
    `https://api.zoom.us/v2/users/me/webinars?type=past&from=${fromTime.toISOString().split('T')[0]}&to=${toTime.toISOString().split('T')[0]}&page_size=100`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (pastWebinarsResponse.ok) {
    const data = await pastWebinarsResponse.json();
    
    for (const webinar of data.webinars || []) {
      // Check if webinar was created or updated after last sync
      const webinarDate = new Date(webinar.start_time);
      if (webinarDate >= fromTime) {
        changes.push({
          webinar_id: webinar.id || webinar.uuid,
          change_type: 'updated', // We'll determine if it's new later
          last_modified: webinar.start_time
        });
      }
    }
  }

  // Fetch upcoming webinars
  const upcomingWebinarsResponse = await fetch(
    `https://api.zoom.us/v2/users/me/webinars?type=scheduled&page_size=100`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (upcomingWebinarsResponse.ok) {
    const data = await upcomingWebinarsResponse.json();
    
    for (const webinar of data.webinars || []) {
      changes.push({
        webinar_id: webinar.id || webinar.uuid,
        change_type: 'updated',
        last_modified: webinar.created_at || new Date().toISOString()
      });
    }
  }

  return changes;
}

async function processWebinarChange(
  supabase: any,
  accessToken: string,
  change: WebinarChange,
  syncId: string
): Promise<void> {
  if (change.change_type === 'deleted') {
    // Mark webinar as deleted
    await supabase
      .from('zoom_webinars')
      .update({ 
        sync_status: 'deleted',
        last_synced_at: new Date().toISOString()
      })
      .eq('webinar_id', change.webinar_id);
    
    return;
  }

  // Fetch full webinar details
  const webinarType = change.last_modified && new Date(change.last_modified) < new Date() ? 'past' : 'upcoming';
  const endpoint = webinarType === 'past' 
    ? `https://api.zoom.us/v2/past_webinars/${change.webinar_id}`
    : `https://api.zoom.us/v2/webinars/${change.webinar_id}`;

  const response = await fetch(endpoint, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch webinar details: ${response.statusText}`);
  }

  const webinarDetails = await response.json();

  // Check if this is a new webinar
  const { data: existingWebinar } = await supabase
    .from('zoom_webinars')
    .select('id')
    .eq('webinar_id', change.webinar_id)
    .single();

  const isNew = !existingWebinar;

  // Prepare data for upsert
  const webinarData = {
    webinar_id: webinarDetails.id || webinarDetails.uuid,
    topic: webinarDetails.topic,
    type: webinarDetails.type,
    start_time: webinarDetails.start_time,
    duration: webinarDetails.duration,
    timezone: webinarDetails.timezone,
    created_at: webinarDetails.created_at,
    start_url: webinarDetails.start_url,
    join_url: webinarDetails.join_url,
    status: webinarDetails.status,
    host_id: webinarDetails.host_id,
    host_email: webinarDetails.host_email,
    // ... include all other fields
    last_synced_at: new Date().toISOString(),
    sync_status: 'synced',
    additional_data: {
      deltaSync: true,
      syncId,
      changeType: isNew ? 'created' : 'updated'
    }
  };

  // Upsert webinar
  await supabase
    .from('zoom_webinars')
    .upsert(webinarData, {
      onConflict: 'webinar_id'
    });
}
