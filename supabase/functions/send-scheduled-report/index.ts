
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

    // Get scheduled reports that are due
    const { data: scheduledReports, error: reportsError } = await supabase
      .from('scheduled_reports')
      .select('*')
      .eq('is_active', true)
      .lte('next_send_at', new Date().toISOString());

    if (reportsError) throw reportsError;

    console.log(`Found ${scheduledReports.length} scheduled reports to process`);

    for (const report of scheduledReports) {
      try {
        // Generate report based on type
        const exportConfig = {
          title: `${report.report_name} - ${new Date().toLocaleDateString()}`,
          description: `Automated report generated on ${new Date().toLocaleDateString()}`,
          ...report.filter_config
        };

        // Create export job
        const { data: exportJob, error: exportError } = await supabase
          .from('export_queue')
          .insert({
            user_id: report.user_id,
            export_type: report.report_type === 'multi' ? 'pdf' : report.report_type,
            export_config: exportConfig,
            status: 'pending'
          })
          .select()
          .single();

        if (exportError) throw exportError;

        // In a real implementation, you would:
        // 1. Generate the actual report
        // 2. Send email via SendGrid
        // 3. Update delivery status

        // Calculate next send time
        let nextSendAt = new Date();
        switch (report.schedule_frequency) {
          case 'daily':
            nextSendAt.setDate(nextSendAt.getDate() + 1);
            break;
          case 'weekly':
            nextSendAt.setDate(nextSendAt.getDate() + 7);
            break;
          case 'monthly':
            nextSendAt.setMonth(nextSendAt.getMonth() + 1);
            break;
          default:
            // Custom schedule logic would go here
            nextSendAt.setDate(nextSendAt.getDate() + 7);
        }

        // Update scheduled report
        await supabase
          .from('scheduled_reports')
          .update({
            last_sent_at: new Date().toISOString(),
            next_send_at: nextSendAt.toISOString()
          })
          .eq('id', report.id);

        // Add to report history
        await supabase
          .from('report_history')
          .insert({
            user_id: report.user_id,
            scheduled_report_id: report.id,
            report_type: report.report_type,
            report_title: exportConfig.title,
            recipient_count: report.recipient_list.length,
            delivery_status: 'sent'
          });

        console.log(`Processed scheduled report: ${report.report_name}`);

      } catch (error) {
        console.error(`Failed to process scheduled report ${report.id}:`, error);
        
        // Log failure
        await supabase
          .from('report_history')
          .insert({
            user_id: report.user_id,
            scheduled_report_id: report.id,
            report_type: report.report_type,
            report_title: report.report_name,
            recipient_count: report.recipient_list.length,
            delivery_status: 'failed'
          });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: scheduledReports.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing scheduled reports:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
