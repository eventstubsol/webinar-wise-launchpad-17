
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const path = url.pathname;

  try {
    // Handle tracking pixel (email opens)
    if (path.includes('/pixel')) {
      const sendId = url.searchParams.get('send_id');
      if (!sendId) {
        return new Response('Missing send_id', { status: 400 });
      }

      // Log open event
      await supabase
        .from('email_tracking_events')
        .insert({
          email_send_id: sendId,
          event_type: 'opened',
          event_data: {
            user_agent: req.headers.get('user-agent'),
            referer: req.headers.get('referer')
          },
          user_agent: req.headers.get('user-agent'),
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
          timestamp: new Date().toISOString()
        });

      // Update email send record
      await supabase
        .from('email_sends')
        .update({ 
          open_time: new Date().toISOString(),
          status: 'opened'
        })
        .eq('id', sendId)
        .is('open_time', null); // Only update if not already opened

      // Return 1x1 transparent pixel
      const pixel = new Uint8Array([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00,
        0xff, 0xff, 0xff, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x04, 0x01, 0x00, 0x3b
      ]);

      return new Response(pixel, {
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    // Handle click tracking
    if (path.includes('/click')) {
      const sendId = url.searchParams.get('send_id');
      const targetUrl = url.searchParams.get('url');
      
      if (!sendId || !targetUrl) {
        return new Response('Missing parameters', { status: 400 });
      }

      // Log click event
      await supabase
        .from('email_tracking_events')
        .insert({
          email_send_id: sendId,
          event_type: 'clicked',
          event_data: {
            target_url: targetUrl,
            user_agent: req.headers.get('user-agent'),
            referer: req.headers.get('referer')
          },
          user_agent: req.headers.get('user-agent'),
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
          timestamp: new Date().toISOString()
        });

      // Update email send record (first click only)
      await supabase
        .from('email_sends')
        .update({ 
          click_time: new Date().toISOString(),
          status: 'clicked'
        })
        .eq('id', sendId)
        .is('click_time', null);

      // Redirect to target URL
      return Response.redirect(decodeURIComponent(targetUrl), 302);
    }

    // Handle unsubscribe tracking
    if (path.includes('/unsubscribe')) {
      const sendId = url.searchParams.get('send_id');
      
      if (!sendId) {
        return new Response('Missing send_id', { status: 400 });
      }

      // Log unsubscribe event
      await supabase
        .from('email_tracking_events')
        .insert({
          email_send_id: sendId,
          event_type: 'unsubscribed',
          event_data: {
            user_agent: req.headers.get('user-agent'),
            referer: req.headers.get('referer')
          },
          timestamp: new Date().toISOString()
        });

      // Update email send record
      await supabase
        .from('email_sends')
        .update({ 
          unsubscribe_time: new Date().toISOString(),
          status: 'unsubscribed'
        })
        .eq('id', sendId);

      // Get recipient email and update preferences
      const { data: emailSend } = await supabase
        .from('email_sends')
        .select('recipient_email')
        .eq('id', sendId)
        .single();

      if (emailSend) {
        await supabase
          .from('email_preferences')
          .upsert({
            user_id: emailSend.recipient_email, // Using email as identifier
            unsubscribed: true,
            unsubscribed_at: new Date().toISOString()
          });
      }

      return new Response('You have been unsubscribed successfully.', {
        headers: { 'Content-Type': 'text/plain', ...corsHeaders }
      });
    }

    return new Response('Not found', { status: 404 });

  } catch (error: any) {
    console.error("Error in email-tracking:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
