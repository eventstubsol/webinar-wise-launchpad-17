
import { supabase } from '@/integrations/supabase/client';
import { EngagementPrediction, CreateEngagementPredictionRequest } from '@/types/ai-analytics';

export class EngagementPredictionsService {
  /**
   * Get engagement predictions for user's webinars
   */
  static async getUserPredictions(options?: {
    webinarId?: string;
    participantId?: string;
    predictionType?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = supabase
      .from('engagement_predictions')
      .select('*')
      .order('prediction_timestamp', { ascending: false });

    if (options?.webinarId) {
      query = query.eq('webinar_id', options.webinarId);
    }

    if (options?.participantId) {
      query = query.eq('participant_id', options.participantId);
    }

    if (options?.predictionType) {
      query = query.eq('prediction_type', options.predictionType as any);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, (options.offset + (options.limit || 10)) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching engagement predictions:', error);
      throw error;
    }

    return data as EngagementPrediction[];
  }

  /**
   * Create a new engagement prediction
   */
  static async createPrediction(prediction: CreateEngagementPredictionRequest) {
    const { data, error } = await supabase
      .from('engagement_predictions')
      .insert(prediction)
      .select()
      .single();

    if (error) {
      console.error('Error creating engagement prediction:', error);
      throw error;
    }

    return data as EngagementPrediction;
  }

  /**
   * Update prediction with actual value for accuracy tracking
   */
  static async validatePrediction(id: string, actualValue: number) {
    // Get the prediction first to calculate accuracy
    const { data: prediction, error: fetchError } = await supabase
      .from('engagement_predictions')
      .select('predicted_value')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching prediction for validation:', fetchError);
      throw fetchError;
    }

    // Calculate accuracy (1 - absolute difference)
    const accuracy = 1 - Math.abs(prediction.predicted_value - actualValue);

    const { data, error } = await supabase
      .from('engagement_predictions')
      .update({
        actual_value: actualValue,
        prediction_accuracy: Math.max(0, accuracy), // Ensure non-negative
        validated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error validating prediction:', error);
      throw error;
    }

    return data as EngagementPrediction;
  }

  /**
   * Get prediction accuracy metrics by model
   */
  static async getModelAccuracyMetrics() {
    const { data, error } = await supabase
      .from('engagement_predictions')
      .select('model_name, model_version, prediction_accuracy')
      .not('prediction_accuracy', 'is', null);

    if (error) {
      console.error('Error fetching model accuracy metrics:', error);
      throw error;
    }

    // Group by model and calculate statistics
    const modelMetrics: Record<string, {
      totalPredictions: number;
      avgAccuracy: number;
      minAccuracy: number;
      maxAccuracy: number;
    }> = {};

    data.forEach(prediction => {
      const modelKey = `${prediction.model_name}${prediction.model_version ? `:${prediction.model_version}` : ''}`;
      
      if (!modelMetrics[modelKey]) {
        modelMetrics[modelKey] = {
          totalPredictions: 0,
          avgAccuracy: 0,
          minAccuracy: 1,
          maxAccuracy: 0
        };
      }

      const metrics = modelMetrics[modelKey];
      const accuracy = prediction.prediction_accuracy!;

      metrics.totalPredictions++;
      metrics.avgAccuracy = ((metrics.avgAccuracy * (metrics.totalPredictions - 1)) + accuracy) / metrics.totalPredictions;
      metrics.minAccuracy = Math.min(metrics.minAccuracy, accuracy);
      metrics.maxAccuracy = Math.max(metrics.maxAccuracy, accuracy);
    });

    return modelMetrics;
  }

  /**
   * Get real-time predictions for active webinar
   */
  static async getRealtimePredictions(webinarId: string, minutes?: number) {
    let query = supabase
      .from('engagement_predictions')
      .select('*')
      .eq('webinar_id', webinarId)
      .order('prediction_timestamp', { ascending: false });

    if (minutes) {
      const cutoffTime = new Date(Date.now() - (minutes * 60 * 1000)).toISOString();
      query = query.gte('prediction_timestamp', cutoffTime);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching realtime predictions:', error);
      throw error;
    }

    return data as EngagementPrediction[];
  }
}
