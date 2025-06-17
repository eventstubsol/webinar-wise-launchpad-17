
import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ZoomSyncDiagnostics } from '@/components/zoom/ZoomSyncDiagnostics';

const ZoomDiagnostics = () => {
  const navigate = useNavigate();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex-1 p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/settings')}
                variant="outline"
                size="sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Settings
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Activity className="h-6 w-6" />
                  Zoom Sync Diagnostics
                </h1>
                <p className="text-muted-foreground mt-1">
                  Analyze your Zoom integration health and identify sync issues
                </p>
              </div>
            </div>

            <ZoomSyncDiagnostics />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default ZoomDiagnostics;
