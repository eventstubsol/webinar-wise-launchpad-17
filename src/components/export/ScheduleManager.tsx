
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Calendar, Clock, Users, Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ScheduledReportForm {
  reportName: string;
  reportType: 'pdf' | 'excel' | 'powerpoint' | 'multi';
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  recipients: string;
  customSchedule: string;
  isActive: boolean;
}

export function ScheduleManager() {
  const [form, setForm] = useState<ScheduledReportForm>({
    reportName: '',
    reportType: 'pdf',
    frequency: 'weekly',
    recipients: '',
    customSchedule: '',
    isActive: true
  });
  const [scheduledReports, setScheduledReports] = useState([
    {
      id: '1',
      reportName: 'Weekly Analytics Summary',
      reportType: 'pdf',
      frequency: 'weekly',
      recipients: ['john@example.com', 'sarah@example.com'],
      nextSend: '2025-06-21T09:00:00Z',
      isActive: true
    },
    {
      id: '2', 
      reportName: 'Monthly Performance Report',
      reportType: 'multi',
      frequency: 'monthly',
      recipients: ['exec@example.com'],
      nextSend: '2025-07-01T08:00:00Z',
      isActive: true
    }
  ]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.reportName.trim() || !form.recipients.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // In a real implementation, this would save to the database
    const newReport = {
      id: Date.now().toString(),
      reportName: form.reportName,
      reportType: form.reportType,
      frequency: form.frequency,
      recipients: form.recipients.split(',').map(email => email.trim()),
      nextSend: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: form.isActive
    };

    if (isEditing) {
      setScheduledReports(prev => 
        prev.map(report => report.id === isEditing ? { ...newReport, id: isEditing } : report)
      );
      setIsEditing(null);
    } else {
      setScheduledReports(prev => [...prev, newReport]);
    }

    // Reset form
    setForm({
      reportName: '',
      reportType: 'pdf',
      frequency: 'weekly',
      recipients: '',
      customSchedule: '',
      isActive: true
    });

    toast({
      title: "Success",
      description: isEditing ? "Scheduled report updated" : "Scheduled report created"
    });
  };

  const handleEdit = (report: any) => {
    setForm({
      reportName: report.reportName,
      reportType: report.reportType,
      frequency: report.frequency,
      recipients: report.recipients.join(', '),
      customSchedule: '',
      isActive: report.isActive
    });
    setIsEditing(report.id);
  };

  const handleDelete = (id: string) => {
    setScheduledReports(prev => prev.filter(report => report.id !== id));
    toast({
      title: "Success",
      description: "Scheduled report deleted"
    });
  };

  const getFrequencyBadge = (frequency: string) => {
    const colors = {
      daily: 'bg-blue-100 text-blue-800',
      weekly: 'bg-green-100 text-green-800',
      monthly: 'bg-purple-100 text-purple-800',
      custom: 'bg-orange-100 text-orange-800'
    };
    
    return (
      <Badge className={colors[frequency as keyof typeof colors]}>
        {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
      </Badge>
    );
  };

  const formatNextSend = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {isEditing ? 'Edit Scheduled Report' : 'Create Scheduled Report'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reportName">Report Name *</Label>
                <Input
                  id="reportName"
                  value={form.reportName}
                  onChange={(e) => setForm(prev => ({ ...prev, reportName: e.target.value }))}
                  placeholder="Weekly Analytics Summary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reportType">Report Type</Label>
                <Select value={form.reportType} onValueChange={(value: any) => setForm(prev => ({ ...prev, reportType: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF Report</SelectItem>
                    <SelectItem value="excel">Excel Export</SelectItem>
                    <SelectItem value="powerpoint">PowerPoint</SelectItem>
                    <SelectItem value="multi">All Formats</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Select value={form.frequency} onValueChange={(value: any) => setForm(prev => ({ ...prev, frequency: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.frequency === 'custom' && (
                <div className="space-y-2">
                  <Label htmlFor="customSchedule">Custom Schedule (Cron)</Label>
                  <Input
                    id="customSchedule"
                    value={form.customSchedule}
                    onChange={(e) => setForm(prev => ({ ...prev, customSchedule: e.target.value }))}
                    placeholder="0 9 * * MON"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipients">Recipients (comma-separated) *</Label>
              <Textarea
                id="recipients"
                value={form.recipients}
                onChange={(e) => setForm(prev => ({ ...prev, recipients: e.target.value }))}
                placeholder="john@example.com, sarah@example.com, exec@example.com"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(checked) => setForm(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {isEditing ? 'Update Schedule' : 'Create Schedule'}
              </Button>
              {isEditing && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsEditing(null);
                    setForm({
                      reportName: '',
                      reportType: 'pdf',
                      frequency: 'weekly',
                      recipients: '',
                      customSchedule: '',
                      isActive: true
                    });
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scheduled Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {scheduledReports.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No scheduled reports yet. Create one above to get started!
            </div>
          ) : (
            <div className="space-y-4">
              {scheduledReports.map((report) => (
                <div key={report.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{report.reportName}</h4>
                        {getFrequencyBadge(report.frequency)}
                        <Badge variant={report.isActive ? 'default' : 'secondary'}>
                          {report.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Next send: {formatNextSend(report.nextSend)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {report.recipients.length} recipient(s)
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(report)}
                        className="flex items-center gap-1"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(report.id)}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
