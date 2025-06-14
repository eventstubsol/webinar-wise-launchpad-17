import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface ProcessEmailRequest {
  campaign_id?: string;
  batch_size?: number;
}

async function getOrCreatePreferenceToken(supabase: any, recipientId: string): Promise<string> {
  await supabase.rpc('ensure_email_preferences_for_profile', { p_profile_id: recipientId });

  const { data: existingPref, error: existingError } = await supabase
    .from('email_preferences')
    .select('preference_management_token, preference_token_expires_at')
    .eq('user_id', recipientId)
    .single();

  if (existingError) {
      console.error("Error fetching existing preferences:", existingError.message);
      throw new Error(`Failed to fetch preferences for user ${recipientId}`);
  }

  if (existingPref.preference_management_token && new Date(existingPref.preference_token_expires_at) > new Date()) {
    return existingPref.preference_management_token;
  }

  const newToken = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Token valid for 7 days

  const { error: updateError } = await supabase
    .from('email_preferences')
    .update({
      preference_management_token: newToken,
      preference_token_expires_at: expiresAt.toISOString(),
    })
    .eq('user_id', recipientId);

  if (updateError) {
    console.error("Error updating preference token:", updateError.message);
    throw new Error(`Failed to update preference token for user ${recipientId}`);
  }

  return newToken;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { campaign_id, batch_size = 10 }: ProcessEmailRequest = await req.json();

    console.log(`Processing email queue for campaign: ${campaign_id}`);

    // Get queued emails
    let query = supabase
      .from('email_send_queue')
      .select(`
        *,
        email_campaigns(
          subject_template,
          campaign_type,
          email_templates(*)
        ),
        campaign_variants(subject_line, template_id)
      `)
      .eq('status', 'queued')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(batch_size);

    if (campaign_id) {
      query = query.eq('campaign_id', campaign_id);
    }

    const { data: queuedEmails, error: queueError } = await query;

    if (queueError) {
      throw new Error(`Error fetching queued emails: ${queueError.message}`);
    }

    if (!queuedEmails || queuedEmails.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No emails in queue to process' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const processedEmails = [];
    const failedEmails = [];

    for (const queueItem of queuedEmails) {
      try {
        await supabase
          .from('email_send_queue')
          .update({ status: 'processing' })
          .eq('id', queueItem.id);

        const subjectLine = queueItem.campaign_variants?.subject_line || 
                           queueItem.email_campaigns?.subject_template || 
                           'Your Email';

        const personalizedSubject = applyPersonalization(
          subjectLine, 
          queueItem.personalization_data
        );

        const templateContent = queueItem.campaign_variants?.template_id 
          ? await getTemplateContent(supabase, queueItem.campaign_variants.template_id)
          : queueItem.email_campaigns?.email_templates?.html_template || 
            '<p>Hello {{first_name}}, thank you for your interest!</p>';

        const preferenceToken = await getOrCreatePreferenceToken(supabase, queueItem.recipient_id);
        const unsubscribeUrl = generateUnsubscribeUrl(preferenceToken);

        const personalizedContent = applyPersonalization(
          templateContent,
          {
            ...queueItem.personalization_data,
            unsubscribe_url: unsubscribeUrl,
          }
        );

        const trackingPixelUrl = generateTrackingPixel(queueItem.id);

        const trackedContent = personalizedContent + 
          `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" />`;

        const emailResponse = await resend.emails.send({
          from: "Webinar Wise <noreply@resend.dev>",
          to: [queueItem.recipient_email],
          subject: personalizedSubject,
          html: trackedContent,
        });

        if (emailResponse.error) {
          throw new Error(emailResponse.error.message);
        }

        await supabase.from('email_sends').insert({
          campaign_id: queueItem.campaign_id,
          recipient_email: queueItem.recipient_email,
          recipient_id: queueItem.recipient_id,
          subject: personalizedSubject,
          body_html: trackedContent,
          status: 'sent',
          send_time: new Date().toISOString(),
          ab_variant: queueItem.variant_id,
          unsubscribe_url: unsubscribeUrl,
          metadata: {
            resend_id: emailResponse.data?.id,
            personalization_data: queueItem.personalization_data
          }
        });

        await supabase
          .from('email_send_queue')
          .update({ 
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', queueItem.id);

        await recordAnalyticsEvent(supabase, queueItem, 'sent');

        processedEmails.push(queueItem.id);
        console.log(`Email sent successfully to: ${queueItem.recipient_email}`);

      } catch (error: any) {
        console.error(`Failed to send email to ${queueItem.recipient_email}:`, error);

        await supabase
          .from('email_send_queue')
          .update({ 
            status: 'failed',
            error_message: error.message,
            attempts: (queueItem.attempts || 0) + 1
          })
          .eq('id', queueItem.id);

        failedEmails.push({ id: queueItem.id, error: error.message });
      }
    }

    console.log(`Processed ${processedEmails.length} emails, ${failedEmails.length} failed`);

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: processedEmails.length,
        failed: failedEmails.length,
        failed_details: failedEmails
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error processing email queue:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

function applyPersonalization(content: string, data: any): string {
  let personalizedContent = content;
  
  // Replace common merge tags
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    personalizedContent = personalizedContent.replace(regex, String(value));
  });
  
  return personalizedContent;
}

async function getTemplateContent(supabase: any, templateId: string): Promise<string> {
  const { data } = await supabase
    .from('email_templates')
    .select('html_template')
    .eq('id', templateId)
    .single();
  
  return data?.html_template || '<p>Hello {{first_name}}!</p>';
}

function generateTrackingPixel(queueId: string): string {
  const baseUrl = Deno.env.get('SUPABASE_URL');
  return `${baseUrl}/functions/v1/email-tracking?type=open&id=${queueId}`;
}

function generateUnsubscribeUrl(token: string): string {
  const baseUrl = Deno.env.get('APP_BASE_URL') || 'http://localhost:5173';
  return `${baseUrl}/unsubscribe?token=${token}`;
}

async function recordAnalyticsEvent(supabase: any, queueItem: any, eventType: string) {
  await supabase.from('campaign_analytics').insert({
    campaign_id: queueItem.campaign_id,
    variant_id: queueItem.variant_id,
    recipient_email: queueItem.recipient_email,
    metric_type: eventType,
    metric_value: 1,
    event_timestamp: new Date().toISOString()
  });
}

serve(handler);
