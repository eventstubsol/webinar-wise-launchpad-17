
import React, { useEffect } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { MetricsCards } from '@/components/dashboard/MetricsCards';
import { ChartsSection } from '@/components/dashboard/ChartsSection';
import { DataTables } from '@/components/dashboard/DataTables';

const Dashboard = () => {
  // Get saved sidebar state from localStorage, default to open
  const getSavedSidebarState = () => {
    const saved = localStorage.getItem('sidebar:state');
    return saved === 'false' ? false : true; // Default to open (true)
  };

  const defaultOpen = getSavedSidebarState();

  const handleOpenChange = (open: boolean) => {
    localStorage.setItem('sidebar:state', open.toString());
  };

  return (
    <SidebarProvider defaultOpen={defaultOpen} onOpenChange={handleOpenChange}>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar />
        <SidebarInset>
          <DashboardHeader />
          <main className="flex-1 p-6 space-y-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Analytics Overview
                </h2>
                <MetricsCards />
              </div>

              <ChartsSection />

              <DataTables />
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
