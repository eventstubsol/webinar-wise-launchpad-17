
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get pending campaigns that need to be executed
    const now = new Date().toISOString();
    
    const { data: pendingCampaigns, error: fetchError } = await supabase
      .from('campaign_execution_queue')
      .select(`
        *,
        email_campaigns(*),
        campaign_automation_workflows(*)
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .order('priority', { ascending: true })
      .order('scheduled_for', { ascending: true })
      .limit(10);

    if (fetchError) throw fetchError;

    const results = [];

    for (const campaign of pendingCampaigns || []) {
      try {
        // Update status to processing
        await supabase
          .from('campaign_execution_queue')
          .update({ 
            status: 'processing',
            started_at: now,
            progress_data: { step: 'initializing' }
          })
          .eq('id', campaign.id);

        let executionResult;

        if (campaign.campaign_id) {
          // Execute regular email campaign
          executionResult = await executeEmailCampaign(campaign);
        } else if (campaign.workflow_id) {
          // Execute workflow campaign
          executionResult = await executeWorkflowCampaign(campaign);
        }

        // Update completion status
        await supabase
          .from('campaign_execution_queue')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            progress_data: { 
              ...campaign.progress_data,
              result: executionResult,
              completed: true
            }
          })
          .eq('id', campaign.id);

        results.push({
          campaign_id: campaign.id,
          status: 'completed',
          result: executionResult
        });

      } catch (error: any) {
        console.error(`Error executing campaign ${campaign.id}:`, error);

        // Update error status
        await supabase
          .from('campaign_execution_queue')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: error.message,
            progress_data: {
              ...campaign.progress_data,
              error: error.message,
              failed: true
            }
          })
          .eq('id', campaign.id);

        results.push({
          campaign_id: campaign.id,
          status: 'failed',
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in campaign-scheduler:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

async function executeEmailCampaign(queueItem: any) {
  const campaign = queueItem.email_campaigns;
  
  // Get campaign recipients based on audience segment
  const recipients = await getAudienceSegmentEmails(campaign.audience_segment);
  
  let successCount = 0;
  let failureCount = 0;

  for (const recipient of recipients) {
    try {
      // Send email via enhanced-email-sender function
      const response = await fetch(`${supabaseUrl}/functions/v1/enhanced-email-sender`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          campaign_id: campaign.id,
          recipient_email: recipient.email,
          subject: campaign.subject_template,
          html_content: await renderTemplate(campaign.template_id, recipient),
          personalization_data: recipient.personalization_data || {}
        })
      });

      if (response.ok) {
        successCount++;
      } else {
        failureCount++;
      }
    } catch (error) {
      console.error(`Failed to send email to ${recipient.email}:`, error);
      failureCount++;
    }

    // Update progress
    await supabase
      .from('campaign_execution_queue')
      .update({
        progress_data: {
          step: 'sending_emails',
          sent: successCount,
          failed: failureCount,
          total: recipients.length
        }
      })
      .eq('id', queueItem.id);
  }

  return {
    total_recipients: recipients.length,
    successful_sends: successCount,
    failed_sends: failureCount
  };
}

async function executeWorkflowCampaign(queueItem: any) {
  const workflow = queueItem.campaign_automation_workflows;
  
  // Get workflow subscriptions that need processing
  const { data: subscriptions, error } = await supabase
    .from('workflow_subscriptions')
    .select('*')
    .eq('workflow_id', workflow.id)
    .eq('status', 'active')
    .lte('next_action_at', new Date().toISOString());

  if (error) throw error;

  let processedCount = 0;

  for (const subscription of subscriptions || []) {
    try {
      const workflowSteps = workflow.workflow_steps || [];
      const currentStep = workflowSteps[subscription.current_step];

      if (!currentStep) {
        // Workflow completed
        await supabase
          .from('workflow_subscriptions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', subscription.id);
        continue;
      }

      // Execute current step
      await executeWorkflowStep(subscription, currentStep);

      // Move to next step
      const nextStep = subscription.current_step + 1;
      const nextActionDelay = currentStep.delay_hours || 24;
      const nextActionAt = new Date(Date.now() + (nextActionDelay * 60 * 60 * 1000));

      await supabase
        .from('workflow_subscriptions')
        .update({
          current_step: nextStep,
          next_action_at: nextActionAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);

      processedCount++;

    } catch (error) {
      console.error(`Error processing workflow subscription ${subscription.id}:`, error);
    }
  }

  return {
    total_subscriptions: subscriptions?.length || 0,
    processed_subscriptions: processedCount
  };
}

async function executeWorkflowStep(subscription: any, step: any) {
  if (step.type === 'email') {
    // Send email via enhanced-email-sender
    await fetch(`${supabaseUrl}/functions/v1/enhanced-email-sender`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        campaign_id: subscription.workflow_id,
        recipient_email: subscription.subscriber_email,
        subject: step.subject,
        html_content: step.content,
        personalization_data: subscription.metadata
      })
    });
  } else if (step.type === 'tag') {
    // Add/remove tags (implement as needed)
  } else if (step.type === 'segment') {
    // Add to segment (implement as needed)
  }
}

async function getAudienceSegmentEmails(segmentConfig: any) {
  // Simple implementation - extend based on segment criteria
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('email, full_name')
    .not('email', 'is', null);

  if (error) throw error;

  return profiles?.map(p => ({
    email: p.email,
    personalization_data: {
      name: p.full_name,
      first_name: p.full_name?.split(' ')[0] || ''
    }
  })) || [];
}

async function renderTemplate(templateId: string, recipient: any) {
  if (!templateId) return '<p>Default email content</p>';

  const { data: template, error } = await supabase
    .from('email_templates')
    .select('html_template')
    .eq('id', templateId)
    .single();

  if (error || !template) return '<p>Template not found</p>';

  return template.html_template;
}

serve(handler);
