
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 1x1 transparent pixel
const TRACKING_PIXEL = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
  0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x21, 0xF9, 0x04, 0x01, 0x00, 0x00, 0x00,
  0x00, 0x2C, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02,
  0x04, 0x01, 0x00, 0x3B
]);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const url = new URL(req.url);
    const trackingType = url.searchParams.get('type');
    const emailId = url.searchParams.get('id');
    const recipientId = url.searchParams.get('recipient');
    const clickUrl = url.searchParams.get('url');

    const userAgent = req.headers.get('user-agent') || '';
    const ipAddress = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    console.log(`Tracking event: ${trackingType}, Email ID: ${emailId}, Recipient: ${recipientId}`);

    if (trackingType === 'open' && emailId) {
      // Track email open
      await recordTrackingEvent(supabase, emailId, 'opened', {
        user_agent: userAgent,
        ip_address: ipAddress,
        timestamp: new Date().toISOString()
      });

      // Return tracking pixel
      return new Response(TRACKING_PIXEL, {
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          ...corsHeaders
        }
      });

    } else if (trackingType === 'click' && emailId && clickUrl) {
      // Track email click
      await recordTrackingEvent(supabase, emailId, 'clicked', {
        clicked_url: clickUrl,
        user_agent: userAgent,
        ip_address: ipAddress,
        timestamp: new Date().toISOString()
      });

      // Redirect to original URL
      return Response.redirect(decodeURIComponent(clickUrl), 302);

    } else if (trackingType === 'unsubscribe' && recipientId) {
      // Handle unsubscribe
      await supabase
        .from('email_preferences')
        .upsert({
          user_id: recipientId,
          unsubscribed: true,
          unsubscribed_at: new Date().toISOString()
        });

      // Return unsubscribe confirmation page
      const unsubscribeHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Unsubscribed</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; margin: 50px; }
            .container { max-width: 400px; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>You've been unsubscribed</h2>
            <p>You will no longer receive emails from us.</p>
            <p>If this was a mistake, please contact our support team.</p>
          </div>
        </body>
        </html>
      `;

      return new Response(unsubscribeHtml, {
        headers: {
          'Content-Type': 'text/html',
          ...corsHeaders
        }
      });

    } else {
      return new Response('Invalid tracking request', {
        status: 400,
        headers: corsHeaders
      });
    }

  } catch (error: any) {
    console.error('Error in email tracking:', error);
    
    // For pixel requests, return pixel even on error to avoid broken images
    if (new URL(req.url).searchParams.get('type') === 'open') {
      return new Response(TRACKING_PIXEL, {
        headers: {
          'Content-Type': 'image/gif',
          ...corsHeaders
        }
      });
    }
    
    return new Response('Tracking error', {
      status: 500,
      headers: corsHeaders
    });
  }
};

async function recordTrackingEvent(supabase: any, emailId: string, eventType: string, eventData: any) {
  // Get email send record to find campaign info
  const { data: emailSend } = await supabase
    .from('email_send_queue')
    .select('campaign_id, variant_id, recipient_email')
    .eq('id', emailId)
    .single();

  if (emailSend) {
    // Record in email_tracking_events
    await supabase.from('email_tracking_events').insert({
      email_send_id: emailId,
      event_type: eventType,
      event_data: eventData,
      user_agent: eventData.user_agent,
      ip_address: eventData.ip_address,
      timestamp: eventData.timestamp
    });

    // Record in campaign_analytics
    await supabase.from('campaign_analytics').insert({
      campaign_id: emailSend.campaign_id,
      variant_id: emailSend.variant_id,
      recipient_email: emailSend.recipient_email,
      metric_type: eventType,
      metric_value: 1,
      event_timestamp: eventData.timestamp,
      event_data: eventData
    });

    console.log(`Recorded ${eventType} event for email ${emailId}`);
  }
}

serve(handler);
