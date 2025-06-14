import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { FileText, Table, Presentation, Download, Calendar, Users, TrendingUp } from 'lucide-react';
import { ExportConfig } from '@/services/export/types';
import { ExportJobManager } from '@/services/export/job/ExportJobManager';
import { useToast } from '@/components/ui/use-toast';

export function ReportBuilder() {
  const [config, setConfig] = useState<ExportConfig>({
    title: '',
    description: '',
    includeCharts: true,
    includeRawData: false,
    brandingConfig: {}
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFormats, setSelectedFormats] = useState<string[]>(['pdf']);
  const { toast } = useToast();

  const exportTypes = [
    { id: 'pdf', label: 'PDF Report', icon: FileText, description: 'Professional report with charts' },
    { id: 'excel', label: 'Excel Export', icon: Table, description: 'Raw data with analytics' },
    { id: 'powerpoint', label: 'PowerPoint', icon: Presentation, description: 'Executive presentation' }
  ];

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
          ExportJobManager.createExportJob(format as 'pdf' | 'excel' | 'powerpoint' | 'csv', config)
        )
      );

      toast({
        title: "Export Started",
        description: `${jobs.length} export job(s) created. You'll be notified when ready.`
      });

      // Reset form
      setConfig({
        title: '',
        description: '',
        includeCharts: true,
        includeRawData: false,
        brandingConfig: {}
      });
      setSelectedFormats(['pdf']);

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create export jobs. Please try again.",
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

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Report Title *</Label>
                <Input
                  id="title"
                  value={config.title}
                  onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Q4 Webinar Analytics Report"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={config.description}
                  onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
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
                      setConfig(prev => ({ ...prev, includeCharts: !!checked }))
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
                      setConfig(prev => ({ ...prev, includeRawData: !!checked }))
                    }
                  />
                  <Label htmlFor="rawdata" className="flex items-center gap-2">
                    <Table className="h-4 w-4" />
                    Raw Data Tables
                  </Label>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="data" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date Range</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={config.dateRange?.start || ''}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      dateRange: { ...(prev.dateRange || { start: '', end: '' }), start: e.target.value }
                    }))}
                  />
                  <Input
                    type="date"
                    value={config.dateRange?.end || ''}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      dateRange: { ...(prev.dateRange || { start: '', end: '' }), end: e.target.value }
                    }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Data Filters</Label>
                <Select
                  onValueChange={(value) => setConfig(prev => ({
                    ...prev,
                    // Assuming you might add a filter property to ExportConfig in the future
                    // For now, this doesn't directly map to a config property
                    // Example: filterType: value 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All webinars" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Webinars</SelectItem>
                    <SelectItem value="completed">Completed Only</SelectItem>
                    <SelectItem value="high-engagement">High Engagement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="branding" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company Name</Label>
                <Input
                  id="company"
                  value={config.brandingConfig?.companyName || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    brandingConfig: { ...prev.brandingConfig, companyName: e.target.value }
                  }))}
                  placeholder="Your Company Name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <Input
                  id="primaryColor"
                  type="color"
                  value={config.brandingConfig?.primaryColor || '#3B82F6'}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    brandingConfig: { ...prev.brandingConfig, primaryColor: e.target.value }
                  }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="footer">Footer Text</Label>
              <Input
                id="footer"
                value={config.brandingConfig?.footerText || ''}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  brandingConfig: { ...prev.brandingConfig, footerText: e.target.value }
                }))}
                placeholder="Generated by Webinar Wise Analytics"
              />
            </div>
          </TabsContent>

          <TabsContent value="formats" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {exportTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedFormats.includes(type.id);
                
                return (
                  <Card 
                    key={type.id}
                    className={`cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleFormatToggle(type.id)}
                  >
                    <CardContent className="p-4 text-center">
                      <Icon className={`h-8 w-8 mx-auto mb-2 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                      <h4 className="font-medium mb-1">{type.label}</h4>
                      <p className="text-sm text-gray-600">{type.description}</p>
                      {isSelected && (
                        <Badge variant="secondary" className="mt-2">Selected</Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
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
