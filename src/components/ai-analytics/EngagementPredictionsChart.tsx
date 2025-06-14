
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EngagementPrediction } from '@/types/ai-analytics';

interface EngagementPredictionsChartProps {
  predictions: EngagementPrediction[];
  title?: string;
}

export const EngagementPredictionsChart: React.FC<EngagementPredictionsChartProps> = ({
  predictions,
  title = "Engagement Predictions"
}) => {
  // Group predictions by type and time
  const chartData = React.useMemo(() => {
    const timeGroups: Record<string, any> = {};

    predictions.forEach(prediction => {
      const timeKey = new Date(prediction.prediction_timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });

      if (!timeGroups[timeKey]) {
        timeGroups[timeKey] = { time: timeKey };
      }

      // Add prediction value with confidence weighting
      const weightedValue = prediction.predicted_value * prediction.confidence_score;
      timeGroups[timeKey][prediction.prediction_type] = weightedValue;
      
      // Track confidence separately
      timeGroups[timeKey][`${prediction.prediction_type}_confidence`] = prediction.confidence_score;
    });

    return Object.values(timeGroups).sort((a, b) => 
      new Date(`2000-01-01 ${a.time}`).getTime() - new Date(`2000-01-01 ${b.time}`).getTime()
    );
  }, [predictions]);

  const predictionTypes = React.useMemo(() => {
    const types = new Set<string>();
    predictions.forEach(p => types.add(p.prediction_type));
    return Array.from(types);
  }, [predictions]);

  const getLineColor = (type: string) => {
    const colors: Record<string, string> = {
      'dropout_risk': '#ef4444',
      'engagement_score': '#22c55e',
      'interaction_likelihood': '#3b82f6',
      'attention_score': '#f59e0b'
    };
    return colors[type] || '#6b7280';
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-lg">
          <p className="font-medium">{`Time: ${label}`}</p>
          {payload.map((entry: any, index: number) => {
            if (entry.dataKey.includes('_confidence')) return null;
            
            const confidence = payload.find((p: any) => 
              p.dataKey === `${entry.dataKey}_confidence`
            )?.value;

            return (
              <div key={index} className="text-sm">
                <span style={{ color: entry.color }}>
                  {entry.dataKey.replace('_', ' ')}: {(entry.value * 100).toFixed(1)}%
                </span>
                {confidence && (
                  <span className="text-gray-500 ml-2">
                    (confidence: {(confidence * 100).toFixed(0)}%)
                  </span>
                )}
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            No prediction data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis 
              domain={[0, 1]}
              tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {predictionTypes.map(type => (
              <Line
                key={type}
                type="monotone"
                dataKey={type}
                stroke={getLineColor(type)}
                strokeWidth={2}
                dot={{ r: 3 }}
                name={type.replace('_', ' ').toUpperCase()}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
