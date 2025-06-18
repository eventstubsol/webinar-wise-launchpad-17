
import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import WebinarList from '@/components/zoom/WebinarList';
import { ParticipantSyncRetryButton } from '@/components/zoom/ParticipantSyncRetryButton';

export default function Webinars() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <main className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Webinars</h1>
            <p className="text-gray-600">Manage and view your Zoom webinars.</p>
          </div>
          <ParticipantSyncRetryButton />
          <WebinarList />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
