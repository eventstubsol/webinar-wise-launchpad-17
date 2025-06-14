
import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { CSVUploadWizard } from '@/components/csv/CSVUploadWizard';

export default function CSVUpload() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-gray-50 py-8">
          <CSVUploadWizard />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
