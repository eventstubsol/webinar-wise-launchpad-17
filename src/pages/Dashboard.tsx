
import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { MetricsCards } from '@/components/dashboard/MetricsCards';
import { ChartsSection } from '@/components/dashboard/ChartsSection';
import { DataTables } from '@/components/dashboard/DataTables';
import { ZoomConnectionCard } from '@/components/dashboard/ZoomConnectionCard';
import { ZoomConnectionPlaceholder } from '@/components/dashboard/ZoomConnectionPlaceholder';
import { useWebinarMetrics } from '@/hooks/useWebinarMetrics';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { TokenStatus } from '@/services/zoom/utils/tokenUtils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export default function Dashboard() {
  const { metrics, loading } = useWebinarMetrics();
  const { tokenStatus, isLoading: connectionLoading } = useZoomConnection();
  
  const isZoomConnected = tokenStatus === TokenStatus.VALID;
  const showConnectionPrompt = !connectionLoading && !isZoomConnected;
  const showConnectionCard = !loading && (!metrics || metrics.isEmpty) || showConnectionPrompt;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <main className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">
              {showConnectionPrompt 
                ? "Connect your Zoom account to unlock powerful webinar analytics and insights"
                : isZoomConnected
                ? "Welcome back! Here's an overview of your webinars"
                : "Get started by connecting your Zoom account and syncing your webinar data"
              }
            </p>
          </div>
          
          {/* Show illustrated placeholder when no Zoom connection */}
          {showConnectionPrompt && (
            <div className="flex justify-center">
              <ZoomConnectionPlaceholder />
            </div>
          )}
          
          {/* Show connection card when no data but user might be connected */}
          {!showConnectionPrompt && showConnectionCard && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ZoomConnectionCard />
            </div>
          )}
          
          {/* Only show metrics and data when Zoom is connected */}
          {isZoomConnected && (
            <>
              {/* Metrics Cards Section */}
              <MetricsCards />
              
              {/* Charts Section - only shows when we have data */}
              <ChartsSection />
              
              {/* Data Tables Section - only shows when we have data */}
              {metrics && !metrics.isEmpty && <DataTables />}
            </>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
