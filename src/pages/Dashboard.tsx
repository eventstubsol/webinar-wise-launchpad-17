
import React, { useEffect } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { MetricsCards } from '@/components/dashboard/MetricsCards';
import { ChartsSection } from '@/components/dashboard/ChartsSection';
import { DataTables } from '@/components/dashboard/DataTables';
import { AIAnalyticsSection } from '@/components/dashboard/AIAnalyticsSection';
import { RealtimeAnalyticsIndicator } from '@/components/dashboard/RealtimeAnalyticsIndicator';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { useWebinars } from '@/hooks/useWebinars';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { refetch: refetchWebinars } = useWebinars({
    filters: { search: '', status: '' },
    page: 1,
    limit: 10
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  const handleProfileSetup = () => {
    navigate('/settings');
  };

  // Set up real-time updates
  useRealtimeUpdates({
    onWebinarUpdate: (webinar) => {
      // Refresh webinar data when updates come in
      refetchWebinars();
      console.log('Webinar updated via webhook:', webinar.topic);
    },
    onSyncUpdate: (syncLog) => {
      // Refresh data when sync operations complete
      if (syncLog.sync_status === 'completed') {
        refetchWebinars();
      }
      console.log('Sync update:', syncLog.sync_type, syncLog.sync_status);
    }
  });

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar 
          onProfileSetup={handleProfileSetup}
          onSignOut={handleSignOut}
        />
        <SidebarInset>
          <DashboardHeader />
          <main className="flex-1 space-y-6 p-8 pt-6">
            {/* Real-time Analytics Indicator */}
            <RealtimeAnalyticsIndicator />
            
            <MetricsCards />
            <AIAnalyticsSection />
            <ChartsSection />
            <DataTables />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
