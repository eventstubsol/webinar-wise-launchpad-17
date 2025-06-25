
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Settings, RefreshCw, AlertCircle } from 'lucide-react';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { useZoomSync } from '@/hooks/useZoomSync';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { SyncStatusMessage } from '@/components/zoom/sync/SyncStatusMessage';
import { RenderZoomService } from '@/services/zoom/RenderZoomService';

export function ZoomSyncCard() {
  const { connection, isConnected, isExpired } = useZoomConnection();
  const { 
    startSync, 
    testApiConnection, 
    isSyncing, 
    syncProgress, 
    syncStatus, 
    currentOperation 
  } = useZoomSync(connection);

  // Get sync statistics
  const { data: syncStats } = useQuery({
    queryKey: ['zoom-sync-stats', connection?.id],
    queryFn: async () => {
      if (!connection?.id) return null;

      try {
        const [webinarsResult, syncLogsResult] = await Promise.all([
          supabase
            .from('zoom_webinars')
            .select('id, synced_at', { count: 'exact' })
            .eq('connection_id', connection.id),
          supabase
            .from('zoom_sync_logs')
            .select('*')
            .eq('connection_id', connection.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        const lastSyncData = syncLogsResult.data;

        return {
          totalWebinars: webinarsResult.count || 0,
          lastSync: lastSyncData?.completed_at || connection.last_sync_at,
          lastSyncStatus: lastSyncData?.sync_status || 'idle',
          lastSyncError: lastSyncData?.error_message,
          processedItems: lastSyncData?.processed_items || 0,
        };
      } catch (error) {
        console.error('Error fetching sync stats:', error);
        return {
          totalWebinars: 0,
          lastSync: null,
          lastSyncStatus: 'idle',
          lastSyncError: null,
          processedItems: 0,
        };
      }
    },
    enabled: !!connection?.id,
    refetchInterval: 30000,
    retry: (failureCount, error) => {
      const hasStatus = error && typeof error === 'object' && 'status' in error;
      const status = hasStatus ? (error as any).status : null;
      
      if (typeof status === 'number' && status >= 400 && status < 500) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Check Render service health
  const { data: renderHealth } = useQuery({
    queryKey: ['render-health'],
    queryFn: () => RenderZoomService.healthCheck(),
    refetchInterval: 60000, // Check every minute
    retry: 1,
  });

  const handleSyncClick = () => {
    startSync('incremental');
  };

  const handleConnectionTest = async () => {
    await testApiConnection();
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Webinar Data Sync
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Connect your Zoom account to sync webinar data and view analytics.
          </p>
          <Button asChild variant="default" size="sm">
            <Link to="/settings">
              <Settings className="w-4 h-4 mr-2" />
              Connect Zoom Account
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Determine current sync status
  let currentSyncStatus: 'idle' | 'syncing' | 'completed' | 'failed' | 'no_data' = 'idle';
  let statusMessage = '';
  
  if (isSyncing) {
    currentSyncStatus = 'syncing';
    statusMessage = currentOperation;
  } else if (syncStatus !== 'idle') {
    currentSyncStatus = syncStatus;
  } else if (syncStats?.lastSyncStatus === 'completed') {
    currentSyncStatus = syncStats.processedItems === 0 ? 'no_data' : 'completed';
  } else if (syncStats?.lastSyncStatus === 'failed') {
    currentSyncStatus = 'failed';
    statusMessage = syncStats.lastSyncError || 'Unknown error';
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Webinar Data Sync
          {renderHealth && !renderHealth.success && (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderHealth && !renderHealth.success && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            <div className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Sync service unavailable. Please try again later.
            </div>
          </div>
        )}

        <SyncStatusMessage 
          status={currentSyncStatus}
          message={statusMessage}
          webinarCount={syncStats?.totalWebinars || 0}
          lastSyncAt={syncStats?.lastSync || undefined}
        />

        {isSyncing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress:</span>
              <span>{syncProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${syncProgress}%` }}
              />
            </div>
            {currentOperation && (
              <div className="text-xs text-muted-foreground">
                {currentOperation}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={handleSyncClick}
            disabled={isSyncing || isExpired || (renderHealth && !renderHealth.success)}
            size="sm"
            className="flex-1"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
          
          <Button 
            onClick={handleConnectionTest}
            variant="outline"
            size="sm"
            disabled={isSyncing || (renderHealth && !renderHealth.success)}
          >
            Test Connection
          </Button>
          
          <Button asChild variant="outline" size="sm">
            <Link to="/settings">
              <Settings className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <div>Total webinars: {syncStats?.totalWebinars || 0}</div>
          {syncStats?.lastSync && (
            <div>Last sync: {new Date(syncStats.lastSync).toLocaleString()}</div>
          )}
          <div className="flex items-center gap-1 mt-1">
            Sync service: 
            <span className={renderHealth?.success ? 'text-green-600' : 'text-red-600'}>
              {renderHealth?.success ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
