
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

    // Get models that need retraining (older than 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: models, error: modelsError } = await supabase
      .from('predictive_models')
      .select('*')
      .eq('is_active', true)
      .or(`last_trained_at.is.null,last_trained_at.lt.${sevenDaysAgo.toISOString()}`)

    if (modelsError) throw modelsError

    if (!models || models.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No models need retraining' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results = []

    for (const model of models) {
      try {
        // Get training data based on model type
        const trainingData = await getTrainingData(supabase, model)
        
        if (trainingData.length < 100) {
          results.push({
            model_id: model.id,
            status: 'skipped',
            reason: 'Insufficient training data',
          })
          continue
        }

        // Simulate model training (in production, this would call ML service)
        const trainedModel = await trainModel(model, trainingData)

        // Update model with new metrics
        const { error: updateError } = await supabase
          .from('predictive_models')
          .update({
            accuracy_score: trainedModel.accuracy,
            precision_score: trainedModel.precision,
            recall_score: trainedModel.recall,
            f1_score: trainedModel.f1_score,
            training_data_size: trainingData.length,
            last_trained_at: new Date().toISOString(),
            model_parameters: trainedModel.parameters,
          })
          .eq('id', model.id)

        if (updateError) throw updateError

        // Update behavior profiles with new predictions
        await updatePredictions(supabase, model, trainedModel)

        results.push({
          model_id: model.id,
          model_type: model.model_type,
          status: 'retrained',
          accuracy: trainedModel.accuracy,
          training_samples: trainingData.length,
        })

      } catch (error) {
        console.error(`Error retraining model ${model.id}:`, error)
        results.push({
          model_id: model.id,
          status: 'failed',
          error: error.message,
        })
      }
    }

    return new Response(
      JSON.stringify({ success: true, retrained_models: results }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error updating predictive models:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

async function getTrainingData(supabase: any, model: any) {
  const { data, error } = await supabase
    .from('user_behavior_profiles')
    .select(`
      *,
      behavioral_events!inner(
        event_type,
        timestamp,
        event_data
      )
    `)
    .eq('user_id', model.user_id)
    .gte('behavioral_events.timestamp', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())

  if (error) throw error
  return data || []
}

async function trainModel(model: any, trainingData: any[]) {
  // Simulate ML model training
  // In production, this would interface with actual ML services
  
  const accuracy = 0.82 + Math.random() * 0.15
  const precision = 0.78 + Math.random() * 0.17
  const recall = 0.80 + Math.random() * 0.15
  const f1_score = 2 * (precision * recall) / (precision + recall)

  return {
    accuracy: Math.min(0.99, accuracy),
    precision: Math.min(0.99, precision),
    recall: Math.min(0.99, recall),
    f1_score: Math.min(0.99, f1_score),
    parameters: {
      feature_importance: {
        engagement_score: 0.35,
        recency: 0.25,
        frequency: 0.20,
        interaction_diversity: 0.20,
      },
      model_version: `v${Date.now()}`,
      training_date: new Date().toISOString(),
    },
  }
}

async function updatePredictions(supabase: any, model: any, trainedModel: any) {
  // Get user behavior profiles for prediction updates
  const { data: profiles, error } = await supabase
    .from('user_behavior_profiles')
    .select('*')
    .eq('user_id', model.user_id)

  if (error) throw error

  if (!profiles || profiles.length === 0) return

  // Update predictions based on model type
  for (const profile of profiles) {
    let updatedFields: any = {}

    switch (model.model_type) {
      case 'churn_prediction':
        updatedFields.churn_risk_score = calculateChurnRisk(profile, trainedModel)
        break
      case 'ltv_prediction':
        updatedFields.predicted_ltv = calculateLTV(profile, trainedModel)
        break
      case 'engagement_forecast':
        // Engagement predictions are handled separately
        break
    }

    if (Object.keys(updatedFields).length > 0) {
      await supabase
        .from('user_behavior_profiles')
        .update(updatedFields)
        .eq('id', profile.id)
    }
  }
}

function calculateChurnRisk(profile: any, model: any): number {
  // Simplified churn risk calculation
  let risk = 0
  
  risk += (100 - profile.engagement_score) * 0.4
  
  if (profile.last_engagement_at) {
    const daysSince = Math.floor(
      (Date.now() - new Date(profile.last_engagement_at).getTime()) / 
      (1000 * 60 * 60 * 24)
    )
    risk += Math.min(50, daysSince * 0.5)
  } else {
    risk += 50
  }

  return Math.min(1.0, risk / 100)
}

function calculateLTV(profile: any, model: any): number {
  // Simplified LTV calculation
  const baseValue = 50
  const engagementMultiplier = profile.engagement_score / 50
  const churnAdjustment = 1 - profile.churn_risk_score
  
  return baseValue * engagementMultiplier * churnAdjustment
}
