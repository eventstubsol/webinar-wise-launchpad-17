import React, { useState, useEffect } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { MetricsCards } from '@/components/dashboard/MetricsCards';
import { ChartsSection } from '@/components/dashboard/ChartsSection';
import { DataTables } from '@/components/dashboard/DataTables';
import { ZoomConnectionPlaceholder } from '@/components/dashboard/ZoomConnectionPlaceholder';
import { FirstTimeSyncOnboarding } from '@/components/dashboard/onboarding/FirstTimeSyncOnboarding';
import { useUserSyncStatus } from '@/hooks/useUserSyncStatus';
import { useDashboardRefresh } from '@/hooks/useDashboardRefresh';

export default function Dashboard() {
  const { userStatus, isLoading, metrics } = useUserSyncStatus();
  const { refreshDashboardData } = useDashboardRefresh();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Listen for dashboard refresh events
  useEffect(() => {
    const handleDashboardRefresh = async () => {
      setIsRefreshing(true);
      try {
        await refreshDashboardData();
      } catch (error) {
        console.error('Dashboard refresh failed:', error);
      } finally {
        // Keep loading state for a brief moment to show user something happened
        setTimeout(() => setIsRefreshing(false), 1000);
      }
    };

    // You can trigger this from anywhere in the app if needed
    window.addEventListener('dashboard-refresh', handleDashboardRefresh);
    
    return () => {
      window.removeEventListener('dashboard-refresh', handleDashboardRefresh);
    };
  }, [refreshDashboardData]);

  const renderDashboardContent = () => {
    if (isLoading || isRefreshing) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            {isRefreshing && (
              <p className="text-sm text-gray-600">Updating dashboard data...</p>
            )}
          </div>
        </div>
      );
    }

    switch (userStatus) {
      case 'no_connection':
        return (
          <div className="flex justify-center">
            <ZoomConnectionPlaceholder />
          </div>
        );

      case 'first_time':
        return <FirstTimeSyncOnboarding />;

      case 'returning':
        return (
          <>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">
                Welcome back! Here's an overview of your webinars
              </p>
            </div>
            
            {/* Metrics Cards Section */}
            <MetricsCards />
            
            {/* Charts Section */}
            <ChartsSection />
            
            {/* Data Tables Section - only shows when we have data */}
            {metrics && !metrics.isEmpty && <DataTables />}
          </>
        );

      default:
        return (
          <div className="flex justify-center">
            <ZoomConnectionPlaceholder />
          </div>
        );
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <main className="p-6 space-y-6">
          {renderDashboardContent()}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
