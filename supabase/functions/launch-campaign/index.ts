
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LaunchCampaignRequest {
  campaign_id: string;
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

    const { campaign_id }: LaunchCampaignRequest = await req.json();

    console.log(`Launching campaign: ${campaign_id}`);

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select(`
        *,
        email_templates(*)
      `)
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      throw new Error(`Campaign not found: ${campaignError?.message}`);
    }

    // Get audience based on segment criteria
    const audienceSegment = campaign.audience_segment || {};
    
    // For now, get all profiles as fallback - in production, implement proper segmentation
    const { data: recipients, error: recipientsError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .not('email', 'is', null);

    if (recipientsError) {
      throw new Error(`Error fetching recipients: ${recipientsError.message}`);
    }

    // Handle A/B testing variants
    const { data: variants } = await supabase
      .from('campaign_variants')
      .select('*')
      .eq('campaign_id', campaign_id)
      .order('created_at');

    let emailQueue = [];

    if (variants && variants.length > 0) {
      // A/B testing - split recipients between variants
      const totalRecipients = recipients.length;
      let currentIndex = 0;

      for (const variant of variants) {
        const variantSize = Math.floor((variant.split_percentage / 100) * totalRecipients);
        const variantRecipients = recipients.slice(currentIndex, currentIndex + variantSize);
        
        for (const recipient of variantRecipients) {
          emailQueue.push({
            campaign_id,
            variant_id: variant.id,
            recipient_email: recipient.email,
            recipient_id: recipient.id,
            personalization_data: {
              full_name: recipient.full_name || 'Valued Customer',
              first_name: recipient.full_name?.split(' ')[0] || 'Valued Customer'
            },
            scheduled_send_time: new Date().toISOString(),
            priority: 5,
            status: 'queued'
          });
        }
        
        currentIndex += variantSize;
      }
    } else {
      // Single version campaign
      for (const recipient of recipients) {
        emailQueue.push({
          campaign_id,
          recipient_email: recipient.email,
          recipient_id: recipient.id,
          personalization_data: {
            full_name: recipient.full_name || 'Valued Customer',
            first_name: recipient.full_name?.split(' ')[0] || 'Valued Customer'
          },
          scheduled_send_time: new Date().toISOString(),
          priority: 5,
          status: 'queued'
        });
      }
    }

    // Insert into email send queue
    const { error: queueError } = await supabase
      .from('email_send_queue')
      .insert(emailQueue);

    if (queueError) {
      throw new Error(`Error adding emails to queue: ${queueError.message}`);
    }

    // Update campaign status
    await supabase
      .from('email_campaigns')
      .update({ 
        status: 'active',
        last_run_at: new Date().toISOString()
      })
      .eq('id', campaign_id);

    // Trigger email processing
    await supabase.functions.invoke('process-email-queue', {
      body: { campaign_id }
    });

    console.log(`Campaign launched successfully. Queued ${emailQueue.length} emails.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Campaign launched successfully',
        queued_emails: emailQueue.length
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error launching campaign:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
