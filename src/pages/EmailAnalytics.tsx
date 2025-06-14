
import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { EmailAnalyticsDashboard } from '@/components/analytics/EmailAnalyticsDashboard';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

const EmailAnalytics = () => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <main className="flex-1 p-6">
          <EmailAnalyticsDashboard />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default EmailAnalytics;
