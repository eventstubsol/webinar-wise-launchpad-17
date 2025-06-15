
import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { CRMConnectionManager } from '@/components/crm/CRMConnectionManager';

export default function Integrations() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">CRM Integrations</h1>
            <p className="text-gray-600">Connect and sync your webinar data with your CRM systems</p>
          </div>
          <CRMConnectionManager />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
