
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Image, 
  Palette, 
  Settings, 
  Download,
  Calendar,
  Filter,
  Target,
  Sparkles,
  Upload
} from 'lucide-react';
import { DatabaseTemplateManager } from '@/services/export/templates/DatabaseTemplateManager';
import { ExportJobManager } from '@/services/export/job/ExportJobManager';
import { ExportConfig, BrandingConfig, ReportTemplate } from '@/services/export/types';
import { useToast } from '@/hooks/use-toast';

export function AdvancedExportConfiguration() {
  const [config, setConfig] = useState<ExportConfig>({
    title: '',
    description: '',
    includeCharts: true,
    includeRawData: false,
    brandingConfig: {
      primaryColor: '#3B82F6',
      secondaryColor: '#E5E7EB',
      fontFamily: 'Helvetica'
    }
  });

  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedFormats, setSelectedFormats] = useState<string[]>(['pdf']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const userTemplates = await DatabaseTemplateManager.getTemplates();
      const publicTemplates = await DatabaseTemplateManager.getPublicTemplates();
      setTemplates([...userTemplates, ...publicTemplates]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive"
      });
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setLogoPreview(result);
        setConfig(prev => ({
          ...prev,
          brandingConfig: {
            ...prev.brandingConfig,
            logo: result
          }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBrandingChange = <K extends keyof BrandingConfig>(
    field: K,
    value: BrandingConfig[K]
  ) => {
    setConfig(prev => ({
      ...prev,
      brandingConfig: {
        ...prev.brandingConfig,
        [field]: value
      }
    }));
  };

  const handleFormatToggle = (format: string) => {
    setSelectedFormats(prev => 
      prev.includes(format) 
        ? prev.filter(f => f !== format)
        : [...prev, format]
    );
  };

  const handleTemplateSelect = async (templateId: string) => {
    if (!templateId) return;
    
    try {
      const template = await DatabaseTemplateManager.getTemplate(templateId);
      if (template) {
        setSelectedTemplate(templateId);
        setConfig(prev => ({
          ...prev,
          templateId: templateId,
          brandingConfig: {
            ...prev.brandingConfig,
            ...template.branding_config
          }
        }));
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load template",
        variant: "destructive"
      });
    }
  };

  const simulateProgress = () => {
    setGenerationProgress(0);
    const interval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + Math.random() * 10 + 5;
      });
    }, 500);
    return interval;
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
    const progressInterval = simulateProgress();

    try {
      const jobs = await Promise.all(
        selectedFormats.map(format => 
          ExportJobManager.createExportJob(format as 'pdf' | 'excel' | 'powerpoint' | 'csv', config)
        )
      );

      setGenerationProgress(100);
      setTimeout(() => {
        clearInterval(progressInterval);
        setGenerationProgress(0);
        setIsGenerating(false);
      }, 1000);

      toast({
        title: "Export Started",
        description: `${jobs.length} export job(s) created successfully. You'll be notified when ready.`
      });

      // Reset form
      setConfig({
        title: '',
        description: '',
        includeCharts: true,
        includeRawData: false,
        brandingConfig: {
          primaryColor: '#3B82F6',
          secondaryColor: '#E5E7EB',
          fontFamily: 'Helvetica'
        }
      });
      setSelectedFormats(['pdf']);
      setLogoFile(null);
      setLogoPreview('');

    } catch (error) {
      clearInterval(progressInterval);
      setIsGenerating(false);
      setGenerationProgress(0);
      
      toast({
        title: "Error",
        description: `Failed to create export jobs: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Advanced Export Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Settings</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="data">Data Selection</TabsTrigger>
            <TabsTrigger value="formats">Export Formats</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Report Title *</Label>
                  <Input
                    id="title"
                    value={config.title}
                    onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Q4 Webinar Performance Report"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={config.description || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Comprehensive analysis of webinar performance..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Report Template</Label>
                  <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Custom Report</SelectItem>
                      {templates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.template_name}
                          {template.user_id === 'system' && (
                            <Badge variant="secondary" className="ml-2">Built-in</Badge>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="charts">Include Charts</Label>
                  <Switch
                    id="charts"
                    checked={config.includeCharts}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeCharts: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="rawdata">Include Raw Data</Label>
                  <Switch
                    id="rawdata"
                    checked={config.includeRawData}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeRawData: checked }))}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="branding" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Company Logo</Label>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                    {logoPreview ? (
                      <div className="space-y-2">
                        <img 
                          src={logoPreview} 
                          alt="Logo preview" 
                          className="h-16 mx-auto object-contain"
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setLogoFile(null);
                            setLogoPreview('');
                            setConfig(prev => ({
                              ...prev,
                              brandingConfig: { ...prev.brandingConfig, logo: undefined }
                            }));
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-8 w-8 mx-auto text-gray-400" />
                        <div className="text-sm text-gray-600">Upload company logo</div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                          id="logo-upload"
                        />
                        <Label htmlFor="logo-upload" className="cursor-pointer">
                          <Button variant="outline" size="sm" asChild>
                            <span>Choose File</span>
                          </Button>
                        </Label>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Company Name</Label>
                  <Input
                    id="company"
                    value={config.brandingConfig?.companyName || ''}
                    onChange={(e) => handleBrandingChange('companyName', e.target.value)}
                    placeholder="Your Company Name"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="primary-color">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primary-color"
                      type="color"
                      value={config.brandingConfig?.primaryColor || '#3B82F6'}
                      onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
                      className="w-16 h-10 p-1 rounded"
                    />
                    <Input
                      value={config.brandingConfig?.primaryColor || '#3B82F6'}
                      onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
                      placeholder="#3B82F6"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondary-color">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondary-color"
                      type="color"
                      value={config.brandingConfig?.secondaryColor || '#E5E7EB'}
                      onChange={(e) => handleBrandingChange('secondaryColor', e.target.value)}
                      className="w-16 h-10 p-1 rounded"
                    />
                    <Input
                      value={config.brandingConfig?.secondaryColor || '#E5E7EB'}
                      onChange={(e) => handleBrandingChange('secondaryColor', e.target.value)}
                      placeholder="#E5E7EB"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="font">Font Family</Label>
                  <Select 
                    value={config.brandingConfig?.fontFamily || 'Helvetica'} 
                    onValueChange={(value) => handleBrandingChange('fontFamily', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Helvetica">Helvetica</SelectItem>
                      <SelectItem value="Arial">Arial</SelectItem>
                      <SelectItem value="Times">Times New Roman</SelectItem>
                      <SelectItem value="Calibri">Calibri</SelectItem>
                      <SelectItem value="Inter">Inter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
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
                  <Label>Quick Date Ranges</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Last 30 days', days: 30 },
                      { label: 'Last 90 days', days: 90 },
                      { label: 'Last 6 months', days: 180 },
                      { label: 'Last year', days: 365 }
                    ].map(range => (
                      <Button 
                        key={range.label}
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const end = new Date().toISOString().split('T')[0];
                          const start = new Date(Date.now() - range.days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                          setConfig(prev => ({
                            ...prev,
                            dateRange: { start, end }
                          }));
                        }}
                      >
                        {range.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Content Sections</Label>
                  <div className="space-y-2">
                    {[
                      { id: 'summary', label: 'Executive Summary', icon: '📊' },
                      { id: 'metrics', label: 'Key Metrics', icon: '📈' },
                      { id: 'performance', label: 'Performance Analysis', icon: '🎯' },
                      { id: 'engagement', label: 'Engagement Trends', icon: '💬' },
                      { id: 'recommendations', label: 'Recommendations', icon: '💡' }
                    ].map(section => (
                      <div key={section.id} className="flex items-center space-x-2">
                        <Switch id={section.id} defaultChecked />
                        <Label htmlFor={section.id} className="flex items-center gap-2">
                          <span>{section.icon}</span>
                          {section.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="formats" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Label>Export Formats</Label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'pdf', label: 'PDF Report', icon: '📄', description: 'Professional presentation format' },
                    { id: 'excel', label: 'Excel Workbook', icon: '📊', description: 'Data analysis and pivot tables' },
                    { id: 'powerpoint', label: 'PowerPoint', icon: '📽️', description: 'Slide presentation' },
                    { id: 'csv', label: 'CSV Data', icon: '📋', description: 'Raw data export' }
                  ].map(format => (
                    <Card 
                      key={format.id}
                      className={`cursor-pointer transition-all ${
                        selectedFormats.includes(format.id) 
                          ? 'ring-2 ring-blue-500 bg-blue-50' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleFormatToggle(format.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <span className="text-2xl">{format.icon}</span>
                          <div className="flex-1">
                            <h3 className="font-medium">{format.label}</h3>
                            <p className="text-sm text-gray-500 mt-1">{format.description}</p>
                          </div>
                          {selectedFormats.includes(format.id) && (
                            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <Label>Export Options</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="compress">Compress Files</Label>
                    <Switch id="compress" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="watermark">Add Watermark</Label>
                    <Switch id="watermark" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password Protection</Label>
                    <Switch id="password" />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Estimated Export Sizes</Label>
                  <div className="space-y-1 text-sm text-gray-600">
                    {selectedFormats.includes('pdf') && <div>📄 PDF: ~2-5 MB</div>}
                    {selectedFormats.includes('excel') && <div>📊 Excel: ~1-3 MB</div>}
                    {selectedFormats.includes('powerpoint') && <div>📽️ PowerPoint: ~3-8 MB</div>}
                    {selectedFormats.includes('csv') && <div>📋 CSV: ~0.5-1 MB</div>}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {isGenerating && (
          <Card className="mt-6">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Generating exports...</span>
                  <span className="text-sm text-gray-500">{Math.round(generationProgress)}%</span>
                </div>
                <Progress value={generationProgress} className="h-2" />
                <div className="text-xs text-gray-500">
                  Creating {selectedFormats.length} export format{selectedFormats.length > 1 ? 's' : ''}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button variant="outline" disabled={isGenerating}>
            Save as Template
          </Button>
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating || !config.title.trim() || selectedFormats.length === 0}
            className="min-w-32"
          >
            <Download className="h-4 w-4 mr-2" />
            {isGenerating ? 'Generating...' : 'Generate Reports'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
