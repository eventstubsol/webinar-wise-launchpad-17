
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { event_type, email_address, user_id, campaign_id, event_data } = await req.json()

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
      })

    if (eventError) throw eventError

    // Update behavior profile
    const { error: profileError } = await supabase.rpc('update_behavior_profile', {
      p_user_id: user_id,
      p_email: email_address,
    })

    if (profileError) throw profileError

    // Check if user needs segment re-evaluation
    const { data: segments } = await supabase
      .from('audience_segments')
      .select('id')
      .eq('user_id', user_id)
      .eq('is_dynamic', true)
      .eq('is_active', true)

    // Queue segment updates for dynamic segments
    if (segments && segments.length > 0) {
      for (const segment of segments) {
        await supabase.rpc('enqueue_task', {
          p_task_type: 'update_segment_membership',
          p_task_data: { segment_id: segment.id },
          p_priority: 7,
          p_user_id: user_id,
        })
      }
    }

    // If it's a high-value event (click, purchase), trigger personalization updates
    if (['click', 'purchase', 'conversion'].includes(event_type)) {
      await supabase.rpc('enqueue_task', {
        p_task_type: 'update_personalization_recommendations',
        p_task_data: { 
          email_address,
          event_type,
          event_data: event_data || {},
        },
        p_priority: 6,
        p_user_id: user_id,
      })
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Behavioral event processed successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error processing behavioral event:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
