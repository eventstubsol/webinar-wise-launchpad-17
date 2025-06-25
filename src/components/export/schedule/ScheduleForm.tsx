
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ScheduledReportForm {
  reportName: string;
  reportType: 'pdf' | 'excel' | 'powerpoint' | 'multi';
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  recipients: string;
  customSchedule: string;
  isActive: boolean;
}

interface ScheduleFormProps {
  form: ScheduledReportForm;
  setForm: React.Dispatch<React.SetStateAction<ScheduledReportForm>>;
  isEditing: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function ScheduleForm({ form, setForm, isEditing, onSubmit, onCancel }: ScheduleFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {isEditing ? 'Edit Scheduled Report' : 'Create Scheduled Report'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
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
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
