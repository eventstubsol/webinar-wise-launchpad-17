
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'npm:resend@2.0.0';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const createSupabaseClient = (authHeader?: string) => {
  if (authHeader) {
    return createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
  }
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
};

const authenticateUser = async (supabase: any) => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('Unauthorized');
  }
  return user;
};

const handleSendEmail = async (req: Request) => {
  const { to, subject, html, from } = await req.json();
  
  const emailResponse = await resend.emails.send({
    from: from || "Webinar Wise <noreply@webinarwise.com>",
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  });

  return {
    success: true,
    messageId: emailResponse.data?.id,
    message: 'Email sent successfully'
  };
};

const handleLaunchCampaign = async (req: Request) => {
  const supabase = createSupabaseClient(req.headers.get('Authorization')!);
  const user = await authenticateUser(supabase);
  
  const { campaignId } = await req.json();

  const { data: campaign, error: campaignError } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('id', campaignId)
    .eq('user_id', user.id)
    .single();

  if (campaignError || !campaign) {
    throw new Error('Campaign not found');
  }

  // Update campaign status
  await supabase
    .from('email_campaigns')
    .update({ 
      status: 'sending',
      launched_at: new Date().toISOString()
    })
    .eq('id', campaignId);

  // Queue emails for sending (simplified)
  console.log(`Campaign ${campaignId} launched successfully`);

  return {
    success: true,
    message: 'Campaign launched successfully',
    campaignId
  };
};

const handleScheduleCampaign = async (req: Request) => {
  const supabase = createSupabaseClient(req.headers.get('Authorization')!);
  const user = await authenticateUser(supabase);
  
  const { campaignId, scheduledFor } = await req.json();

  const { error } = await supabase
    .from('email_campaigns')
    .update({ 
      status: 'scheduled',
      scheduled_for: scheduledFor,
      updated_at: new Date().toISOString()
    })
    .eq('id', campaignId)
    .eq('user_id', user.id);

  if (error) {
    throw new Error('Failed to schedule campaign');
  }

  return {
    success: true,
    message: 'Campaign scheduled successfully',
    scheduledFor
  };
};

const handleProcessEmailQueue = async (req: Request) => {
  const supabase = createSupabaseClient();
  
  // Get pending emails from queue
  const { data: pendingEmails } = await supabase
    .from('email_queue')
    .select('*')
    .eq('status', 'pending')
    .limit(10);

  if (!pendingEmails || pendingEmails.length === 0) {
    return {
      success: true,
      processed: 0,
      message: 'No emails in queue'
    };
  }

  let processed = 0;
  for (const email of pendingEmails) {
    try {
      await resend.emails.send({
        from: email.from_email,
        to: [email.to_email],
        subject: email.subject,
        html: email.html_content,
      });

      await supabase
        .from('email_queue')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', email.id);

      processed++;
    } catch (error) {
      await supabase
        .from('email_queue')
        .update({ 
          status: 'failed',
          error_message: error.message
        })
        .eq('id', email.id);
    }
  }

  return {
    success: true,
    processed,
    message: `Processed ${processed} emails from queue`
  };
};

const handleEmailTracking = async (req: Request) => {
  const url = new URL(req.url);
  const eventType = url.searchParams.get('event');
  const emailId = url.searchParams.get('emailId');
  
  if (!eventType || !emailId) {
    throw new Error('Missing event type or email ID');
  }

  const supabase = createSupabaseClient();
  
  // Record tracking event
  await supabase
    .from('email_tracking_events')
    .insert({
      email_id: emailId,
      event_type: eventType,
      timestamp: new Date().toISOString(),
      user_agent: req.headers.get('User-Agent'),
      ip_address: req.headers.get('CF-Connecting-IP') || 'unknown'
    });

  // Return 1x1 transparent pixel for opens
  if (eventType === 'open') {
    const pixel = new Uint8Array([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
      0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x21, 0xF9, 0x04, 0x01, 0x00, 0x00, 0x00,
      0x00, 0x2C, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02,
      0x04, 0x01, 0x00, 0x3B
    ]);
    
    return new Response(pixel, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        ...CORS_HEADERS
      }
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    let result;
    switch (action) {
      case 'send-email':
        result = await handleSendEmail(req);
        break;
      case 'launch-campaign':
        result = await handleLaunchCampaign(req);
        break;
      case 'schedule-campaign':        result = await handleScheduleCampaign(req);
        break;
      case 'process-queue':
        result = await handleProcessEmailQueue(req);
        break;
      case 'track':
        return await handleEmailTracking(req);
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Email Campaign Manager error:', error);
    
    const status = error.message === 'Unauthorized' ? 401 : 500;
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
});
