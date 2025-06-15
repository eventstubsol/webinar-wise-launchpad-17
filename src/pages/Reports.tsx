
import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, BarChart3, Users, Calendar } from 'lucide-react';

export default function Reports() {
  const reportTypes = [
    {
      title: 'Webinar Performance Report',
      description: 'Comprehensive analysis of all webinar metrics',
      icon: BarChart3,
      formats: ['PDF', 'Excel'],
      color: 'text-blue-600'
    },
    {
      title: 'Participant Data Export',
      description: 'Complete participant information and engagement data',
      icon: Users,
      formats: ['CSV', 'Excel'],
      color: 'text-green-600'
    },
    {
      title: 'Monthly Analytics Report',
      description: 'Monthly summary of webinar performance and trends',
      icon: Calendar,
      formats: ['PDF', 'PowerPoint'],
      color: 'text-purple-600'
    },
    {
      title: 'Custom Report Builder',
      description: 'Create custom reports with specific metrics and filters',
      icon: FileText,
      formats: ['PDF', 'Excel', 'CSV'],
      color: 'text-orange-600'
    }
  ];

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Reports & Export</h1>
            <p className="text-gray-600">Generate and download comprehensive reports of your webinar data</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reportTypes.map((report, index) => {
              const Icon = report.icon;
              return (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Icon className={`w-6 h-6 ${report.color}`} />
                      {report.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">{report.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        {report.formats.map((format) => (
                          <span key={format} className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {format}
                          </span>
                        ))}
                      </div>
                      <Button size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Generate
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
