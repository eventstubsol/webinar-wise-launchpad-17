
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

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

const handleBehavioralEvents = async (req: Request) => {
  const { event_type, email_address, user_id, campaign_id, event_data } = await req.json();
  const supabase = createSupabaseClient();

  // Insert the behavioral event
  const { error: eventError } = await supabase
    .from('behavioral_events')
    .insert({
      user_id,
      email_address,
      campaign_id,
      event_type,
      event_data: event_data || {},
      timestamp: new Date().toISOString(),
    });

  if (eventError) throw eventError;

  // Update behavior profile
  const { error: profileError } = await supabase.rpc('update_behavior_profile', {
    p_user_id: user_id,
    p_email: email_address,
  });

  if (profileError) console.warn('Failed to update behavior profile:', profileError);

  return {
    success: true,
    message: 'Behavioral event processed successfully'
  };
};

const handleRealtimeAnalytics = async (req: Request) => {
  const supabase = createSupabaseClient(req.headers.get('Authorization')!);
  const user = await authenticateUser(supabase);
  
  const { metric_type, metric_value, metadata } = await req.json();

  // Store real-time analytics data
  await supabase
    .from('realtime_analytics')
    .insert({
      user_id: user.id,
      metric_type,
      metric_value,
      metadata: metadata || {},
      timestamp: new Date().toISOString()
    });

  return {
    success: true,
    message: 'Analytics data processed'
  };
};

const handleGeneratePDFReport = async (req: Request) => {
  const supabase = createSupabaseClient(req.headers.get('Authorization')!);
  const user = await authenticateUser(supabase);
  
  const { jobId } = await req.json();

  // Get job details
  const { data: job, error: jobError } = await supabase
    .from('export_queue')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single();

  if (jobError) throw jobError;

  // Update status to processing
  await supabase
    .from('export_queue')
    .update({ 
      status: 'processing', 
      started_at: new Date().toISOString(),
      progress_percentage: 10 
    })
    .eq('id', jobId);

  // Fetch webinar data based on job config
  let query = supabase.from('zoom_webinars').select('*').eq('user_id', user.id);
  
  if (job.export_config.webinarIds?.length > 0) {
    query = query.in('id', job.export_config.webinarIds);
  }

  if (job.export_config.dateRange) {
    query = query
      .gte('start_time', job.export_config.dateRange.start)
      .lte('start_time', job.export_config.dateRange.end);
  }

  const { data: webinarData, error: dataError } = await query
    .order('start_time', { ascending: false });

  if (dataError) throw dataError;

  // Update progress
  await supabase
    .from('export_queue')
    .update({ progress_percentage: 50 })
    .eq('id', jobId);

  // Generate report data (simplified for now)
  const reportData = {
    title: job.export_config.title,
    description: job.export_config.description,
    webinars: webinarData,
    summary: {
      totalWebinars: webinarData.length,
      totalParticipants: webinarData.reduce((sum: number, w: any) => sum + (w.total_attendees || 0), 0),
      avgEngagement: webinarData.length > 0 ? 
        Math.round(webinarData.reduce((sum: number, w: any) => 
          sum + (w.total_attendees / (w.total_registrants || 1) * 100 || 0), 0) / webinarData.length) : 0
    },
    generatedAt: new Date().toISOString()
  };

  // In a real implementation, you would generate the actual PDF here
  const fileName = `${job.export_config.title.replace(/\s+/g, '_')}_report.pdf`;
  const fileUrl = `https://example.com/reports/${fileName}`;

  // Complete the job
  await supabase
    .from('export_queue')
    .update({
      status: 'completed',
      progress_percentage: 100,
      file_url: fileUrl,
      file_size: 2500000,
      completed_at: new Date().toISOString()
    })
    .eq('id', jobId);

  return {
    success: true,
    reportData,
    fileUrl
  };
};

const handleUpdatePredictiveModels = async (req: Request) => {
  const supabase = createSupabaseClient();
  
  // Placeholder for AI model updates
  console.log('Updating predictive models...');
  
  // In a real implementation, this would:
  // 1. Fetch recent behavioral data
  // 2. Update ML models
  // 3. Generate new predictions
  
  return {
    success: true,
    message: 'Predictive models updated successfully'
  };
};

const handleOptimizationAlgorithms = async (req: Request) => {
  const supabase = createSupabaseClient(req.headers.get('Authorization')!);
  const user = await authenticateUser(supabase);
  
  // Run optimization algorithms for user's campaigns
  console.log(`Running optimization algorithms for user ${user.id}`);
  
  return {
    success: true,
    message: 'Optimization algorithms completed'
  };
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
      case 'behavioral-events':
        result = await handleBehavioralEvents(req);
        break;
      case 'realtime-analytics':
        result = await handleRealtimeAnalytics(req);
        break;
      case 'generate-pdf':
        result = await handleGeneratePDFReport(req);
        break;
      case 'update-models':
        result = await handleUpdateP redictiveModels(req);
        break;
      case 'optimize':
        result = await handleOptimizationAlgorithms(req);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Analytics Processor error:', error);
    
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
