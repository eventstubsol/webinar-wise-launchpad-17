
import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { CampaignDashboard } from '@/components/campaigns/CampaignDashboard';

const Campaigns = () => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <main className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Email Campaigns</h1>
            <p className="text-gray-600">Create, manage, and analyze your email marketing campaigns.</p>
          </div>
          <CampaignDashboard />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Campaigns;
