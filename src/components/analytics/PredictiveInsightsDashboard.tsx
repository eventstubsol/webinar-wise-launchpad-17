
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, Brain, Users, Target } from 'lucide-react';
import { 
  PredictiveAnalyticsService, 
  ChurnPrediction, 
  LTVPrediction, 
  EngagementForecast,
  PredictiveModel 
} from '@/services/analytics/PredictiveAnalyticsService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const PredictiveInsightsDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [models, setModels] = useState<PredictiveModel[]>([]);
  const [churnPredictions, setChurnPredictions] = useState<ChurnPrediction[]>([]);
  const [ltvPredictions, setLtvPredictions] = useState<LTVPrediction[]>([]);
  const [engagementForecasts, setEngagementForecasts] = useState<EngagementForecast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const loadData = async () => {
    try {
      const [modelsData, churnData, ltvData, engagementData] = await Promise.all([
        PredictiveAnalyticsService.getPredictiveModels(user.id),
        PredictiveAnalyticsService.predictChurn(user.id),
        PredictiveAnalyticsService.predictLTV(user.id),
        PredictiveAnalyticsService.forecastEngagement(user.id),
      ]);

      setModels(modelsData);
      setChurnPredictions(churnData.slice(0, 10)); // Show top 10
      setLtvPredictions(ltvData.slice(0, 10));
      setEngagementForecasts(engagementData.slice(0, 10));
    } catch (error) {
      console.error('Error loading predictive analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load predictive analytics data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createSampleModel = async () => {
    try {
      await PredictiveAnalyticsService.createPredictiveModel(user.id, {
        model_name: 'Churn Risk Predictor',
        model_type: 'churn_prediction',
        algorithm: 'random_forest',
        model_parameters: {
          n_estimators: 100,
          max_depth: 10,
          min_samples_split: 5,
        },
        feature_columns: ['engagement_score', 'days_since_last_engagement', 'email_frequency'],
        target_column: 'churned',
        is_active: true,
      });

      toast({
        title: 'Success',
        description: 'Sample predictive model created',
      });
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create predictive model',
        variant: 'destructive',
      });
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <TrendingUp className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 bg-gray-100 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Predictive Analytics</h1>
          <p className="text-muted-foreground">
            AI-powered insights for churn prediction, lifetime value, and engagement forecasting.
          </p>
        </div>
        <Button onClick={createSampleModel}>
          <Brain className="h-4 w-4 mr-2" />
          Create Model
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Models</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{models.filter(m => m.is_active).length}</div>
            <p className="text-xs text-muted-foreground">
              {models.length} total models
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Churn Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {churnPredictions.filter(p => p.risk_level === 'high').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Contacts at risk
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg LTV</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${ltvPredictions.length > 0 
                ? Math.round(ltvPredictions.reduce((sum, p) => sum + p.predicted_ltv, 0) / ltvPredictions.length)
                : 0
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Predicted lifetime value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Model Accuracy</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {models.length > 0 && models.some(m => m.accuracy_score)
                ? Math.round(models
                    .filter(m => m.accuracy_score)
                    .reduce((sum, m) => sum + m.accuracy_score!, 0) / 
                  models.filter(m => m.accuracy_score).length * 100)
                : 85
              }%
            </div>
            <p className="text-xs text-muted-foreground">
              Across all models
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="churn" className="space-y-6">
        <TabsList>
          <TabsTrigger value="churn">Churn Prediction</TabsTrigger>
          <TabsTrigger value="ltv">Lifetime Value</TabsTrigger>
          <TabsTrigger value="engagement">Engagement Forecast</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
        </TabsList>

        <TabsContent value="churn">
          <Card>
            <CardHeader>
              <CardTitle>Churn Risk Analysis</CardTitle>
              <CardDescription>
                Contacts most likely to disengage, with recommended actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {churnPredictions.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No churn predictions</h3>
                  <p className="text-gray-500 mb-4">
                    We need more behavioral data to generate churn predictions.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {churnPredictions.map((prediction, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{prediction.email_address}</span>
                          <Badge className={getRiskColor(prediction.risk_level)}>
                            {prediction.risk_level} risk
                          </Badge>
                        </div>
                        <span className="text-sm text-gray-600">
                          {Math.round(prediction.churn_probability * 100)}% probability
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        <strong>Recommended Actions:</strong>
                        <ul className="list-disc list-inside mt-1">
                          {prediction.recommended_actions.slice(0, 2).map((action, i) => (
                            <li key={i}>{action}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="flex gap-2 text-xs">
                        <span>Confidence: {Math.round(prediction.confidence * 100)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ltv">
          <Card>
            <CardHeader>
              <CardTitle>Lifetime Value Predictions</CardTitle>
              <CardDescription>
                Predicted value of each contact over the next 12 months
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ltvPredictions.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No LTV predictions</h3>
                  <p className="text-gray-500 mb-4">
                    We need more engagement data to calculate lifetime value predictions.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {ltvPredictions.map((prediction, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{prediction.email_address}</span>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-green-600">
                            ${Math.round(prediction.predicted_ltv)}
                          </div>
                          <Badge variant="outline">{prediction.ltv_category} value</Badge>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <span>Confidence: {Math.round(prediction.confidence * 100)}%</span>
                        <span className="ml-4">Time horizon: {prediction.time_horizon_days} days</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Forecasts</CardTitle>
              <CardDescription>
                Predicted changes in contact engagement over the next 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {engagementForecasts.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No engagement forecasts</h3>
                  <p className="text-gray-500 mb-4">
                    We need more historical data to generate engagement forecasts.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {engagementForecasts.map((forecast, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{forecast.email_address}</span>
                          {getTrendIcon(forecast.trend)}
                          <span className="text-sm text-gray-600 capitalize">{forecast.trend}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold">
                            {Math.round(forecast.predicted_engagement_score)}
                          </div>
                          <span className="text-xs text-gray-500">predicted score</span>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <span>Confidence: {Math.round(forecast.confidence * 100)}%</span>
                        <span className="ml-4">Period: {forecast.forecast_period_days} days</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models">
          <Card>
            <CardHeader>
              <CardTitle>Predictive Models</CardTitle>
              <CardDescription>
                Machine learning models for generating predictions and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              {models.length === 0 ? (
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No models created</h3>
                  <p className="text-gray-500 mb-4">
                    Create your first predictive model to start generating AI insights.
                  </p>
                  <Button onClick={createSampleModel}>
                    <Brain className="h-4 w-4 mr-2" />
                    Create Sample Model
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {models.map(model => (
                    <div key={model.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{model.model_name}</h3>
                          <Badge variant={model.is_active ? 'default' : 'secondary'}>
                            {model.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="outline">{model.model_type.replace('_', ' ')}</Badge>
                        </div>
                        {model.accuracy_score && (
                          <span className="text-sm text-gray-600">
                            {Math.round(model.accuracy_score * 100)}% accuracy
                          </span>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        <span>Algorithm: {model.algorithm}</span>
                        {model.training_data_size && (
                          <span className="ml-4">Training samples: {model.training_data_size}</span>
                        )}
                      </div>
                      
                      {model.last_trained_at && (
                        <div className="text-xs text-gray-500">
                          Last trained: {new Date(model.last_trained_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
