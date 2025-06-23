
import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { SidebarTrigger } from '@/components/ui/sidebar';
import WebinarDetailView from '@/components/zoom/webinar/WebinarDetailView';
import { Video } from 'lucide-react';

const WebinarDetailHeader = () => {
  return (
    <header className="border-b border-border bg-background sticky top-0 z-10">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <SidebarTrigger />
          <div className="flex items-center space-x-2">
            <Video className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-xl font-semibold text-foreground">Webinar Details</h1>
          </div>
        </div>
      </div>
    </header>
  );
};

export default function WebinarDetail() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <WebinarDetailHeader />
        <main className="p-6">
          <WebinarDetailView />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
