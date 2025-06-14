
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingDown, 
  TrendingUp, 
  Clock, 
  Users, 
  AlertTriangle,
  Target
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  Cell,
  ScatterChart,
  Scatter
} from 'recharts';

interface PredictiveAnalyticsProps {
  webinarId?: string;
  timeframe?: 'realtime' | '1h' | '24h' | '7d';
}

export const PredictiveAnalytics: React.FC<PredictiveAnalyticsProps> = ({
  webinarId,
  timeframe = '1h'
}) => {
  const [activeTab, setActiveTab] = useState('dropout');
  const [predictions, setPredictions] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Mock data - in real implementation, fetch from API
  useEffect(() => {
    const mockPredictions = {
      dropout: {
        risk_score: 0.73,
        predicted_dropouts: 156,
        confidence_bands: [
          { time: '0:00', low: 0, high: 5, predicted: 2 },
          { time: '0:15', low: 8, high: 18, predicted: 12 },
          { time: '0:30', low: 25, high: 45, predicted: 35 },
          { time: '0:45', low: 45, high: 75, predicted: 60 },
          { time: '1:00', low: 80, high: 120, predicted: 95 }
        ]
      },
      engagement: {
        forecast_score: 0.68,
        peak_engagement_time: '0:23',
        engagement_timeline: [
          { time: '0:00', engagement: 85, predicted: 82 },
          { time: '0:10', engagement: 78, predicted: 75 },
          { time: '0:20', engagement: 82, predicted: 85 },
          { time: '0:30', engagement: 75, predicted: 70 },
          { time: '0:40', engagement: 68, predicted: 65 }
        ]
      },
      timing: {
        optimal_duration: 42,
        recommended_breaks: ['0:15', '0:30'],
        interaction_windows: [
          { start: '0:05', end: '0:10', type: 'poll', effectiveness: 0.89 },
          { start: '0:22', end: '0:25', type: 'qa', effectiveness: 0.76 },
          { start: '0:35', end: '0:38', type: 'poll', effectiveness: 0.82 }
        ]
      },
      conversion: {
        registration_funnel: [
          { stage: 'Landing Page Views', value: 1200, predicted: 1180 },
          { stage: 'Registration Started', value: 480, predicted: 465 },
          { stage: 'Registration Completed', value: 380, predicted: 370 },
          { stage: 'Actually Attended', value: 245, predicted: 250 }
        ],
        conversion_factors: [
          { factor: 'Email Subject Line', impact: 0.23, confidence: 0.87 },
          { factor: 'Registration Form Length', impact: -0.18, confidence: 0.91 },
          { factor: 'Social Proof', impact: 0.31, confidence: 0.79 }
        ]
      }
    };

    setTimeout(() => {
      setPredictions(mockPredictions);
      setLoading(false);
    }, 1000);
  }, [webinarId, timeframe]);

  const getRiskColor = (score: number) => {
    if (score >= 0.7) return 'text-red-600 bg-red-100';
    if (score >= 0.4) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-32 bg-gray-200 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Dropout Risk</p>
                  <p className="text-2xl font-bold text-red-600">
                    {Math.round(predictions.dropout.risk_score * 100)}%
                  </p>
                </div>
                <TrendingDown className="w-8 h-8 text-red-500" />
              </div>
              <Badge className={getRiskColor(predictions.dropout.risk_score)}>
                High Risk
              </Badge>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Engagement Forecast</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {Math.round(predictions.engagement.forecast_score * 100)}%
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-500" />
              </div>
              <p className="text-xs text-gray-500">
                Peak at {predictions.engagement.peak_engagement_time}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Optimal Duration</p>
                  <p className="text-2xl font-bold text-green-600">
                    {predictions.timing.optimal_duration}m
                  </p>
                </div>
                <Clock className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-xs text-gray-500">
                {predictions.timing.recommended_breaks.length} breaks recommended
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Predicted Attendees</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {predictions.conversion.registration_funnel[3].predicted}
                  </p>
                </div>
                <Users className="w-8 h-8 text-purple-500" />
              </div>
              <p className="text-xs text-gray-500">
                From {predictions.conversion.registration_funnel[2].predicted} registered
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Detailed Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Predictive Analytics Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="dropout">Dropout Analysis</TabsTrigger>
              <TabsTrigger value="engagement">Engagement Forecast</TabsTrigger>
              <TabsTrigger value="timing">Optimal Timing</TabsTrigger>
              <TabsTrigger value="conversion">Conversion Funnel</TabsTrigger>
            </TabsList>

            <TabsContent value="dropout" className="space-y-4">
              <div className="h-80">
                <h4 className="font-medium mb-4">Predicted Dropout Pattern with Confidence Bands</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={predictions.dropout.confidence_bands}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      dataKey="high" 
                      stackId="1" 
                      stroke="#EF4444" 
                      fill="#FEE2E2" 
                      fillOpacity={0.3}
                    />
                    <Area 
                      dataKey="low" 
                      stackId="1" 
                      stroke="#EF4444" 
                      fill="#FFFFFF" 
                      fillOpacity={1}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="predicted" 
                      stroke="#EF4444" 
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  High dropout risk detected around 30-minute mark. Consider adding an interactive element.
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="engagement" className="space-y-4">
              <div className="h-80">
                <h4 className="font-medium mb-4">Engagement Forecast vs Actual</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={predictions.engagement.engagement_timeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="engagement" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      name="Actual"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="predicted" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Predicted"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="timing" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-4">Optimal Interaction Windows</h4>
                  <div className="space-y-3">
                    {predictions.timing.interaction_windows.map((window: any, index: number) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium capitalize">{window.type}</span>
                          <Badge variant="secondary">
                            {Math.round(window.effectiveness * 100)}% effective
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {window.start} - {window.end}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-4">Recommended Schedule</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span>Optimal Duration</span>
                      <span className="font-medium">{predictions.timing.optimal_duration} minutes</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Recommended Breaks:</p>
                      {predictions.timing.recommended_breaks.map((time: string, index: number) => (
                        <div key={index} className="text-sm text-gray-600 ml-2">
                          • {time}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="conversion" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-4">Registration Funnel Predictions</h4>
                  <div className="space-y-3">
                    {predictions.conversion.registration_funnel.map((stage: any, index: number) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{stage.stage}</span>
                          <div className="flex space-x-2">
                            <Badge variant="outline">
                              Actual: {stage.value}
                            </Badge>
                            <Badge variant="secondary">
                              Predicted: {stage.predicted}
                            </Badge>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(stage.predicted / 1200) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-4">Conversion Factors</h4>
                  <div className="space-y-3">
                    {predictions.conversion.conversion_factors.map((factor: any, index: number) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{factor.factor}</span>
                          <Badge 
                            variant={factor.impact > 0 ? "default" : "destructive"}
                          >
                            {factor.impact > 0 ? '+' : ''}{Math.round(factor.impact * 100)}%
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span>Confidence</span>
                          <span>{Math.round(factor.confidence * 100)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
