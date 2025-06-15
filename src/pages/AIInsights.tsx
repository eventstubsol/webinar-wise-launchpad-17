
import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { AIInsightsDashboard } from '@/components/ai-analytics/AIInsightsDashboard';

export default function AIInsights() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">AI Insights</h1>
            <p className="text-gray-600">AI-powered analysis and insights for your webinar data</p>
          </div>
          <AIInsightsDashboard />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
