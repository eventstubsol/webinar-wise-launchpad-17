
import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ZoomConnectionCard } from '@/components/dashboard/ZoomConnectionCard';
import { ZoomSyncCard } from '@/components/dashboard/ZoomSyncCard';

export default function Dashboard() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <main className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Welcome to your webinar analytics dashboard.</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ZoomConnectionCard />
            <ZoomSyncCard />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
