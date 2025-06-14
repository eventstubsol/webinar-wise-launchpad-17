
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { TrendingUp, Table } from 'lucide-react';
import { ExportConfig } from '@/services/export/types';

interface ReportBasicSettingsProps {
  config: Pick<ExportConfig, 'title' | 'description' | 'includeCharts' | 'includeRawData'>;
  onConfigChange: <K extends keyof ReportBasicSettingsProps['config']>(
    field: K,
    value: ReportBasicSettingsProps['config'][K]
  ) => void;
}

export function ReportBasicSettings({ config, onConfigChange }: ReportBasicSettingsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Report Title *</Label>
          <Input
            id="title"
            value={config.title}
            onChange={(e) => onConfigChange('title', e.target.value)}
            placeholder="Q4 Webinar Analytics Report"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={config.description || ''}
            onChange={(e) => onConfigChange('description', e.target.value)}
            placeholder="Comprehensive analysis of webinar performance..."
            rows={3}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium">Include in Report</h4>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="charts"
              checked={config.includeCharts}
              onCheckedChange={(checked) => 
                onConfigChange('includeCharts', !!checked)
              }
            />
            <Label htmlFor="charts" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Charts and Visualizations
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="rawdata"
              checked={config.includeRawData}
              onCheckedChange={(checked) => 
                onConfigChange('includeRawData', !!checked)
              }
            />
            <Label htmlFor="rawdata" className="flex items-center gap-2">
              <Table className="h-4 w-4" />
              Raw Data Tables
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
}
