
import React, { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { ScheduleForm } from './schedule/ScheduleForm';
import { ScheduleList } from './schedule/ScheduleList';

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

  const handleCancel = () => {
    setIsEditing(null);
    setForm({
      reportName: '',
      reportType: 'pdf',
      frequency: 'weekly',
      recipients: '',
      customSchedule: '',
      isActive: true
    });
  };

  return (
    <div className="space-y-6">
      <ScheduleForm
        form={form}
        setForm={setForm}
        isEditing={isEditing}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
      
      <ScheduleList
        scheduledReports={scheduledReports}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
