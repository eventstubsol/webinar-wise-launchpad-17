
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Settings, RefreshCw, AlertCircle, Clock, X } from 'lucide-react';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { useZoomSync } from '@/hooks/useZoomSync';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { SyncStatusMessage } from '@/components/zoom/sync/SyncStatusMessage';
import { ServiceStatusAlert } from '@/components/zoom/sync/ServiceStatusAlert';
import { SyncResetButton } from '@/components/zoom/sync/SyncResetButton';
import { SyncRecoveryService } from '@/services/zoom/sync/SyncRecoveryService';
import { SyncType } from '@/types/zoom';

export function ZoomSyncCard() {
  const { connection, isConnected, isExpired } = useZoomConnection();
  const { 
    startSync, 
    testApiConnection, 
    isSyncing, 
    syncProgress, 
    syncStatus, 
    currentOperation,
    error,
    requiresReconnection,
    healthCheck,
    forceHealthCheck
  } = useZoomSync(connection);

  // Get sync statistics and current sync status
  const { data: syncStats, refetch: refetchStats } = useQuery({
    queryKey: ['zoom-sync-stats', connection?.id],
    queryFn: async () => {
      if (!connection?.id) return null;

      try {
        const [webinarsResult, syncLogsResult, currentSyncResult] = await Promise.all([
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
          SyncRecoveryService.getCurrentSyncStatus(connection.id)
        ]);

        const lastSyncData = syncLogsResult.data;
        const currentSync = currentSyncResult;

        return {
          totalWebinars: webinarsResult.count || 0,
          lastSync: lastSyncData?.completed_at || connection.last_sync_at,
          lastSyncStatus: lastSyncData?.sync_status || 'idle',
          lastSyncError: lastSyncData?.error_message,
          processedItems: lastSyncData?.processed_items || 0,
          currentSync,
          hasStuckSync: currentSync?.isStuck || false,
          canReset: currentSync?.canReset || false,
          isStuckInInitializing: currentSync?.isStuckInInitializing || false
        };
      } catch (error) {
        console.error('Error fetching sync stats:', error);
        return {
          totalWebinars: 0,
          lastSync: null,
          lastSyncStatus: 'idle',
          lastSyncError: null,
          processedItems: 0,
          currentSync: null,
          hasStuckSync: false,
          canReset: false,
          isStuckInInitializing: false
        };
      }
    },
    enabled: !!connection?.id,
    refetchInterval: 10000, // Check every 10 seconds for stuck syncs (more frequent)
    retry: (failureCount, error) => {
      const hasStatus = error && typeof error === 'object' && 'status' in error;
      const status = hasStatus ? (error as any).status : null;
      
      if (typeof status === 'number' && status >= 400 && status < 500) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const handleSyncClick = () => {
    startSync(SyncType.INCREMENTAL);
  };

  const handleConnectionTest = async () => {
    await testApiConnection();
  };

  const handleSyncReset = () => {
    // Refetch stats after reset
    refetchStats();
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
  let currentSyncStatus: 'idle' | 'running' | 'completed' | 'failed' | 'pending' = 'idle';
  let statusMessage = '';
  
  if (isSyncing) {
    currentSyncStatus = syncStatus === 'pending' ? 'pending' : 'running';
    statusMessage = currentOperation;
  } else if (syncStatus === 'completed') {
    currentSyncStatus = 'completed';
  } else if (syncStatus === 'failed') {
    currentSyncStatus = 'failed';
    statusMessage = error || 'Sync failed';
  } else if (syncStats?.lastSyncStatus === 'completed') {
    currentSyncStatus = syncStats.processedItems === 0 ? 'idle' : 'completed';
  } else if (syncStats?.lastSyncStatus === 'failed') {
    currentSyncStatus = 'failed';
    statusMessage = syncStats.lastSyncError || 'Unknown error';
  }

  const isServiceHealthy = healthCheck?.success !== false;
  const canSync = !isSyncing && !isExpired && isServiceHealthy && !requiresReconnection && !syncStats?.hasStuckSync;
  const hasStuckSync = syncStats?.hasStuckSync || false;
  const canShowForceCancel = syncStats?.canReset || syncStats?.isStuckInInitializing;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Webinar Data Sync (Render API)
          {(!isServiceHealthy || requiresReconnection || hasStuckSync) && (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ServiceStatusAlert 
          healthCheck={healthCheck}
          onRefresh={forceHealthCheck}
          syncState={{ error, requiresReconnection }}
        />

        {/* Stuck Sync Alert - Enhanced */}
        {hasStuckSync && syncStats?.currentSync && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-amber-800">
                  {syncStats.isStuckInInitializing ? 'Sync Stuck in Initialization' : 'Sync Appears Stuck'}
                </h4>
                <p className="text-sm text-amber-700 mt-1">
                  Your sync has been running for {syncStats.currentSync.minutesRunning} minutes in the "{syncStats.currentSync.sync_stage}" stage.
                  {syncStats.isStuckInInitializing && ' This is likely due to network connectivity issues.'}
                </p>
                <div className="mt-2 flex gap-2">
                  <SyncResetButton 
                    connectionId={connection.id}
                    syncLogId={syncStats.currentSync.id}
                    variant="force-cancel"
                    onReset={handleSyncReset}
                    size="sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Show immediate cancel option for initializing syncs over 3 minutes */}
        {isSyncing && currentOperation.includes('Initializing') && !hasStuckSync && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-start gap-2">
              <RefreshCw className="h-4 w-4 text-blue-600 mt-0.5 animate-spin" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-800">Sync Initializing</h4>
                <p className="text-sm text-blue-700 mt-1">
                  If the sync appears stuck, you can cancel and restart it.
                </p>
                <div className="mt-2">
                  <SyncResetButton 
                    connectionId={connection.id}
                    variant="force-cancel"
                    onReset={handleSyncReset}
                    size="sm"
                  />
                </div>
              </div>
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

        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={handleSyncClick}
            disabled={!canSync}
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
            disabled={isSyncing || !isServiceHealthy}
          >
            Test Connection
          </Button>
          
          <Button asChild variant="outline" size="sm">
            <Link to="/settings">
              <Settings className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        {/* Reset button for stuck syncs */}
        {syncStats?.canReset && !hasStuckSync && (
          <div className="pt-2 border-t">
            <SyncResetButton 
              connectionId={connection.id}
              onReset={handleSyncReset}
            />
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <div>Total webinars: {syncStats?.totalWebinars || 0}</div>
          {syncStats?.lastSync && (
            <div>Last sync: {new Date(syncStats.lastSync).toLocaleString()}</div>
          )}
          <div className="flex items-center gap-1 mt-1">
            Render API status: 
            <span className={isServiceHealthy ? 'text-green-600' : 'text-red-600'}>
              {isServiceHealthy ? 'Online' : 'Offline'}
            </span>
          </div>
          {requiresReconnection && (
            <div className="text-red-600 mt-1">
              Connection expired - reconnection required
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
