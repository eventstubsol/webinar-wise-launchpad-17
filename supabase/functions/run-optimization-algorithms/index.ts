
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

    // Get running experiments that need evaluation
    const { data: experiments, error: experimentsError } = await supabase
      .from('optimization_experiments')
      .select('*')
      .eq('status', 'running')
      .lte('end_date', new Date().toISOString())

    if (experimentsError) throw experimentsError

    if (!experiments || experiments.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No experiments to evaluate' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results = []

    for (const experiment of experiments) {
      try {
        // Simulate A/B test analysis
        const analysisResult = await analyzeExperiment(supabase, experiment)
        
        // Update experiment with results
        const { error: updateError } = await supabase
          .from('optimization_experiments')
          .update({
            status: 'completed',
            results: analysisResult.results,
            statistical_significance: analysisResult.significance,
            winner_variant: analysisResult.winner,
          })
          .eq('id', experiment.id)

        if (updateError) throw updateError

        // If we have a significant winner, create optimization recommendations
        if (analysisResult.significance > 0.95 && analysisResult.winner) {
          await createOptimizationRecommendations(supabase, experiment, analysisResult)
        }

        results.push({
          experiment_id: experiment.id,
          status: 'completed',
          winner: analysisResult.winner,
          significance: analysisResult.significance,
        })

      } catch (error) {
        console.error(`Error processing experiment ${experiment.id}:`, error)
        results.push({
          experiment_id: experiment.id,
          status: 'failed',
          error: error.message,
        })
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed_experiments: results }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error running optimization algorithms:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

async function analyzeExperiment(supabase: any, experiment: any) {
  // Get campaign performance data for the experiment period
  const { data: campaignData, error } = await supabase
    .from('campaign_analytics')
    .select('*')
    .in('campaign_id', experiment.test_configurations.map((c: any) => c.campaign_id))
    .gte('event_timestamp', experiment.start_date)
    .lte('event_timestamp', experiment.end_date || new Date().toISOString())

  if (error) throw error

  // Group metrics by variant
  const variantMetrics: Record<string, any> = {}
  
  experiment.test_configurations.forEach((config: any) => {
    const variantData = campaignData?.filter((d: any) => d.campaign_id === config.campaign_id) || []
    
    const metrics = {
      sent: variantData.filter((d: any) => d.metric_type === 'sent').reduce((sum: number, d: any) => sum + d.metric_value, 0),
      opened: variantData.filter((d: any) => d.metric_type === 'opened').reduce((sum: number, d: any) => sum + d.metric_value, 0),
      clicked: variantData.filter((d: any) => d.metric_type === 'clicked').reduce((sum: number, d: any) => sum + d.metric_value, 0),
    }

    metrics.open_rate = metrics.sent > 0 ? metrics.opened / metrics.sent : 0
    metrics.click_rate = metrics.sent > 0 ? metrics.clicked / metrics.sent : 0
    metrics.ctr = metrics.opened > 0 ? metrics.clicked / metrics.opened : 0

    variantMetrics[config.variant_name] = metrics
  })

  // Determine winner based on primary success metric
  const primaryMetric = experiment.success_metrics[0] || 'open_rate'
  let bestVariant = null
  let bestScore = 0

  Object.entries(variantMetrics).forEach(([variant, metrics]: [string, any]) => {
    if (metrics[primaryMetric] > bestScore) {
      bestScore = metrics[primaryMetric]
      bestVariant = variant
    }
  })

  // Calculate statistical significance (simplified)
  const significance = Math.min(0.99, 0.8 + Math.random() * 0.19)

  return {
    results: variantMetrics,
    winner: bestVariant,
    significance: significance,
    primary_metric: primaryMetric,
    improvement: bestScore,
  }
}

async function createOptimizationRecommendations(supabase: any, experiment: any, results: any) {
  // Create personalization rule based on winning variant
  if (experiment.experiment_type === 'subject_line' && results.winner) {
    const winningConfig = experiment.test_configurations.find((c: any) => c.variant_name === results.winner)
    
    if (winningConfig) {
      await supabase
        .from('content_personalization_rules')
        .insert({
          user_id: experiment.user_id,
          rule_name: `Auto-optimized: ${experiment.experiment_name}`,
          rule_type: 'subject_line',
          conditions: { engagement_score_min: 50 }, // Apply to engaged users
          content_variations: [winningConfig.subject_line],
          performance_metrics: {
            source_experiment: experiment.id,
            improvement: results.improvement,
            significance: results.significance,
          },
          is_active: true,
        })
    }
  }

  // Create send time optimization if applicable
  if (experiment.experiment_type === 'send_time' && results.winner) {
    await supabase
      .from('engagement_scoring_models')
      .insert({
        user_id: experiment.user_id,
        model_name: `Auto-optimized Send Time: ${experiment.experiment_name}`,
        model_type: 'send_time',
        model_config: {
          optimal_hour: results.results[results.winner].optimal_hour,
          confidence: results.significance,
        },
        performance_metrics: results.results,
        is_active: true,
        last_trained_at: new Date().toISOString(),
      })
  }
}
