import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Users, Plus, Edit, Trash2, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CronExpressionBuilder } from './scheduling/CronExpressionBuilder';
import { TimezoneSelector } from './scheduling/TimezoneSelector';
import { ExportTemplateManager } from './templates/ExportTemplateManager';

interface ConditionalTrigger {
  id: string;
  name: string;
  condition: string;
  value: string;
  enabled: boolean;
}

interface AdvancedScheduledReport {
  id: string;
  reportName: string;
  reportType: 'pdf' | 'excel' | 'powerpoint' | 'multi';
  cronExpression: string;
  timezone: string;
  recipients: string[];
  templateId?: string;
  conditionalTriggers: ConditionalTrigger[];
  isActive: boolean;
  nextSend: string;
  lastSent?: string;
  sendHistory: { date: string; status: string; recipients: number }[];
}

export function AdvancedScheduleManager() {
  const [reports, setReports] = useState<AdvancedScheduledReport[]>([
    {
      id: '1',
      reportName: 'Weekly Analytics Summary',
      reportType: 'pdf',
      cronExpression: '0 9 * * 1',
      timezone: 'America/New_York',
      recipients: ['john@example.com', 'sarah@example.com'],
      templateId: 'template-1',
      conditionalTriggers: [
        { id: '1', name: 'Minimum Webinars', condition: 'webinar_count', value: '3', enabled: true }
      ],
      isActive: true,
      nextSend: '2025-06-21T09:00:00Z',
      lastSent: '2025-06-14T09:00:00Z',
      sendHistory: [
        { date: '2025-06-14', status: 'sent', recipients: 2 },
        { date: '2025-06-07', status: 'sent', recipients: 2 },
        { date: '2025-05-31', status: 'failed', recipients: 0 }
      ]
    }
  ]);
  
  const [selectedReport, setSelectedReport] = useState<AdvancedScheduledReport | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('schedule');
  const [editForm, setEditForm] = useState({
    reportName: '',
    reportType: 'pdf' as 'pdf' | 'excel' | 'powerpoint' | 'multi',
    cronExpression: '0 9 * * *',
    timezone: 'UTC',
    recipients: '',
    templateId: '',
    conditionalTriggers: [] as ConditionalTrigger[],
    isActive: true
  });
  const { toast } = useToast();

  const conditionTypes = [
    { value: 'webinar_count', label: 'Minimum Webinars', description: 'Only send if X webinars occurred' },
    { value: 'participant_count', label: 'Minimum Participants', description: 'Only send if X participants attended' },
    { value: 'engagement_rate', label: 'Minimum Engagement', description: 'Only send if engagement rate > X%' },
    { value: 'day_of_month', label: 'Specific Day', description: 'Only send on specific days of month' }
  ];

  const handleCreateReport = () => {
    setSelectedReport(null);
    setEditForm({
      reportName: '',
      reportType: 'pdf',
      cronExpression: '0 9 * * *',
      timezone: 'UTC',
      recipients: '',
      templateId: '',
      conditionalTriggers: [],
      isActive: true
    });
    setIsEditing(true);
  };

  const handleEditReport = (report: AdvancedScheduledReport) => {
    setSelectedReport(report);
    setEditForm({
      reportName: report.reportName,
      reportType: report.reportType,
      cronExpression: report.cronExpression,
      timezone: report.timezone,
      recipients: report.recipients.join(', '),
      templateId: report.templateId || '',
      conditionalTriggers: [...report.conditionalTriggers],
      isActive: report.isActive
    });
    setIsEditing(true);
  };

  const handleSaveReport = () => {
    if (!editForm.reportName.trim() || !editForm.recipients.trim()) {
      toast({
        title: "Validation Error",
        description: "Report name and recipients are required",
        variant: "destructive"
      });
      return;
    }

    const reportData = {
      ...editForm,
      recipients: editForm.recipients.split(',').map(email => email.trim()),
      nextSend: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      sendHistory: selectedReport?.sendHistory || []
    };

    if (selectedReport) {
      setReports(prev => prev.map(r => 
        r.id === selectedReport.id ? { ...r, ...reportData } : r
      ));
      toast({
        title: "Success",
        description: "Scheduled report updated successfully"
      });
    } else {
      const newReport: AdvancedScheduledReport = {
        id: Date.now().toString(),
        ...reportData,
        sendHistory: []
      };
      setReports(prev => [...prev, newReport]);
      toast({
        title: "Success",
        description: "Scheduled report created successfully"
      });
    }

    setIsEditing(false);
    setSelectedReport(null);
  };

  const handleDeleteReport = (reportId: string) => {
    setReports(prev => prev.filter(r => r.id !== reportId));
    toast({
      title: "Success",
      description: "Scheduled report deleted successfully"
    });
  };

  const addConditionalTrigger = () => {
    const newTrigger: ConditionalTrigger = {
      id: Date.now().toString(),
      name: '',
      condition: 'webinar_count',
      value: '',
      enabled: true
    };
    setEditForm(prev => ({
      ...prev,
      conditionalTriggers: [...prev.conditionalTriggers, newTrigger]
    }));
  };

  const updateConditionalTrigger = (id: string, field: keyof ConditionalTrigger, value: any) => {
    setEditForm(prev => ({
      ...prev,
      conditionalTriggers: prev.conditionalTriggers.map(trigger =>
        trigger.id === id ? { ...trigger, [field]: value } : trigger
      )
    }));
  };

  const removeConditionalTrigger = (id: string) => {
    setEditForm(prev => ({
      ...prev,
      conditionalTriggers: prev.conditionalTriggers.filter(trigger => trigger.id !== id)
    }));
  };

  const formatNextSend = (dateString: string, timezone: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      timeZone: timezone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="schedule">Scheduled Reports</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Advanced Scheduling</h3>
            <Button onClick={handleCreateReport} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Schedule
            </Button>
          </div>

          {isEditing ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedReport ? 'Edit Scheduled Report' : 'Create Scheduled Report'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="basic" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                    <TabsTrigger value="schedule">Schedule</TabsTrigger>
                    <TabsTrigger value="conditions">Conditions</TabsTrigger>
                    <TabsTrigger value="recipients">Recipients</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Report Name</Label>
                        <Input
                          value={editForm.reportName}
                          onChange={(e) => setEditForm(prev => ({ ...prev, reportName: e.target.value }))}
                          placeholder="Weekly Analytics Summary"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Report Type</Label>
                        <select
                          value={editForm.reportType}
                          onChange={(e) => setEditForm(prev => ({ ...prev, reportType: e.target.value as 'pdf' | 'excel' | 'powerpoint' | 'multi' }))}
                          className="w-full px-3 py-2 border rounded-md"
                        >
                          <option value="pdf">PDF Report</option>
                          <option value="excel">Excel Export</option>
                          <option value="powerpoint">PowerPoint</option>
                          <option value="multi">All Formats</option>
                        </select>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="schedule" className="space-y-4">
                    <CronExpressionBuilder
                      value={editForm.cronExpression}
                      onChange={(cronExpression) => setEditForm(prev => ({ ...prev, cronExpression }))}
                      timezone={editForm.timezone}
                    />
                    <TimezoneSelector
                      value={editForm.timezone}
                      onChange={(timezone) => setEditForm(prev => ({ ...prev, timezone }))}
                    />
                  </TabsContent>

                  <TabsContent value="conditions" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Conditional Triggers</Label>
                      <Button variant="outline" size="sm" onClick={addConditionalTrigger}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Condition
                      </Button>
                    </div>
                    
                    {editForm.conditionalTriggers.map(trigger => (
                      <div key={trigger.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <Switch
                            checked={trigger.enabled}
                            onCheckedChange={(enabled) => updateConditionalTrigger(trigger.id, 'enabled', enabled)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeConditionalTrigger(trigger.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Condition</Label>
                            <select
                              value={trigger.condition}
                              onChange={(e) => updateConditionalTrigger(trigger.id, 'condition', e.target.value)}
                              className="w-full px-3 py-2 border rounded-md"
                            >
                              {conditionTypes.map(type => (
                                <option key={type.value} value={type.value}>
                                  {type.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Value</Label>
                            <Input
                              value={trigger.value}
                              onChange={(e) => updateConditionalTrigger(trigger.id, 'value', e.target.value)}
                              placeholder="Enter value"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="recipients" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Recipients (comma-separated)</Label>
                      <Textarea
                        value={editForm.recipients}
                        onChange={(e) => setEditForm(prev => ({ ...prev, recipients: e.target.value }))}
                        placeholder="john@example.com, sarah@example.com, exec@example.com"
                        rows={4}
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={editForm.isActive}
                        onCheckedChange={(isActive) => setEditForm(prev => ({ ...prev, isActive }))}
                      />
                      <Label>Active</Label>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex gap-2 pt-4 border-t">
                  <Button onClick={handleSaveReport}>
                    {selectedReport ? 'Update Schedule' : 'Create Schedule'}
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reports.map(report => (
                <Card key={report.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{report.reportName}</h4>
                          <Badge variant={report.isActive ? 'default' : 'secondary'}>
                            {report.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          {report.conditionalTriggers.length > 0 && (
                            <Badge variant="outline">
                              {report.conditionalTriggers.length} condition(s)
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatNextSend(report.nextSend, report.timezone)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {report.recipients.length} recipient(s)
                          </div>
                          <div className="flex items-center gap-1">
                            <Settings className="h-4 w-4" />
                            {report.timezone}
                          </div>
                          <div>
                            <Badge variant="secondary" className="text-xs">
                              {report.cronExpression}
                            </Badge>
                          </div>
                        </div>
                        
                        {report.sendHistory.length > 0 && (
                          <div className="text-xs text-gray-500">
                            Last sent: {report.lastSent ? new Date(report.lastSent).toLocaleDateString() : 'Never'}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditReport(report)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteReport(report.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates">
          <ExportTemplateManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
