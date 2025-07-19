
import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { BehavioralSegmentBuilder } from '@/components/segmentation/BehavioralSegmentBuilder';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

const Segmentation = () => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <main className="flex-1 p-6">
          <BehavioralSegmentBuilder />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Segmentation;
