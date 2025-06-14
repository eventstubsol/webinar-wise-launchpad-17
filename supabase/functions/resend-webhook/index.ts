
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const webhookSecret = Deno.env.get("RESEND_WEBHOOK_SECRET");

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    created_at: string;
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    last_event?: string;
    bounce?: {
      type: string;
      reason: string;
    };
    complaint?: {
      type: string;
      reason: string;
    };
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get("svix-signature");
    const timestamp = req.headers.get("svix-timestamp");
    const id = req.headers.get("svix-id");

    // Verify webhook signature if secret is provided
    if (webhookSecret && signature && timestamp && id) {
      // Simple signature verification (in production, use proper svix verification)
      // This is a simplified version - implement proper HMAC verification
    }

    const event: ResendWebhookEvent = JSON.parse(body);

    // Log the webhook event
    await supabase
      .from('webhook_events')
      .insert({
        webhook_source: 'resend',
        event_type: event.type,
        event_data: event,
        received_at: new Date().toISOString()
      });

    // Find the email send record by resend email_id
    const { data: emailSend } = await supabase
      .from('email_sends')
      .select('id')
      .contains('metadata', { resend_id: event.data.email_id })
      .single();

    if (!emailSend) {
      console.log(`No email send found for resend ID: ${event.data.email_id}`);
      return new Response('OK', { status: 200 });
    }

    const emailSendId = emailSend.id;

    // Process different event types
    switch (event.type) {
      case 'email.sent':
        await supabase
          .from('email_tracking_events')
          .insert({
            email_send_id: emailSendId,
            event_type: 'sent',
            event_data: event.data,
            timestamp: event.created_at
          });
        break;

      case 'email.delivered':
        await supabase
          .from('email_tracking_events')
          .insert({
            email_send_id: emailSendId,
            event_type: 'delivered',
            event_data: event.data,
            timestamp: event.created_at
          });
        
        await supabase
          .from('email_sends')
          .update({ status: 'delivered' })
          .eq('id', emailSendId);
        break;

      case 'email.bounced':
        await supabase
          .from('email_tracking_events')
          .insert({
            email_send_id: emailSendId,
            event_type: 'bounced',
            event_data: event.data,
            timestamp: event.created_at
          });

        await supabase
          .from('email_sends')
          .update({ 
            status: 'bounced',
            bounce_time: event.created_at,
            error_message: event.data.bounce?.reason || 'Email bounced',
            error_type: 'bounce'
          })
          .eq('id', emailSendId);

        // Create bounce record
        await supabase
          .from('email_bounces')
          .insert({
            email_send_id: emailSendId,
            recipient_email: event.data.to[0],
            event_type: event.data.bounce?.type || 'hard',
            event_data: event.data.bounce,
            received_at: event.created_at
          });
        break;

      case 'email.complained':
        await supabase
          .from('email_tracking_events')
          .insert({
            email_send_id: emailSendId,
            event_type: 'complained',
            event_data: event.data,
            timestamp: event.created_at
          });

        await supabase
          .from('email_sends')
          .update({ 
            status: 'complained',
            complaint_time: event.created_at
          })
          .eq('id', emailSendId);

        // Update email preferences to suppress future emails
        await supabase
          .from('email_preferences')
          .upsert({
            user_id: event.data.to[0], // Using email as identifier
            unsubscribed: true,
            unsubscribed_at: event.created_at,
            preferences: { complained: true }
          });
        break;

      case 'email.opened':
        await supabase
          .from('email_tracking_events')
          .insert({
            email_send_id: emailSendId,
            event_type: 'opened',
            event_data: event.data,
            timestamp: event.created_at
          });

        await supabase
          .from('email_sends')
          .update({ 
            open_time: event.created_at,
            status: 'opened'
          })
          .eq('id', emailSendId)
          .is('open_time', null);
        break;

      case 'email.clicked':
        await supabase
          .from('email_tracking_events')
          .insert({
            email_send_id: emailSendId,
            event_type: 'clicked',
            event_data: event.data,
            timestamp: event.created_at
          });

        await supabase
          .from('email_sends')
          .update({ 
            click_time: event.created_at,
            status: 'clicked'
          })
          .eq('id', emailSendId)
          .is('click_time', null);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark webhook event as processed
    await supabase
      .from('webhook_events')
      .update({ 
        processed: true, 
        processed_at: new Date().toISOString() 
      })
      .contains('event_data', { email_id: event.data.email_id })
      .eq('webhook_source', 'resend')
      .eq('event_type', event.type);

    return new Response('OK', { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error("Error in resend-webhook:", error);
    
    // Log error in webhook events
    await supabase
      .from('webhook_events')
      .insert({
        webhook_source: 'resend',
        event_type: 'error',
        event_data: { error: error.message },
        processed: false,
        processing_error: error.message,
        received_at: new Date().toISOString()
      });

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
