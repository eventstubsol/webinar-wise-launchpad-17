
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ZoomWebhookEvent {
  event: string;
  event_ts: number;
  payload: {
    account_id: string;
    object: {
      uuid: string;
      id: string;
      host_id: string;
      topic: string;
      type: number;
      start_time: string;
      duration: number;
      timezone: string;
      agenda: string;
      [key: string]: any;
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse webhook payload
    const webhookEvent: ZoomWebhookEvent = await req.json();
    
    console.log('Received Zoom webhook:', {
      event: webhookEvent.event,
      timestamp: webhookEvent.event_ts,
      webinarId: webhookEvent.payload?.object?.id
    });

    // Verify webhook authenticity (optional but recommended)
    const webhookSecret = Deno.env.get('ZOOM_WEBHOOK_SECRET');
    if (webhookSecret) {
      const signature = req.headers.get('x-zm-signature');
      const timestamp = req.headers.get('x-zm-request-timestamp');
      
      if (!signature || !timestamp) {
        return new Response(
          JSON.stringify({ error: 'Missing webhook signature or timestamp' }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Verify signature (simplified - in production, use proper crypto verification)
      console.log('Webhook signature verification needed');
    }

    // Process different webhook events
    switch (webhookEvent.event) {
      case 'webinar.created':
        await handleWebinarCreated(supabase, webhookEvent);
        break;
      case 'webinar.updated':
        await handleWebinarUpdated(supabase, webhookEvent);
        break;
      case 'webinar.started':
        await handleWebinarStarted(supabase, webhookEvent);
        break;
      case 'webinar.ended':
        await handleWebinarEnded(supabase, webhookEvent);
        break;
      case 'webinar.participant_joined':
        await handleParticipantJoined(supabase, webhookEvent);
        break;
      case 'webinar.participant_left':
        await handleParticipantLeft(supabase, webhookEvent);
        break;
      case 'webinar.registration_created':
        await handleRegistrationCreated(supabase, webhookEvent);
        break;
      default:
        console.log('Unhandled webhook event:', webhookEvent.event);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed successfully' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Handler functions for different webhook events
async function handleWebinarCreated(supabase: any, event: ZoomWebhookEvent) {
  const webinar = event.payload.object;
  
  // Find the connection for this account
  const { data: connection } = await supabase
    .from('zoom_connections')
    .select('id')
    .eq('zoom_account_id', event.payload.account_id)
    .eq('connection_status', 'active')
    .single();

  if (!connection) {
    console.log('No active connection found for account:', event.payload.account_id);
    return;
  }

  // Insert or update webinar
  const { error } = await supabase
    .from('zoom_webinars')
    .upsert({
      connection_id: connection.id,
      webinar_id: webinar.id,
      webinar_uuid: webinar.uuid,
      host_id: webinar.host_id,
      topic: webinar.topic,
      type: webinar.type,
      start_time: webinar.start_time,
      duration: webinar.duration,
      timezone: webinar.timezone,
      agenda: webinar.agenda,
      status: 'scheduled',
      synced_at: new Date().toISOString()
    }, {
      onConflict: 'connection_id,webinar_id'
    });

  if (error) {
    console.error('Failed to create webinar:', error);
  } else {
    console.log('Webinar created successfully:', webinar.id);
  }
}

async function handleWebinarUpdated(supabase: any, event: ZoomWebhookEvent) {
  const webinar = event.payload.object;
  
  const { error } = await supabase
    .from('zoom_webinars')
    .update({
      topic: webinar.topic,
      start_time: webinar.start_time,
      duration: webinar.duration,
      timezone: webinar.timezone,
      agenda: webinar.agenda,
      updated_at: new Date().toISOString(),
      synced_at: new Date().toISOString()
    })
    .eq('webinar_id', webinar.id);

  if (error) {
    console.error('Failed to update webinar:', error);
  } else {
    console.log('Webinar updated successfully:', webinar.id);
  }
}

async function handleWebinarStarted(supabase: any, event: ZoomWebhookEvent) {
  const webinar = event.payload.object;
  
  const { error } = await supabase
    .from('zoom_webinars')
    .update({
      status: 'started',
      updated_at: new Date().toISOString()
    })
    .eq('webinar_id', webinar.id);

  if (error) {
    console.error('Failed to update webinar status to started:', error);
  } else {
    console.log('Webinar started:', webinar.id);
  }
}

async function handleWebinarEnded(supabase: any, event: ZoomWebhookEvent) {
  const webinar = event.payload.object;
  
  // Update webinar status
  const { error: updateError } = await supabase
    .from('zoom_webinars')
    .update({
      status: 'finished',
      updated_at: new Date().toISOString()
    })
    .eq('webinar_id', webinar.id);

  if (updateError) {
    console.error('Failed to update webinar status to finished:', updateError);
    return;
  }

  // Trigger automatic sync for this webinar to get final data
  try {
    const response = await supabase.functions.invoke('zoom-sync-webinars', {
      body: {
        connectionId: 'auto-detect', // Will be resolved in the sync function
        syncType: 'single',
        webinarId: webinar.id,
        options: {
          reason: 'webhook_ended'
        }
      }
    });

    if (response.error) {
      console.error('Failed to trigger auto-sync:', response.error);
    } else {
      console.log('Auto-sync triggered for ended webinar:', webinar.id);
    }
  } catch (error) {
    console.error('Error triggering auto-sync:', error);
  }

  console.log('Webinar ended:', webinar.id);
}

async function handleParticipantJoined(supabase: any, event: ZoomWebhookEvent) {
  // Real-time participant tracking could be implemented here
  // For now, we'll just log the event
  console.log('Participant joined webinar:', event.payload.object.id);
}

async function handleParticipantLeft(supabase: any, event: ZoomWebhookEvent) {
  // Real-time participant tracking could be implemented here
  // For now, we'll just log the event
  console.log('Participant left webinar:', event.payload.object.id);
}

async function handleRegistrationCreated(supabase: any, event: ZoomWebhookEvent) {
  // Handle new registrations
  console.log('New registration for webinar:', event.payload.object.id);
  
  // Could trigger a partial sync for registrants here if needed
}
