
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Target } from 'lucide-react';
import { CustomMetric } from '../../types/ai-analytics';
import { MetricConfigurationForm } from './custom-metrics/MetricConfigurationForm';
import { DisplayAlertsForm } from './custom-metrics/DisplayAlertsForm';
import { MetricPreview } from './custom-metrics/MetricPreview';
import { MetricCard } from './custom-metrics/MetricCard';
import { EmptyMetricsState } from './custom-metrics/EmptyMetricsState';

export const CustomMetricsBuilder: React.FC = () => {
  const [activeTab, setActiveTab] = useState('builder');
  const [metrics, setMetrics] = useState<CustomMetric[]>([]);
  const [currentMetric, setCurrentMetric] = useState<Partial<CustomMetric>>({
    metric_name: '',
    metric_description: '',
    calculation_formula: '',
    data_type: 'number',
    aggregation_method: 'sum',
    time_period_days: 7,
    warning_threshold: undefined,
    critical_threshold: undefined,
    chart_type: 'line',
    display_format: 'number',
    color_scheme: 'blue',
    is_active: true,
    is_public: false,
    dashboard_order: 0
  });
  const [showPreview, setShowPreview] = useState(false);

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
    if (!currentMetric.metric_name || !currentMetric.calculation_formula) {
      return;
    }

    const newMetric: CustomMetric = {
      id: Date.now().toString(),
      user_id: 'current-user',
      metric_name: currentMetric.metric_name!,
      metric_description: currentMetric.metric_description || '',
      calculation_formula: currentMetric.calculation_formula!,
      data_type: currentMetric.data_type!,
      aggregation_method: currentMetric.aggregation_method!,
      time_period_days: currentMetric.time_period_days!,
      warning_threshold: currentMetric.warning_threshold,
      critical_threshold: currentMetric.critical_threshold,
      chart_type: currentMetric.chart_type!,
      display_format: currentMetric.display_format!,
      color_scheme: currentMetric.color_scheme!,
      is_active: currentMetric.is_active!,
      is_public: currentMetric.is_public!,
      dashboard_order: currentMetric.dashboard_order!,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setMetrics([...metrics, newMetric]);
    setCurrentMetric({
      metric_name: '',
      metric_description: '',
      calculation_formula: '',
      data_type: 'number',
      aggregation_method: 'sum',
      time_period_days: 7,
      warning_threshold: undefined,
      critical_threshold: undefined,
      chart_type: 'line',
      display_format: 'number',
      color_scheme: 'blue',
      is_active: true,
      is_public: false,
      dashboard_order: 0
    });
  };

  const handleDeleteMetric = (id: string) => {
    setMetrics(metrics.filter(m => m.id !== id));
  };

  const handleToggleMetric = (id: string) => {
    setMetrics(metrics.map(m => 
      m.id === id ? { ...m, is_active: !m.is_active } : m
    ));
  };

  const handleUpdateMetric = (updates: Partial<CustomMetric>) => {
    setCurrentMetric({ ...currentMetric, ...updates });
  };

  const canSave = !!(currentMetric.metric_name && currentMetric.calculation_formula);

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
            <MetricConfigurationForm
              currentMetric={currentMetric}
              onUpdateMetric={handleUpdateMetric}
              formulaTemplates={formulaTemplates}
            />

            <div className="space-y-4">
              <DisplayAlertsForm
                currentMetric={currentMetric}
                onUpdateMetric={handleUpdateMetric}
                onPreview={() => setShowPreview(!showPreview)}
                onSave={handleSaveMetric}
                showPreview={showPreview}
                canSave={canSave}
              />

              <AnimatePresence>
                {showPreview && (
                  <MetricPreview metric={currentMetric} />
                )}
              </AnimatePresence>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          {metrics.length === 0 ? (
            <EmptyMetricsState onCreateFirst={() => setActiveTab('builder')} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {metrics.map((metric) => (
                <MetricCard
                  key={metric.id}
                  metric={metric}
                  onToggle={handleToggleMetric}
                  onDelete={handleDeleteMetric}
                />
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
            {metrics.filter(m => m.is_active).map((metric) => (
              <motion.div
                key={metric.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                layout
              >
                <MetricPreview metric={metric} />
              </motion.div>
            ))}
            
            {metrics.filter(m => m.is_active).length === 0 && (
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
