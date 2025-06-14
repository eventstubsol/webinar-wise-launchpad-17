
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Settings } from 'lucide-react';
import { CustomMetric } from '../../../types/ai-analytics';

interface MetricConfigurationFormProps {
  currentMetric: Partial<CustomMetric>;
  onUpdateMetric: (updates: Partial<CustomMetric>) => void;
  formulaTemplates: Array<{
    name: string;
    formula: string;
    description: string;
  }>;
}

const dataSourceOptions = [
  { value: 'webinars', label: 'Webinars' },
  { value: 'participants', label: 'Participants' },
  { value: 'interactions', label: 'Interactions' },
  { value: 'engagement', label: 'Engagement Data' },
  { value: 'custom', label: 'Custom Query' }
];

const aggregationOptions = [
  { value: 'sum', label: 'Sum' },
  { value: 'avg', label: 'Average' },
  { value: 'count', label: 'Count' },
  { value: 'min', label: 'Minimum' },
  { value: 'max', label: 'Maximum' },
  { value: 'median', label: 'Median' }
];

export const MetricConfigurationForm: React.FC<MetricConfigurationFormProps> = ({
  currentMetric,
  onUpdateMetric,
  formulaTemplates
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Metric Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="metricName">Metric Name</Label>
          <Input
            id="metricName"
            placeholder="e.g., Attendance Rate"
            value={currentMetric.metric_name || ''}
            onChange={(e) => onUpdateMetric({
              metric_name: e.target.value
            })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="metricDescription">Description</Label>
          <Textarea
            id="metricDescription"
            placeholder="Describe what this metric measures..."
            value={currentMetric.metric_description || ''}
            onChange={(e) => onUpdateMetric({
              metric_description: e.target.value
            })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Data Source</Label>
            <Select
              value={currentMetric.data_type || 'number'}
              onValueChange={(value) => onUpdateMetric({
                data_type: value as any
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dataSourceOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Aggregation</Label>
            <Select
              value={currentMetric.aggregation_method || 'sum'}
              onValueChange={(value) => onUpdateMetric({
                aggregation_method: value
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {aggregationOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Formula</Label>
          <Textarea
            placeholder="e.g., (attendees / registrations) * 100"
            value={currentMetric.calculation_formula || ''}
            onChange={(e) => onUpdateMetric({
              calculation_formula: e.target.value
            })}
            className="font-mono text-sm"
          />
        </div>

        <div className="space-y-3">
          <Label>Formula Templates</Label>
          <div className="space-y-2">
            {formulaTemplates.map((template, index) => (
              <div key={index} className="border rounded p-2 hover:bg-gray-50 cursor-pointer"
                   onClick={() => onUpdateMetric({
                     metric_name: currentMetric.metric_name || template.name,
                     calculation_formula: template.formula,
                     metric_description: currentMetric.metric_description || template.description
                   })}>
                <div className="font-medium text-sm">{template.name}</div>
                <div className="text-xs text-gray-600 font-mono">{template.formula}</div>
                <div className="text-xs text-gray-500">{template.description}</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
