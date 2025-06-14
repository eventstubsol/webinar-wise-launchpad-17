
import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { PredictiveInsightsDashboard } from '@/components/analytics/PredictiveInsightsDashboard';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

const PredictiveAnalytics = () => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <main className="flex-1 p-6">
          <PredictiveInsightsDashboard />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default PredictiveAnalytics;
