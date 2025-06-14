
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportBuilder } from './ReportBuilder';
import { ExportQueueMonitor } from './ExportQueueMonitor';
import { AdvancedScheduleManager } from './AdvancedScheduleManager';
import { BulkExportSelector } from './bulk/BulkExportSelector';
import { FileText, Calendar, Activity, TrendingUp, Package, Users } from 'lucide-react';
import { ExportJobManager } from '@/services/export/job/ExportJobManager';
import { useToast } from '@/hooks/use-toast';

// Mock data for bulk export demo
const mockWebinars = [
  {
    id: '1',
    title: 'Q3 Product Launch Webinar',
    startTime: '2025-06-01T14:00:00Z',
    participantCount: 156,
    duration: 90,
    status: 'completed'
  },
  {
    id: '2',
    title: 'Monthly Team Update',
    startTime: '2025-06-05T10:00:00Z',
    participantCount: 45,
    duration: 30,
    status: 'completed'
  },
  {
    id: '3',
    title: 'Customer Onboarding Training',
    startTime: '2025-06-08T16:00:00Z',
    participantCount: 89,
    duration: 60,
    status: 'completed'
  },
  {
    id: '4',
    title: 'Sales Strategy Workshop',
    startTime: '2025-06-10T09:00:00Z',
    participantCount: 67,
    duration: 120,
    status: 'completed'
  }
];

export function ExportDashboard() {
  const { toast } = useToast();

  const handleBulkExport = async (selectedIds: string[], format: string, template?: string) => {
    try {
      // Create individual export jobs for each selected webinar
      const exportPromises = selectedIds.map(webinarId => 
        ExportJobManager.createExportJob(format as 'pdf' | 'excel' | 'powerpoint' | 'csv', {
          title: `Bulk Export - Webinar ${webinarId}`,
          description: `Automated bulk export using ${template || 'default'} template`,
          webinarIds: [webinarId],
          templateId: template
        })
      );

      await Promise.all(exportPromises);
      
      toast({
        title: "Bulk Export Started",
        description: `Successfully queued ${selectedIds.length} export jobs. You'll be notified when they're ready.`
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to start bulk export. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-gray-600">Reports Generated</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">3</p>
                <p className="text-sm text-gray-600">Scheduled Reports</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">2</p>
                <p className="text-sm text-gray-600">Processing</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">847</p>
                <p className="text-sm text-gray-600">Total Downloads</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="builder" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="builder">Report Builder</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Export</TabsTrigger>
          <TabsTrigger value="queue">Export Queue</TabsTrigger>
          <TabsTrigger value="schedule">Advanced Scheduling</TabsTrigger>
        </TabsList>

        <TabsContent value="builder">
          <ReportBuilder />
        </TabsContent>

        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Bulk Export Manager
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BulkExportSelector 
                webinars={mockWebinars}
                onExport={handleBulkExport}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue">
          <ExportQueueMonitor />
        </TabsContent>

        <TabsContent value="schedule">
          <AdvancedScheduleManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
