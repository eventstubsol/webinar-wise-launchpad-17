
export function castToRecord(value: any): Record<string, any> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }
  return {};
}

export function castToArray(value: any): string[] {
  if (Array.isArray(value)) {
    return value.map(item => String(item));
  }
  return [];
}

export function castModelType(value: any): 'churn_prediction' | 'ltv_prediction' | 'engagement_forecast' {
  if (value === 'churn_prediction' || value === 'ltv_prediction' || value === 'engagement_forecast') {
    return value;
  }
  return 'churn_prediction';
}
