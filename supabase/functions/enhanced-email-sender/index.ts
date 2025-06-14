
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailSendRequest {
  campaign_id: string;
  recipient_email: string;
  subject: string;
  html_content: string;
  text_content?: string;
  personalization_data?: Record<string, any>;
  tracking_enabled?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      campaign_id, 
      recipient_email, 
      subject, 
      html_content, 
      text_content,
      personalization_data = {},
      tracking_enabled = true 
    }: EmailSendRequest = await req.json();

    // Apply personalization to content
    let personalizedSubject = subject;
    let personalizedHtml = html_content;
    let personalizedText = text_content;

    // Simple merge tag replacement
    for (const [key, value] of Object.entries(personalization_data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      personalizedSubject = personalizedSubject.replace(regex, String(value));
      personalizedHtml = personalizedHtml.replace(regex, String(value));
      if (personalizedText) {
        personalizedText = personalizedText.replace(regex, String(value));
      }
    }

    // Create tracking pixel and links if enabled
    const trackingPixelUrl = tracking_enabled 
      ? `${supabaseUrl}/functions/v1/email-tracking/pixel?send_id={{SEND_ID}}`
      : '';

    // Add tracking pixel to HTML
    if (tracking_enabled && trackingPixelUrl) {
      personalizedHtml += `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" />`;
    }

    // Create email send record
    const { data: emailSend, error: createError } = await supabase
      .from('email_sends')
      .insert({
        campaign_id,
        recipient_email,
        subject: personalizedSubject,
        body_html: personalizedHtml,
        status: 'sending',
        metadata: personalization_data,
        tracking_pixel_url: trackingPixelUrl,
        click_tracking_enabled: tracking_enabled
      })
      .select()
      .single();

    if (createError) throw createError;

    // Replace send_id in tracking URLs
    const finalHtml = personalizedHtml.replace(/{{SEND_ID}}/g, emailSend.id);
    const finalTrackingPixel = trackingPixelUrl.replace(/{{SEND_ID}}/g, emailSend.id);

    // Send email via Resend
    const emailPayload: any = {
      from: "noreply@yourdomain.com", // Configure this
      to: [recipient_email],
      subject: personalizedSubject,
      html: finalHtml,
      headers: {
        'X-Email-Send-ID': emailSend.id,
      }
    };

    if (personalizedText) {
      emailPayload.text = personalizedText;
    }

    const { data: resendData, error: resendError } = await resend.emails.send(emailPayload);

    if (resendError) {
      // Update email send record with error
      await supabase
        .from('email_sends')
        .update({ 
          status: 'failed', 
          error_message: resendError.message,
          error_type: 'send_failure'
        })
        .eq('id', emailSend.id);

      throw resendError;
    }

    // Update email send record with success
    await supabase
      .from('email_sends')
      .update({ 
        status: 'sent',
        send_time: new Date().toISOString(),
        metadata: { 
          ...personalization_data, 
          resend_id: resendData.id 
        }
      })
      .eq('id', emailSend.id);

    // Log tracking event
    await supabase
      .from('email_tracking_events')
      .insert({
        email_send_id: emailSend.id,
        event_type: 'sent',
        event_data: { resend_id: resendData.id },
        timestamp: new Date().toISOString()
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        email_send_id: emailSend.id,
        resend_id: resendData.id 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in enhanced-email-sender:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
