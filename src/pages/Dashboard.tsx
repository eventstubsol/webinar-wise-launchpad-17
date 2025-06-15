
import React from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { WebinarMetricsCards } from "@/components/dashboard/WebinarMetricsCards";
import { WebinarChartsSection } from "@/components/dashboard/WebinarChartsSection";
import { WebinarDataTables } from "@/components/dashboard/WebinarDataTables";
import { ZoomConnectionCard } from "@/components/dashboard/ZoomConnectionCard";
import { QuickActionsCard } from "@/components/dashboard/QuickActionsCard";
import { useZoomConnection } from "@/hooks/useZoomConnection";

export default function Dashboard() {
  const { connection, isLoading, isConnected } = useZoomConnection();
  const hasZoomConnection = !isLoading && isConnected;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <div className="p-6 space-y-6">
          {/* Connection Status & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ZoomConnectionCard />
            </div>
            <div>
              <QuickActionsCard />
            </div>
          </div>

          {hasZoomConnection ? (
            <>
              {/* Webinar Metrics */}
              <WebinarMetricsCards />
              
              {/* Analytics Charts */}
              <WebinarChartsSection />
              
              {/* Data Tables */}
              <WebinarDataTables />
            </>
          ) : (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Your Zoom Account</h3>
                <p className="text-gray-600 mb-6">
                  Connect your Zoom account to start analyzing your webinar data and unlock powerful insights.
                </p>
              </div>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
