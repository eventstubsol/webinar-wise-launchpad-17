
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookEvent {
  source: string;
  eventType: string;
  data: any;
  signature?: string;
  timestamp?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const crmType = url.pathname.split('/').pop(); // e.g., /crm-webhook-receiver/salesforce
    
    if (!crmType || !['salesforce', 'hubspot', 'pipedrive'].includes(crmType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid CRM type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.text();
    const headers = Object.fromEntries(req.headers.entries());

    // Verify webhook signature based on CRM type
    const isValid = await verifyWebhookSignature(crmType, body, headers);
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse webhook data based on CRM type
    const webhookEvent = parseWebhookData(crmType, body, headers);
    
    // Store webhook event for processing
    const { error: logError } = await supabase
      .from('webhook_events')
      .insert({
        webhook_source: crmType,
        event_type: webhookEvent.eventType,
        event_data: webhookEvent.data,
        processed: false
      });

    if (logError) {
      console.error('Failed to log webhook event:', logError);
    }

    // Process the webhook event
    await processWebhookEvent(supabase, webhookEvent);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function verifyWebhookSignature(crmType: string, body: string, headers: any): Promise<boolean> {
  switch (crmType) {
    case 'salesforce':
      // Salesforce doesn't use signatures, but validates by IP/certificate
      return true; // In production, implement proper validation
    
    case 'hubspot':
      const hubspotSignature = headers['x-hubspot-signature-v3'];
      if (!hubspotSignature) return false;
      
      // In production, implement HMAC verification with client secret
      return true;
    
    case 'pipedrive':
      // Pipedrive uses basic authentication or API tokens
      return true; // In production, implement proper validation
    
    default:
      return false;
  }
}

function parseWebhookData(crmType: string, body: string, headers: any): WebhookEvent {
  const data = JSON.parse(body);
  
  switch (crmType) {
    case 'salesforce':
      return {
        source: 'salesforce',
        eventType: data.sobjectType + '.' + data.changeType,
        data: data,
        timestamp: data.eventDate
      };
    
    case 'hubspot':
      return {
        source: 'hubspot',
        eventType: data[0]?.eventType || 'unknown',
        data: data,
        timestamp: new Date().toISOString()
      };
    
    case 'pipedrive':
      return {
        source: 'pipedrive',
        eventType: data.event,
        data: data,
        timestamp: new Date().toISOString()
      };
    
    default:
      return {
        source: crmType,
        eventType: 'unknown',
        data: data,
        timestamp: new Date().toISOString()
      };
  }
}

async function processWebhookEvent(supabase: any, event: WebhookEvent) {
  try {
    // Find relevant CRM connections for this webhook
    const { data: connections, error } = await supabase
      .from('crm_connections')
      .select('*')
      .eq('crm_type', event.source)
      .eq('is_active', true);

    if (error || !connections) {
      console.error('Failed to find CRM connections:', error);
      return;
    }

    for (const connection of connections) {
      await processEventForConnection(supabase, event, connection);
    }

    // Mark webhook as processed
    await supabase
      .from('webhook_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('webhook_source', event.source)
      .eq('event_type', event.eventType);

  } catch (error) {
    console.error('Error processing webhook event:', error);
  }
}

async function processEventForConnection(supabase: any, event: WebhookEvent, connection: any) {
  try {
    // Log the sync operation
    const { data: syncLog, error: syncLogError } = await supabase
      .from('crm_sync_logs')
      .insert({
        connection_id: connection.id,
        sync_type: 'real_time_update',
        operation_type: getOperationType(event.eventType),
        direction: 'incoming',
        status: 'pending',
        records_processed: 1,
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (syncLogError) {
      console.error('Failed to create sync log:', syncLogError);
      return;
    }

    // Process the specific event type
    let success = false;
    let errorMessage = '';

    switch (event.source) {
      case 'salesforce':
        success = await processSalesforceEvent(supabase, event, connection);
        break;
      case 'hubspot':
        success = await processHubSpotEvent(supabase, event, connection);
        break;
      case 'pipedrive':
        success = await processPipedriveEvent(supabase, event, connection);
        break;
    }

    // Update sync log with results
    await supabase
      .from('crm_sync_logs')
      .update({
        status: success ? 'success' : 'failed',
        records_success: success ? 1 : 0,
        records_failed: success ? 0 : 1,
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - new Date(syncLog.started_at).getTime()
      })
      .eq('id', syncLog.id);

  } catch (error) {
    console.error('Error processing event for connection:', error);
  }
}

function getOperationType(eventType: string): string {
  if (eventType.includes('create') || eventType.includes('insert')) {
    return 'create';
  } else if (eventType.includes('update') || eventType.includes('change')) {
    return 'update';
  } else if (eventType.includes('delete') || eventType.includes('remove')) {
    return 'delete';
  }
  return 'update';
}

async function processSalesforceEvent(supabase: any, event: WebhookEvent, connection: any): Promise<boolean> {
  // Process Salesforce contact changes
  if (event.eventType.includes('Contact')) {
    const contactData = event.data;
    
    // Update or create participant based on the contact change
    return await syncContactToParticipant(supabase, contactData, connection);
  }
  
  return true;
}

async function processHubSpotEvent(supabase: any, event: WebhookEvent, connection: any): Promise<boolean> {
  // Process HubSpot contact property changes
  const eventData = event.data[0];
  
  if (eventData.objectType === 'CONTACT') {
    return await syncContactToParticipant(supabase, eventData, connection);
  }
  
  return true;
}

async function processPipedriveEvent(supabase: any, event: WebhookEvent, connection: any): Promise<boolean> {
  // Process Pipedrive person changes
  if (event.eventType.includes('person')) {
    const personData = event.data.current || event.data.previous;
    return await syncContactToParticipant(supabase, personData, connection);
  }
  
  return true;
}

async function syncContactToParticipant(supabase: any, contactData: any, connection: any): Promise<boolean> {
  try {
    // Get field mappings for this connection
    const { data: mappings, error: mappingsError } = await supabase
      .from('crm_field_mappings')
      .select('*')
      .eq('connection_id', connection.id)
      .eq('sync_direction', 'incoming')
      .or('sync_direction.eq.bidirectional');

    if (mappingsError || !mappings) {
      return false;
    }

    // Extract email from contact data (this varies by CRM)
    let email = contactData.email || contactData.Email;
    if (contactData.properties && contactData.properties.email) {
      email = contactData.properties.email;
    }

    if (!email) {
      return false;
    }

    // Build participant data from field mappings
    const participantData: any = {};
    
    for (const mapping of mappings) {
      const crmValue = getValueFromPath(contactData, mapping.crm_field);
      if (crmValue !== undefined) {
        setValueAtPath(participantData, mapping.webinar_field, crmValue);
      }
    }

    // Check if participant exists
    const { data: existingParticipant } = await supabase
      .from('zoom_participants')
      .select('id')
      .eq('email', email)
      .single();

    if (existingParticipant) {
      // Update existing participant
      await supabase
        .from('zoom_participants')
        .update(participantData)
        .eq('id', existingParticipant.id);
    } else {
      // Create new participant
      await supabase
        .from('zoom_participants')
        .insert({
          ...participantData,
          email: email,
          participant_uuid: `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
    }

    return true;
  } catch (error) {
    console.error('Error syncing contact to participant:', error);
    return false;
  }
}

function getValueFromPath(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function setValueAtPath(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
}
