
import { Json } from '@/integrations/supabase/types';

// Type guards for union types
export const isValidRuleType = (value: string): value is 'subject_line' | 'content_block' | 'send_time' => {
  return ['subject_line', 'content_block', 'send_time'].includes(value);
};

export const isValidExperimentType = (value: string): value is 'send_time' | 'subject_line' | 'content' | 'frequency' => {
  return ['send_time', 'subject_line', 'content', 'frequency'].includes(value);
};

export const isValidModelType = (value: string): value is 'churn_prediction' | 'ltv_prediction' | 'engagement_forecast' => {
  return ['churn_prediction', 'ltv_prediction', 'engagement_forecast'].includes(value);
};

export const isValidScoringModelType = (value: string): value is 'engagement' | 'churn' | 'ltv' | 'send_time' => {
  return ['engagement', 'churn', 'ltv', 'send_time'].includes(value);
};

// Safe JSON casting functions
export const castToRecord = (json: Json): Record<string, any> => {
  if (typeof json === 'object' && json !== null && !Array.isArray(json)) {
    return json as Record<string, any>;
  }
  return {};
};

export const castToArray = (json: Json): any[] => {
  if (Array.isArray(json)) {
    return json;
  }
  return [];
};

// Safe value casting with defaults
export const castRuleType = (value: string): 'subject_line' | 'content_block' | 'send_time' => {
  return isValidRuleType(value) ? value : 'subject_line';
};

export const castExperimentType = (value: string): 'send_time' | 'subject_line' | 'content' | 'frequency' => {
  return isValidExperimentType(value) ? value : 'subject_line';
};

export const castModelType = (value: string): 'churn_prediction' | 'ltv_prediction' | 'engagement_forecast' => {
  return isValidModelType(value) ? value : 'churn_prediction';
};

export const castScoringModelType = (value: string): 'engagement' | 'churn' | 'ltv' | 'send_time' => {
  return isValidScoringModelType(value) ? value : 'engagement';
};
