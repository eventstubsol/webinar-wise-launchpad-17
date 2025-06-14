
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';
import { CustomMetric } from '../../../types/ai-analytics';

interface MetricCardProps {
  metric: CustomMetric;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  metric,
  onToggle,
  onDelete
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    layout
  >
    <Card className={`${!metric.is_active ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{metric.metric_name}</CardTitle>
            <p className="text-sm text-gray-600 line-clamp-2">
              {metric.metric_description}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={metric.is_active}
              onCheckedChange={() => onToggle(metric.id)}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(metric.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded">
          {metric.calculation_formula}
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Source:</span>
          <Badge variant="outline">{metric.data_type}</Badge>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Type:</span>
          <Badge variant="outline">{metric.chart_type}</Badge>
        </div>

        {(metric.warning_threshold || metric.critical_threshold) && (
          <div className="flex space-x-2">
            {metric.warning_threshold && (
              <Badge variant="outline" className="text-yellow-600 text-xs">
                ⚠ {metric.warning_threshold}
              </Badge>
            )}
            {metric.critical_threshold && (
              <Badge variant="outline" className="text-red-600 text-xs">
                🚨 {metric.critical_threshold}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  </motion.div>
);
