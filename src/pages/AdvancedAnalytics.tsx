
import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { AdvancedAnalyticsDashboard } from '@/components/ai-analytics/AdvancedAnalyticsDashboard';

const AdvancedAnalytics: React.FC = () => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <main className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Advanced Analytics</h1>
            <p className="text-gray-600">Dive deep into your webinar data with advanced analytics and visualizations.</p>
          </div>
          <AdvancedAnalyticsDashboard />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AdvancedAnalytics;
