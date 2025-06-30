import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  webinarId?: string;
  connectionId?: string;
  forceSync?: boolean;
}

// Helper to get access token
async function getZoomAccessToken(supabase: any, connectionId: string): Promise<string> {
  const { data: connection, error } = await supabase
    .from('zoom_connections')
    .select('access_token, connection_type')
    .eq('id', connectionId)
    .single();

  if (error || !connection) {
    throw new Error('Connection not found');
  }

  return connection.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { webinarId, connectionId, forceSync = false } = await req.json() as SyncRequest;

    console.log('=== SYNCING WEBINAR ATTENDEES ===');
    console.log(`Webinar ID: ${webinarId}`);
    console.log(`Force sync: ${forceSync}`);

    // Get webinar details
    const { data: webinar, error: webinarError } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('zoom_webinar_id', webinarId)
      .eq('connection_id', connectionId)
      .single();

    if (webinarError || !webinar) {
      throw new Error(`Webinar not found: ${webinarId}`);
    }

    console.log(`Found webinar: ${webinar.topic}`);
    console.log(`UUID: ${webinar.uuid}`);
    console.log(`Status: ${webinar.status}`);
    console.log(`Registrants: ${webinar.total_registrants}`);

    // Get access token
    const accessToken = await getZoomAccessToken(supabase, connectionId);

    // For past webinars, we need to use the report API endpoint which gives us ALL participants
    let allParticipants: any[] = [];
    let nextPageToken: string | undefined;
    let pageCount = 0;
    let totalRecords = 0;

    // Try multiple endpoints to get participants
    const endpoints = [
      // 1. Try the report endpoint first (most comprehensive)
      `/report/webinars/${webinar.zoom_webinar_id}/participants`,
      // 2. Try with UUID if available
      webinar.uuid ? `/report/webinars/${encodeURIComponent(webinar.uuid)}/participants` : null,
      // 3. Try past_webinars endpoint
      `/past_webinars/${webinar.zoom_webinar_id}/participants`,
      // 4. Try past_webinars with UUID
      webinar.uuid ? `/past_webinars/${encodeURIComponent(webinar.uuid)}/participants` : null,
    ].filter(Boolean);

    let successfulEndpoint = null;

    for (const endpoint of endpoints) {
      try {
        console.log(`\nTrying endpoint: ${endpoint}`);
        allParticipants = [];
        nextPageToken = undefined;
        pageCount = 0;

        do {
          const url = `https://api.zoom.us/v2${endpoint}?page_size=300${nextPageToken ? `&next_page_token=${nextPageToken}` : ''}`;
          
          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.log(`Failed with ${response.status}: ${errorText}`);
            break;
          }

          const data = await response.json();
          const participants = data.participants || [];
          totalRecords = data.total_records || 0;
          
          console.log(`Page ${pageCount + 1}: Found ${participants.length} participants (Total: ${totalRecords})`);
          
          allParticipants.push(...participants);
          nextPageToken = data.next_page_token;
          pageCount++;

          // Safety limit
          if (pageCount > 50) {
            console.log('Reached page limit, stopping pagination');
            break;
          }
        } while (nextPageToken);

        if (allParticipants.length > 0) {
          successfulEndpoint = endpoint;
          console.log(`✓ Successfully fetched ${allParticipants.length} participants from ${endpoint}`);
          break;
        }
      } catch (error) {
        console.error(`Error with endpoint ${endpoint}:`, error);
      }
    }

    if (allParticipants.length === 0) {
      console.log('No participants found from any endpoint');
      
      // Update webinar to indicate no participants
      await supabase
        .from('zoom_webinars')
        .update({
          participant_sync_status: 'no_participants',
          participant_sync_completed_at: new Date().toISOString(),
          total_attendees: 0,
          unique_participant_count: 0,
          actual_participant_count: 0,
          total_absentees: webinar.total_registrants
        })
        .eq('id', webinar.id);

      return new Response(JSON.stringify({
        success: true,
        message: 'No participants found for this webinar',
        details: {
          webinarId,
          totalParticipants: 0,
          uniqueAttendees: 0
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Process participants to find unique attendees
    console.log('\n=== Processing Participants ===');
    const uniqueParticipants = new Map();
    const participantsByType = {
      attendees: 0,
      panelists: 0,
      hosts: 0
    };

    allParticipants.forEach((p: any) => {
      // Determine participant type
      const email = (p.email || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      
      // Identify panelists/hosts by email domain or role
      const isPanelist = 
        email.includes('allianthealth.org') ||
        email.includes('eventsibles.com') ||
        name.includes('coe-nf') ||
        name.includes('center of excellence') ||
        p.role === 'panelist' ||
        p.role === 'host';

      if (isPanelist) {
        participantsByType.panelists++;
      } else {
        participantsByType.attendees++;
      }

      // Use email as primary identifier, fallback to user_id or id
      const identifier = p.email || p.user_id || p.id || `participant_${uniqueParticipants.size}`;
      
      if (!uniqueParticipants.has(identifier)) {
        uniqueParticipants.set(identifier, {
          ...p,
          is_panelist: isPanelist,
          totalDuration: p.duration || 0,
          sessionCount: 1
        });
      } else {
        // Update existing participant
        const existing = uniqueParticipants.get(identifier);
        existing.totalDuration += (p.duration || 0);
        existing.sessionCount++;
      }
    });

    const uniqueAttendees = Array.from(uniqueParticipants.values()).filter(p => !p.is_panelist).length;
    const uniquePanelists = Array.from(uniqueParticipants.values()).filter(p => p.is_panelist).length;

    console.log(`Total participant sessions: ${allParticipants.length}`);
    console.log(`Unique participants: ${uniqueParticipants.size}`);
    console.log(`- Unique attendees: ${uniqueAttendees}`);
    console.log(`- Unique panelists: ${uniquePanelists}`);

    // Clear existing participants if force sync
    if (forceSync) {
      console.log('Force sync enabled, clearing existing participants...');
      await supabase
        .from('zoom_participants')
        .delete()
        .eq('webinar_id', webinar.id);
    }

    // Save participants to database
    console.log('\n=== Saving to Database ===');
    const participantRecords = Array.from(uniqueParticipants.values()).map(p => ({
      webinar_id: webinar.id,
      participant_id: p.id || p.participant_id,
      participant_uuid: p.participant_uuid,
      name: p.name,
      email: p.email,
      join_time: p.join_time,
      leave_time: p.leave_time,
      duration: p.totalDuration || p.duration,
      user_id: p.user_id,
      registrant_id: p.registrant_id,
      participant_user_id: p.participant_user_id,
      status: p.status || 'joined',
      device: p.device,
      ip_address: p.ip_address,
      location: p.location,
      city: p.city,
      country: p.country,
      network_type: p.network_type,
      customer_key: p.customer_key,
      session_count: p.sessionCount || 1,
      is_aggregated: true,
      first_join_time: p.join_time,
      last_leave_time: p.leave_time,
      total_duration: p.totalDuration || p.duration,
      // Engagement metrics if available
      attentiveness_score: p.attentiveness_score,
      camera_on_duration: p.camera_on_duration || 0,
      share_application_duration: p.share_application_duration || 0,
      share_desktop_duration: p.share_desktop_duration || 0,
      share_whiteboard_duration: p.share_whiteboard_duration || 0,
      posted_chat: p.posted_chat || false,
      raised_hand: p.raised_hand || false,
      answered_polling: p.answered_polling || false,
      asked_question: p.asked_question || false
    }));

    if (participantRecords.length > 0) {
      const { error: insertError } = await supabase
        .from('zoom_participants')
        .upsert(participantRecords, {
          onConflict: 'webinar_id,participant_id',
          ignoreDuplicates: false
        });

      if (insertError) {
        console.error('Error saving participants:', insertError);
        throw insertError;
      }
    }

    // Update webinar with correct counts
    const updateData = {
      total_attendees: uniqueAttendees, // Only count actual attendees, not panelists
      unique_participant_count: uniqueAttendees,
      actual_participant_count: allParticipants.length,
      total_absentees: Math.max(0, webinar.total_registrants - uniqueAttendees),
      participant_sync_status: 'synced',
      participant_sync_completed_at: new Date().toISOString(),
      participant_sync_error: null,
      updated_at: new Date().toISOString()
    };

    console.log('\n=== Updating Webinar ===');
    console.log(`Setting total_attendees to: ${updateData.total_attendees}`);
    console.log(`Setting total_absentees to: ${updateData.total_absentees}`);

    const { error: updateError } = await supabase
      .from('zoom_webinars')
      .update(updateData)
      .eq('id', webinar.id);

    if (updateError) {
      console.error('Error updating webinar:', updateError);
      throw updateError;
    }

    const response = {
      success: true,
      message: `Successfully synced attendees for webinar: ${webinar.topic}`,
      details: {
        webinarId: webinar.zoom_webinar_id,
        topic: webinar.topic,
        endpoint: successfulEndpoint,
        totalSessions: allParticipants.length,
        uniqueParticipants: uniqueParticipants.size,
        uniqueAttendees,
        uniquePanelists,
        registrants: webinar.total_registrants,
        absentees: updateData.total_absentees
      }
    };

    console.log('\n=== SYNC COMPLETED ===');
    console.log(JSON.stringify(response.details, null, 2));

    return new Response(JSON.stringify(response, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error('Error syncing webinar attendees:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'An error occurred',
      details: error.stack
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
