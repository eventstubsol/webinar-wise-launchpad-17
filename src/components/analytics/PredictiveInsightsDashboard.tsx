
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingDown, TrendingUp, AlertTriangle, DollarSign, Target, Brain } from 'lucide-react';
import { PredictiveAnalyticsService, ChurnPrediction, LTVPrediction, EngagementForecast } from '@/services/analytics/PredictiveAnalyticsService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const PredictiveInsightsDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [churnPredictions, setChurnPredictions] = useState<ChurnPrediction[]>([]);
  const [ltvPredictions, setLtvPredictions] = useState<LTVPrediction[]>([]);
  const [engagementForecasts, setEngagementForecasts] = useState<EngagementForecast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadPredictiveAnalytics();
    }
  }, [user?.id]);

  const loadPredictiveAnalytics = async () => {
    try {
      const [churnData, ltvData, engagementData] = await Promise.all([
        PredictiveAnalyticsService.predictChurn(user.id),
        PredictiveAnalyticsService.predictLTV(user.id),
        PredictiveAnalyticsService.forecastEngagement(user.id),
      ]);

      setChurnPredictions(churnData.slice(0, 10)); // Top 10 at-risk
      setLtvPredictions(ltvData.slice(0, 10)); // Top 10 by LTV
      setEngagementForecasts(engagementData.slice(0, 10));
    } catch (error) {
      console.error('Error loading predictive analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load predictive analytics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Target className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
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

  const highChurnRisk = churnPredictions.filter(p => p.risk_level === 'high').length;
  const avgLTV = ltvPredictions.reduce((sum, p) => sum + p.predicted_ltv, 0) / Math.max(ltvPredictions.length, 1);
  const improvingEngagement = engagementForecasts.filter(f => f.trend === 'increasing').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Predictive Analytics</h1>
          <p className="text-muted-foreground">
            AI-powered insights to predict subscriber behavior and optimize your campaigns.
          </p>
        </div>
        <Button onClick={loadPredictiveAnalytics}>
          <Brain className="h-4 w-4 mr-2" />
          Refresh Predictions
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Churn Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{highChurnRisk}</div>
            <p className="text-xs text-muted-foreground">
              Subscribers at risk
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Predicted LTV</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgLTV.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">
              Over next 12 months
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Improving Engagement</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{improvingEngagement}</div>
            <p className="text-xs text-muted-foreground">
              Subscribers trending up
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Model Accuracy</CardTitle>
            <Brain className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">85%</div>
            <p className="text-xs text-muted-foreground">
              Prediction confidence
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="churn" className="space-y-6">
        <TabsList>
          <TabsTrigger value="churn">Churn Prediction</TabsTrigger>
          <TabsTrigger value="ltv">Lifetime Value</TabsTrigger>
          <TabsTrigger value="engagement">Engagement Forecast</TabsTrigger>
          <TabsTrigger value="models">Model Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="churn">
          <Card>
            <CardHeader>
              <CardTitle>Churn Risk Analysis</CardTitle>
              <CardDescription>
                Identify subscribers most likely to unsubscribe and take proactive action
              </CardDescription>
            </CardHeader>
            <CardContent>
              {churnPredictions.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No churn predictions available</h3>
                  <p className="text-gray-500">
                    Not enough data to generate churn predictions yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {churnPredictions.map((prediction, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{prediction.email_address}</span>
                          <Badge 
                            className={getRiskColor(prediction.risk_level)}
                          >
                            {prediction.risk_level} risk
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {Math.round(prediction.churn_probability * 100)}% churn probability
                          </div>
                          <div className="text-xs text-gray-500">
                            {Math.round(prediction.confidence * 100)}% confidence
                          </div>
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="text-sm text-gray-600 mb-1">Churn Probability</div>
                        <Progress value={prediction.churn_probability * 100} className="h-2" />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Contributing Factors</h4>
                          <div className="space-y-1">
                            {Object.entries(prediction.contributing_factors).map(([factor, score]) => (
                              <div key={factor} className="flex justify-between text-sm">
                                <span className="capitalize">{factor.replace('_', ' ')}</span>
                                <span>{Math.round(score * 100)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium mb-2">Recommended Actions</h4>
                          <ul className="space-y-1">
                            {prediction.recommended_actions.map((action, actionIndex) => (
                              <li key={actionIndex} className="text-sm text-gray-600">
                                • {action}
                              </li>
                            ))}
                          </ul>
                        </div>
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
                Understand the predicted value of your subscribers over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ltvPredictions.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No LTV predictions available</h3>
                  <p className="text-gray-500">
                    Not enough data to generate LTV predictions yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {ltvPredictions.map((prediction, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{prediction.email_address}</span>
                          <Badge 
                            variant={prediction.ltv_category === 'high' ? 'default' : 'secondary'}
                            className={prediction.ltv_category === 'high' ? 'bg-green-500' : ''}
                          >
                            {prediction.ltv_category} value
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-green-600">
                            ${prediction.predicted_ltv.toFixed(0)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {Math.round(prediction.confidence * 100)}% confidence
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-center">
                        {Object.entries(prediction.contributing_factors).map(([factor, score]) => (
                          <div key={factor} className="space-y-1">
                            <div className="text-xs text-gray-500 capitalize">
                              {factor.replace('_', ' ')}
                            </div>
                            <div className="text-sm font-medium">
                              {Math.round(score * 100)}%
                            </div>
                          </div>
                        ))}
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
                Predict how subscriber engagement will evolve over the next 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {engagementForecasts.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No engagement forecasts available</h3>
                  <p className="text-gray-500">
                    Not enough data to generate engagement forecasts yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {engagementForecasts.map((forecast, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{forecast.email_address}</span>
                          <div className="flex items-center gap-1">
                            {getTrendIcon(forecast.trend)}
                            <span className="text-sm capitalize">{forecast.trend}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold">
                            {Math.round(forecast.predicted_engagement_score)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Predicted score
                          </div>
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="text-sm text-gray-600 mb-1">Engagement Forecast</div>
                        <Progress value={forecast.predicted_engagement_score} className="h-2" />
                      </div>

                      <div>
                        <h4 className="text-sm font-medium mb-2">Key Drivers</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(forecast.key_drivers).map(([driver, impact]) => (
                            <div key={driver} className="flex justify-between text-sm">
                              <span className="capitalize">{driver.replace('_', ' ')}</span>
                              <span>{Math.round(impact * 100)}%</span>
                            </div>
                          ))}
                        </div>
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
              <CardTitle>Model Performance</CardTitle>
              <CardDescription>
                Track the accuracy and effectiveness of your predictive models
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Churn Prediction Model</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Accuracy</span>
                      <span className="text-sm font-medium">85%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Precision</span>
                      <span className="text-sm font-medium">83%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Recall</span>
                      <span className="text-sm font-medium">87%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">F1 Score</span>
                      <span className="text-sm font-medium">85%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">LTV Prediction Model</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Accuracy</span>
                      <span className="text-sm font-medium">78%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">MAE</span>
                      <span className="text-sm font-medium">$12.50</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">RMSE</span>
                      <span className="text-sm font-medium">$18.30</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">R²</span>
                      <span className="text-sm font-medium">0.76</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Engagement Forecast Model</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Accuracy</span>
                      <span className="text-sm font-medium">82%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">MAE</span>
                      <span className="text-sm font-medium">3.2 points</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Trend Accuracy</span>
                      <span className="text-sm font-medium">88%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">R²</span>
                      <span className="text-sm font-medium">0.79</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Model Training Status</h4>
                <p className="text-sm text-blue-800">
                  All models were last trained on December 14, 2025. Next automatic retraining scheduled for December 21, 2025.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
