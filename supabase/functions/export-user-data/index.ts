
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    const userId = user.id;
    const userData: Record<string, any> = {};

    // List of tables to export data from. Extend this list as needed.
    const tablesToExport = [
      'profiles', 'user_settings', 'email_preferences', 'audience_segments',
      'email_campaigns', 'email_templates', 'custom_metrics', 'csv_imports',
      'export_queue', 'report_history', 'report_templates', 'scheduled_reports',
      'ai_insights'
    ];

    for (const table of tablesToExport) {
        let query = supabase.from(table).select('*');
        const idColumn = ['profiles', 'user_settings'].includes(table) ? 'id' : 'user_id';
        
        const { data, error } = await query.eq(idColumn, userId);
        
        if (error) {
            console.error(`Error fetching from ${table} for user ${userId}:`, error.message);
            userData[table] = { error: `Failed to fetch data: ${error.message}` };
        } else {
            userData[table] = data;
        }
    }
    
    const { data: campaigns } = await supabase.from('email_campaigns').select('id').eq('user_id', userId);
    if (campaigns && campaigns.length > 0) {
      const campaignIds = campaigns.map(c => c.id);
      const { data: analytics, error: analyticsError } = await supabase.from('campaign_analytics').select('*').in('campaign_id', campaignIds);
      if (analyticsError) {
        userData['campaign_analytics'] = { error: `Failed to fetch data: ${analyticsError.message}` };
      } else {
        userData['campaign_analytics'] = analytics;
      }
    }

    return new Response(JSON.stringify(userData, null, 2), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error exporting user data:', error);
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
