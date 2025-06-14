
import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { CustomMetric } from '../../../types/ai-analytics';

interface MetricPreviewProps {
  metric: Partial<CustomMetric>;
}

export const MetricPreview: React.FC<MetricPreviewProps> = ({ metric }) => (
  <motion.div
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: 'auto' }}
    exit={{ opacity: 0, height: 0 }}
    className="border rounded-lg p-4 bg-gray-50"
  >
    <div className="flex items-center justify-between mb-4">
      <h4 className="font-medium">{metric.metric_name || 'Untitled Metric'}</h4>
      <Badge variant="outline">{metric.chart_type}</Badge>
    </div>
    
    <div className="space-y-2">
      <div className="text-2xl font-bold text-blue-600">
        {Math.random() > 0.5 ? '87.3%' : '1,247'}
      </div>
      <div className="text-sm text-gray-600">
        Formula: {metric.calculation_formula || 'No formula defined'}
      </div>
      {(metric.warning_threshold || metric.critical_threshold) && (
        <div className="flex space-x-2">
          {metric.warning_threshold && (
            <Badge variant="outline" className="text-yellow-600">
              Warning: {metric.warning_threshold}
            </Badge>
          )}
          {metric.critical_threshold && (
            <Badge variant="outline" className="text-red-600">
              Critical: {metric.critical_threshold}
            </Badge>
          )}
        </div>
      )}
    </div>
  </motion.div>
);
