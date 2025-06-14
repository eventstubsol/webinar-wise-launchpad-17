
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { jobId } = await req.json();

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('export_queue')
      .select('*')
      .eq('id', jobId)
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

    // Fetch webinar data
    let query = supabase.from('zoom_webinars').select('*');
    
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

    // Generate PDF (simplified for edge function)
    const reportData = {
      title: job.export_config.title,
      description: job.export_config.description,
      webinars: webinarData,
      summary: {
        totalWebinars: webinarData.length,
        totalParticipants: webinarData.reduce((sum, w) => sum + (w.total_attendees || 0), 0),
        avgEngagement: Math.round(webinarData.reduce((sum, w) => sum + (w.total_attendees / w.total_registrants * 100 || 0), 0) / webinarData.length)
      },
      generatedAt: new Date().toISOString()
    };

    // In a real implementation, you would generate the actual PDF
    const fileName = `${job.export_config.title.replace(/\s+/g, '_')}_report.pdf`;
    const fileUrl = `https://example.com/reports/${fileName}`;

    // Update job with completion
    await supabase
      .from('export_queue')
      .update({
        status: 'completed',
        progress_percentage: 100,
        file_url: fileUrl,
        file_size: 2500000, // 2.5MB placeholder
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Add to report history
    await supabase
      .from('report_history')
      .insert({
        user_id: job.user_id,
        export_queue_id: jobId,
        report_type: 'pdf',
        report_title: job.export_config.title,
        file_url: fileUrl,
        file_size: 2500000,
        delivery_status: 'sent'
      });

    return new Response(
      JSON.stringify({ success: true, reportData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating PDF report:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
