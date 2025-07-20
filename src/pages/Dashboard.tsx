
import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { MetricsCards } from '@/components/dashboard/MetricsCards';
import { ChartsSection } from '@/components/dashboard/ChartsSection';
import { DataTables } from '@/components/dashboard/DataTables';
import { ZoomConnectionCard } from '@/components/dashboard/ZoomConnectionCard';
import { useWebinarMetrics } from '@/hooks/useWebinarMetrics';

export default function Dashboard() {
  const { metrics, loading } = useWebinarMetrics();
  
  // Show connection card prominently when no data
  const showConnectionCard = !loading && (!metrics || metrics.isEmpty);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <main className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">
              {showConnectionCard 
                ? "Get started by connecting your Zoom account and syncing your webinar data"
                : "Welcome back! Here's an overview of your webinars"
              }
            </p>
          </div>
          
          {/* Show connection card prominently when no data */}
          {showConnectionCard && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ZoomConnectionCard />
            </div>
          )}
          
          {/* Metrics Cards Section */}
          <MetricsCards />
          
          {/* Charts Section - only shows when we have data */}
          <ChartsSection />
          
          {/* Data Tables Section - only shows when we have data */}
          {metrics && !metrics.isEmpty && <DataTables />}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
