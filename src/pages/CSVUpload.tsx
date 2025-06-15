
import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { CSVUploadWizard } from '@/components/csv/CSVUploadWizard';

export default function CSVUpload() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <main className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Import Data</h1>
            <p className="text-gray-600">Upload CSV files to import your webinar or participant data.</p>
          </div>
          <div className="bg-card p-6 rounded-lg border">
            <CSVUploadWizard />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
