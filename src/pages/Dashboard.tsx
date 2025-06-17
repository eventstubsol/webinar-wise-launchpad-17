
import { PageLayout } from '@/components/layout/PageLayout';
import { ZoomConnectionCard } from '@/components/dashboard/ZoomConnectionCard';
import { ZoomSyncCard } from '@/components/dashboard/ZoomSyncCard';
import { QuickActionsCard } from '@/components/dashboard/QuickActionsCard';
import { WebinarMetricsCards } from '@/components/dashboard/WebinarMetricsCards';
import { WebinarChartsSection } from '@/components/dashboard/WebinarChartsSection';
import { WebinarDataTables } from '@/components/dashboard/WebinarDataTables';
import { RecoverRegistrantsCard } from '@/components/dashboard/RecoverRegistrantsCard';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { SyncProgressIndicator } from '@/components/zoom/SyncProgressIndicator';

export default function Dashboard() {
  const { connection, isConnected } = useZoomConnection();

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your webinar analytics and performance metrics
          </p>
        </div>

        {/* Connection and Sync Status */}
        <div className="grid gap-6 md:grid-cols-2">
          <ZoomConnectionCard />
          <ZoomSyncCard />
        </div>

        {/* Sync Progress and Recovery */}
        {isConnected && connection && (
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <SyncProgressIndicator 
                connectionId={connection.id} 
                showHistory={true}
                showControls={true}
              />
            </div>
            <RecoverRegistrantsCard />
          </div>
        )}

        {/* Quick Actions */}
        <QuickActionsCard />

        {/* Metrics Overview */}
        {isConnected && <WebinarMetricsCards />}

        {/* Charts and Visualizations */}
        {isConnected && <WebinarChartsSection />}

        {/* Data Tables */}
        {isConnected && <WebinarDataTables />}
      </div>
    </PageLayout>
  );
}
