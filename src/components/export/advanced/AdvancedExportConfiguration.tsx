import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Download } from 'lucide-react';
import { ExportJobManager } from '@/services/export/job/ExportJobManager';

interface AdvancedExportConfig {
  title: string;
  description: string;
  includeCharts: boolean;
  includeRawData: boolean;
  brandingConfig?: any;
  dateRange?: any;
}

export function AdvancedExportConfiguration() {
  const [config, setConfig] = useState<AdvancedExportConfig>({
    title: '',
    description: '',
    includeCharts: true,
    includeRawData: false,
  });
  const [selectedFormats, setSelectedFormats] = useState<string[]>(['pdf']);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleConfigChange = <K extends keyof AdvancedExportConfig>(
    field: K,
    value: AdvancedExportConfig[K]
  ) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleFormatToggle = (format: string) => {
    setSelectedFormats(prev =>
      prev.includes(format)
        ? prev.filter(f => f !== format)
        : [...prev, format]
    );
  };

  const handleExport = async () => {
    if (!config.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a report title",
        variant: "destructive"
      });
      return;
    }

    if (selectedFormats.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one export format",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);

    try {
      const jobs = await Promise.all(
        selectedFormats.map(format => 
          ExportJobManager.createExportJob({
            userId: '', // Will be filled automatically by the method
            exportType: 'webinar_report',
            format: format as 'pdf' | 'excel' | 'powerpoint' | 'csv',
            title: config.title,
            description: config.description,
            includeCharts: config.includeCharts,
            includeRawData: config.includeRawData,
            brandingConfig: config.brandingConfig,
            dateRange: config.dateRange
          })
        )
      );

      toast({
        title: "Export Started",
        description: `${jobs.length} advanced export job(s) created with custom configurations.`
      });

      // Reset form
      setConfig({
        title: '',
        description: '',
        includeCharts: true,
        includeRawData: false,
      });
      setSelectedFormats(['pdf']);

    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to create export jobs: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Advanced Export Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              type="text"
              id="title"
              value={config.title}
              onChange={(e) => handleConfigChange('title', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={config.description}
              onChange={(e) => handleConfigChange('description', e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="includeCharts"
            checked={config.includeCharts}
            onCheckedChange={(checked) => handleConfigChange('includeCharts', !!checked)}
          />
          <Label htmlFor="includeCharts">Include Charts</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="includeRawData"
            checked={config.includeRawData}
            onCheckedChange={(checked) => handleConfigChange('includeRawData', !!checked)}
          />
          <Label htmlFor="includeRawData">Include Raw Data</Label>
        </div>

        <div>
          <Label>Export Formats</Label>
          <div className="flex space-x-2">
            <Button
              variant={selectedFormats.includes('pdf') ? 'default' : 'outline'}
              onClick={() => handleFormatToggle('pdf')}
            >
              PDF
            </Button>
            <Button
              variant={selectedFormats.includes('excel') ? 'default' : 'outline'}
              onClick={() => handleFormatToggle('excel')}
            >
              Excel
            </Button>
            <Button
              variant={selectedFormats.includes('powerpoint') ? 'default' : 'outline'}
              onClick={() => handleFormatToggle('powerpoint')}
            >
              PowerPoint
            </Button>
            <Button
              variant={selectedFormats.includes('csv') ? 'default' : 'outline'}
              onClick={() => handleFormatToggle('csv')}
            >
              CSV
            </Button>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : 'Generate Export'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
