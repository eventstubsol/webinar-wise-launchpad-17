
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Trash2, 
  Save, 
  Play, 
  Settings, 
  Target,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';

interface CustomMetric {
  id: string;
  name: string;
  description: string;
  formula: string;
  dataSource: string;
  aggregation: string;
  timeframe: string;
  threshold: {
    warning: number;
    critical: number;
  };
  visualization: string;
  isActive: boolean;
}

export const CustomMetricsBuilder: React.FC = () => {
  const [activeTab, setActiveTab] = useState('builder');
  const [metrics, setMetrics] = useState<CustomMetric[]>([]);
  const [currentMetric, setCurrentMetric] = useState<Partial<CustomMetric>>({
    name: '',
    description: '',
    formula: '',
    dataSource: 'webinars',
    aggregation: 'sum',
    timeframe: '7d',
    threshold: { warning: 0, critical: 0 },
    visualization: 'line',
    isActive: true
  });
  const [showPreview, setShowPreview] = useState(false);

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

  const formulaTemplates = [
    {
      name: 'Attendance Rate',
      formula: '(attendees / registrations) * 100',
      description: 'Percentage of registered users who attended'
    },
    {
      name: 'Engagement Score',
      formula: '(polls_answered + questions_asked + chat_messages) / attendees',
      description: 'Average engagement actions per attendee'
    },
    {
      name: 'Retention Rate',
      formula: '(stayed_till_end / total_attendees) * 100',
      description: 'Percentage of attendees who stayed until the end'
    },
    {
      name: 'Question Response Rate',
      formula: '(answered_questions / total_questions) * 100',
      description: 'Percentage of questions that received answers'
    }
  ];

  const handleSaveMetric = () => {
    if (!currentMetric.name || !currentMetric.formula) {
      return;
    }

    const newMetric: CustomMetric = {
      id: Date.now().toString(),
      name: currentMetric.name!,
      description: currentMetric.description || '',
      formula: currentMetric.formula!,
      dataSource: currentMetric.dataSource!,
      aggregation: currentMetric.aggregation!,
      timeframe: currentMetric.timeframe!,
      threshold: currentMetric.threshold!,
      visualization: currentMetric.visualization!,
      isActive: currentMetric.isActive!
    };

    setMetrics([...metrics, newMetric]);
    setCurrentMetric({
      name: '',
      description: '',
      formula: '',
      dataSource: 'webinars',
      aggregation: 'sum',
      timeframe: '7d',
      threshold: { warning: 0, critical: 0 },
      visualization: 'line',
      isActive: true
    });
  };

  const handleDeleteMetric = (id: string) => {
    setMetrics(metrics.filter(m => m.id !== id));
  };

  const handleToggleMetric = (id: string) => {
    setMetrics(metrics.map(m => 
      m.id === id ? { ...m, isActive: !m.isActive } : m
    ));
  };

  const MockMetricPreview = ({ metric }: { metric: Partial<CustomMetric> }) => (
    <div className="border rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium">{metric.name || 'Untitled Metric'}</h4>
        <Badge variant="outline">{metric.visualization}</Badge>
      </div>
      
      <div className="space-y-2">
        <div className="text-2xl font-bold text-blue-600">
          {Math.random() > 0.5 ? '87.3%' : '1,247'}
        </div>
        <div className="text-sm text-gray-600">
          Formula: {metric.formula || 'No formula defined'}
        </div>
        {metric.threshold && (metric.threshold.warning > 0 || metric.threshold.critical > 0) && (
          <div className="flex space-x-2">
            {metric.threshold.warning > 0 && (
              <Badge variant="outline" className="text-yellow-600">
                Warning: {metric.threshold.warning}
              </Badge>
            )}
            {metric.threshold.critical > 0 && (
              <Badge variant="outline" className="text-red-600">
                Critical: {metric.threshold.critical}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Custom Metrics Builder</h2>
          <p className="text-gray-600">Create and manage custom KPIs for your webinar analytics</p>
        </div>
        <Badge variant="secondary">{metrics.length} metrics created</Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="builder">Metric Builder</TabsTrigger>
          <TabsTrigger value="metrics">My Metrics ({metrics.length})</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    value={currentMetric.name}
                    onChange={(e) => setCurrentMetric({
                      ...currentMetric,
                      name: e.target.value
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="metricDescription">Description</Label>
                  <Textarea
                    id="metricDescription"
                    placeholder="Describe what this metric measures..."
                    value={currentMetric.description}
                    onChange={(e) => setCurrentMetric({
                      ...currentMetric,
                      description: e.target.value
                    })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data Source</Label>
                    <Select
                      value={currentMetric.dataSource}
                      onValueChange={(value) => setCurrentMetric({
                        ...currentMetric,
                        dataSource: value
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
                      value={currentMetric.aggregation}
                      onValueChange={(value) => setCurrentMetric({
                        ...currentMetric,
                        aggregation: value
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
                    value={currentMetric.formula}
                    onChange={(e) => setCurrentMetric({
                      ...currentMetric,
                      formula: e.target.value
                    })}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="space-y-3">
                  <Label>Formula Templates</Label>
                  <div className="space-y-2">
                    {formulaTemplates.map((template, index) => (
                      <div key={index} className="border rounded p-2 hover:bg-gray-50 cursor-pointer"
                           onClick={() => setCurrentMetric({
                             ...currentMetric,
                             name: currentMetric.name || template.name,
                             formula: template.formula,
                             description: currentMetric.description || template.description
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
                      value={currentMetric.timeframe}
                      onValueChange={(value) => setCurrentMetric({
                        ...currentMetric,
                        timeframe: value
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
                      value={currentMetric.visualization}
                      onValueChange={(value) => setCurrentMetric({
                        ...currentMetric,
                        visualization: value
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
                        value={currentMetric.threshold?.warning || ''}
                        onChange={(e) => setCurrentMetric({
                          ...currentMetric,
                          threshold: {
                            ...currentMetric.threshold!,
                            warning: parseFloat(e.target.value) || 0
                          }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-red-600">Critical Level</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={currentMetric.threshold?.critical || ''}
                        onChange={(e) => setCurrentMetric({
                          ...currentMetric,
                          threshold: {
                            ...currentMetric.threshold!,
                            critical: parseFloat(e.target.value) || 0
                          }
                        })}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="activeToggle">Active by Default</Label>
                  <Switch
                    id="activeToggle"
                    checked={currentMetric.isActive}
                    onCheckedChange={(checked) => setCurrentMetric({
                      ...currentMetric,
                      isActive: checked
                    })}
                  />
                </div>

                <div className="space-y-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowPreview(!showPreview)}
                    className="w-full"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {showPreview ? 'Hide Preview' : 'Preview Metric'}
                  </Button>

                  <AnimatePresence>
                    {showPreview && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <MockMetricPreview metric={currentMetric} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Button
                    onClick={handleSaveMetric}
                    disabled={!currentMetric.name || !currentMetric.formula}
                    className="w-full"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Metric
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          {metrics.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Custom Metrics Yet</h3>
                <p className="text-gray-600 mb-4">
                  Create your first custom metric to track KPIs specific to your business needs.
                </p>
                <Button onClick={() => setActiveTab('builder')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Metric
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {metrics.map((metric) => (
                <motion.div
                  key={metric.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  layout
                >
                  <Card className={`${!metric.isActive ? 'opacity-60' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{metric.name}</CardTitle>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {metric.description}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={metric.isActive}
                            onCheckedChange={() => handleToggleMetric(metric.id)}
                            size="sm"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteMetric(metric.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded">
                        {metric.formula}
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Source:</span>
                        <Badge variant="outline">{metric.dataSource}</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Type:</span>
                        <Badge variant="outline">{metric.visualization}</Badge>
                      </div>

                      {(metric.threshold.warning > 0 || metric.threshold.critical > 0) && (
                        <div className="flex space-x-2">
                          {metric.threshold.warning > 0 && (
                            <Badge variant="outline" className="text-yellow-600 text-xs">
                              ⚠ {metric.threshold.warning}
                            </Badge>
                          )}
                          {metric.threshold.critical > 0 && (
                            <Badge variant="outline" className="text-red-600 text-xs">
                              🚨 {metric.threshold.critical}
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4">
          <Alert>
            <TrendingUp className="h-4 w-4" />
            <AlertDescription>
              This is a preview of how your custom metrics would appear in a dashboard layout.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.filter(m => m.isActive).map((metric) => (
              <motion.div
                key={metric.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                layout
              >
                <MockMetricPreview metric={metric} />
              </motion.div>
            ))}
            
            {metrics.filter(m => m.isActive).length === 0 && (
              <div className="col-span-full text-center py-12">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Active Metrics</h3>
                <p className="text-gray-600">
                  Enable some metrics to see them in the dashboard preview.
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
