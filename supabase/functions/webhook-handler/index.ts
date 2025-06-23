
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

const createSupabaseClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
};

const handleZoomWebhook = async (req: Request) => {
  const body = await req.json();
  const supabase = createSupabaseClient();
  
  console.log('Zoom webhook received:', body.event);
  
  // Validate webhook (simplified)
  const signature = req.headers.get('authorization');
  if (!signature) {
    throw new Error('Missing webhook signature');
  }

  // Handle different Zoom webhook events
  switch (body.event) {
    case 'webinar.started':
      console.log(`Webinar ${body.payload.object.id} started`);
      break;
    case 'webinar.ended':
      console.log(`Webinar ${body.payload.object.id} ended`);
      // Trigger participant sync
      break;
    case 'meeting.participant_joined':
      console.log(`Participant joined webinar ${body.payload.object.id}`);
      break;
    default:
      console.log(`Unhandled Zoom webhook event: ${body.event}`);
  }

  return { success: true, event: body.event };
};

const handleResendWebhook = async (req: Request) => {
  const body = await req.json();
  const supabase = createSupabaseClient();
  
  console.log('Resend webhook received:', body.type);
  
  // Process email events
  switch (body.type) {
    case 'email.sent':
      await supabase
        .from('email_tracking_events')
        .insert({
          email_id: body.data.email_id,
          event_type: 'sent',
          timestamp: new Date().toISOString(),
          provider_data: body.data
        });
      break;
      
    case 'email.delivered':
      await supabase
        .from('email_tracking_events')
        .insert({
          email_id: body.data.email_id,
          event_type: 'delivered',
          timestamp: new Date().toISOString(),
          provider_data: body.data
        });
      break;
      
    case 'email.bounced':
      await supabase
        .from('email_tracking_events')
        .insert({
          email_id: body.data.email_id,
          event_type: 'bounced',
          timestamp: new Date().toISOString(),
          provider_data: body.data
        });
      break;
      
    default:
      console.log(`Unhandled Resend webhook event: ${body.type}`);
  }

  return { success: true, event: body.type };
};

const handleCRMWebhook = async (req: Request) => {
  const body = await req.json();
  const supabase = createSupabaseClient();
  
  console.log('CRM webhook received:', body);
  
  // Store webhook data for processing
  await supabase
    .from('crm_webhook_events')
    .insert({
      webhook_type: 'crm_update',
      payload: body,
      processed: false,
      received_at: new Date().toISOString()
    });

  return { success: true, message: 'CRM webhook processed' };
};

const handleUnsubscribe = async (req: Request) => {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  
  if (!token) {
    throw new Error('Missing unsubscribe token');
  }

  const supabase = createSupabaseClient();
  
  // Find user by token and unsubscribe
  const { data: preference, error } = await supabase
    .from('email_preferences')
    .select('*')
    .eq('unsubscribe_token', token)
    .single();

  if (error || !preference) {
    throw new Error('Invalid unsubscribe token');
  }

  // Update unsubscribe status
  await supabase
    .from('email_preferences')
    .update({
      unsubscribed: true,
      unsubscribed_at: new Date().toISOString(),
      preferences: { marketing: false, newsletters: false, product_updates: false }
    })
    .eq('id', preference.id);

  return {
    success: true,
    message: 'Successfully unsubscribed from all emails'
  };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const url = new URL(req.url);
    const handler = url.searchParams.get('handler');

    let result;
    switch (handler) {
      case 'zoom':
        result = await handleZoomWebhook(req);
        break;
      case 'resend':
        result = await handleResendWebhook(req);
        break;
      case 'crm':
        result = await handleCRMWebhook(req);
        break;
      case 'unsubscribe':
        result = await handleUnsubscribe(req);
        break;
      default:
        throw new Error(`Unknown webhook handler: ${handler}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Webhook Handler error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
});
