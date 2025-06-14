
import React from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MetricsCards } from "@/components/dashboard/MetricsCards";
import { ChartsSection } from "@/components/dashboard/ChartsSection";
import { DataTables } from "@/components/dashboard/DataTables";
import { CSVUploadSection } from "@/components/dashboard/CSVUploadSection";
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
          {hasZoomConnection ? (
            <>
              <MetricsCards />
              <ChartsSection />
              <DataTables />
            </>
          ) : (
            <CSVUploadSection />
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
