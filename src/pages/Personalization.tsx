
import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { PersonalizationDashboard } from '@/components/personalization/PersonalizationDashboard';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

const Personalization = () => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <main className="flex-1 p-6">
          <PersonalizationDashboard />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Personalization;
