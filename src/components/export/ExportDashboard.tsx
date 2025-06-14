
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportBuilder } from './ReportBuilder';
import { ExportQueueMonitor } from './ExportQueueMonitor';
import { ScheduleManager } from './ScheduleManager';
import { FileText, Calendar, Activity, TrendingUp } from 'lucide-react';

export function ExportDashboard() {
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="builder">Report Builder</TabsTrigger>
          <TabsTrigger value="queue">Export Queue</TabsTrigger>
          <TabsTrigger value="schedule">Schedule Manager</TabsTrigger>
        </TabsList>

        <TabsContent value="builder">
          <ReportBuilder />
        </TabsContent>

        <TabsContent value="queue">
          <ExportQueueMonitor />
        </TabsContent>

        <TabsContent value="schedule">
          <ScheduleManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
