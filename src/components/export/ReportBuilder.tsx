
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download } from 'lucide-react';
import { ExportConfig, BrandingConfig } from '@/services/export/types';
import { ExportJobManager } from '@/services/export/job/ExportJobManager';
import { useToast } from '@/components/ui/use-toast';

import { ReportBasicSettings } from './report-builder/ReportBasicSettings';
import { ReportDataSelection } from './report-builder/ReportDataSelection';
import { ReportBrandingSettings } from './report-builder/ReportBrandingSettings';
import { ReportFormatSelection } from './report-builder/ReportFormatSelection';

export function ReportBuilder() {
  const [config, setConfig] = useState<ExportConfig>({
    title: '',
    description: '',
    includeCharts: true,
    includeRawData: false,
    brandingConfig: {
      primaryColor: '#3B82F6' // Default primary color
    }
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFormats, setSelectedFormats] = useState<string[]>(['pdf']);
  const { toast } = useToast();

  const handleBasicConfigChange = <K extends keyof Pick<ExportConfig, 'title' | 'description' | 'includeCharts' | 'includeRawData'>>(
    field: K,
    value: Pick<ExportConfig, 'title' | 'description' | 'includeCharts' | 'includeRawData'>[K]
  ) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    setConfig(prev => ({
      ...prev,
      dateRange: { ...(prev.dateRange || { start: '', end: '' }), [field]: value }
    }));
  };
  
  const handleDataFilterChange = (value: string) => {
    // Placeholder for actual filter logic if needed
    // For example, you might set a specific filter property in config:
    // setConfig(prev => ({ ...prev, filterType: value }));
    console.log("Selected filter:", value);
  };

  const handleBrandingConfigChange = <K extends keyof BrandingConfig>(
    field: K,
    value: BrandingConfig[K]
  ) => {
    setConfig(prev => ({
      ...prev,
      brandingConfig: { ...(prev.brandingConfig || {}), [field]: value }
    }));
  };
  
  const handleFormatToggle = (format: string) => {
    setSelectedFormats(prev => 
      prev.includes(format) 
        ? prev.filter(f => f !== format)
        : [...prev, format]
    );
  };

  const handleGenerate = async () => {
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

    setIsGenerating(true);

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
        description: `${jobs.length} export job(s) created. You'll be notified when ready.`
      });

      setConfig({
        title: '',
        description: '',
        includeCharts: true,
        includeRawData: false,
        brandingConfig: { primaryColor: '#3B82F6' }
      });
      setSelectedFormats(['pdf']);

    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to create export jobs: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Report Builder
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList>
            <TabsTrigger value="basic">Basic Settings</TabsTrigger>
            <TabsTrigger value="data">Data Selection</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="formats">Export Formats</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <ReportBasicSettings
              config={{
                title: config.title,
                description: config.description,
                includeCharts: config.includeCharts,
                includeRawData: config.includeRawData,
              }}
              onConfigChange={handleBasicConfigChange}
            />
          </TabsContent>

          <TabsContent value="data">
            <ReportDataSelection
              dateRange={config.dateRange}
              onDateRangeChange={handleDateRangeChange}
              onFilterChange={handleDataFilterChange}
            />
          </TabsContent>

          <TabsContent value="branding">
            <ReportBrandingSettings
              brandingConfig={config.brandingConfig}
              onBrandingConfigChange={handleBrandingConfigChange}
            />
          </TabsContent>

          <TabsContent value="formats">
            <ReportFormatSelection
              selectedFormats={selectedFormats}
              onFormatToggle={handleFormatToggle}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-6 border-t">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="min-w-32"
          >
            {isGenerating ? 'Generating...' : 'Generate Reports'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
