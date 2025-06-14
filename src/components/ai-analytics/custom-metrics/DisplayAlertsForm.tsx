
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Target, Play, Save, LineChart, BarChart3, PieChart } from 'lucide-react';
import { CustomMetric } from '../../../types/ai-analytics';

interface DisplayAlertsFormProps {
  currentMetric: Partial<CustomMetric>;
  onUpdateMetric: (updates: Partial<CustomMetric>) => void;
  onPreview: () => void;
  onSave: () => void;
  showPreview: boolean;
  canSave: boolean;
}

const timeframeOptions = [
  { value: '1d', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom Range' }
];

const visualizationOptions = [
  { value: 'line', label: 'Line Chart', icon: LineChart },
  { value: 'bar', label: 'Bar Chart', icon: BarChart3 },
  { value: 'pie', label: 'Pie Chart', icon: PieChart },
  { value: 'metric', label: 'Single Metric', icon: Target }
];

export const DisplayAlertsForm: React.FC<DisplayAlertsFormProps> = ({
  currentMetric,
  onUpdateMetric,
  onPreview,
  onSave,
  showPreview,
  canSave
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Display & Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Timeframe</Label>
            <Select
              value={currentMetric.time_period_days?.toString() || '7'}
              onValueChange={(value) => onUpdateMetric({
                time_period_days: parseInt(value) || 7
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeframeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Visualization</Label>
            <Select
              value={currentMetric.chart_type || 'line'}
              onValueChange={(value) => onUpdateMetric({
                chart_type: value
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {visualizationOptions.map(option => {
                  const Icon = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {option.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          <Label>Alert Thresholds</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-yellow-600">Warning Level</Label>
              <Input
                type="number"
                placeholder="0"
                value={currentMetric.warning_threshold || ''}
                onChange={(e) => onUpdateMetric({
                  warning_threshold: parseFloat(e.target.value) || undefined
                })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-red-600">Critical Level</Label>
              <Input
                type="number"
                placeholder="0"
                value={currentMetric.critical_threshold || ''}
                onChange={(e) => onUpdateMetric({
                  critical_threshold: parseFloat(e.target.value) || undefined
                })}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="activeToggle">Active by Default</Label>
          <Switch
            id="activeToggle"
            checked={currentMetric.is_active ?? true}
            onCheckedChange={(checked) => onUpdateMetric({
              is_active: checked
            })}
          />
        </div>

        <div className="space-y-3">
          <Button
            variant="outline"
            onClick={onPreview}
            className="w-full"
          >
            <Play className="w-4 h-4 mr-2" />
            {showPreview ? 'Hide Preview' : 'Preview Metric'}
          </Button>

          <Button
            onClick={onSave}
            disabled={!canSave}
            className="w-full"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Metric
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
