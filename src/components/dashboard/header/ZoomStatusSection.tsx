
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { useZoomSync } from '@/hooks/useZoomSync';
import { RefreshCw, Wifi, WifiOff, AlertCircle, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { TokenStatus } from '@/services/zoom/utils/tokenUtils';
import { ZoomConnectionModal } from '@/components/zoom/ZoomConnectionModal';
import { SyncType } from '@/types/zoom';

export function ZoomStatusSection() {
  const { connection } = useZoomConnection();
  const { startSync, cancelSync, isSyncing, syncProgress, syncStatus, currentOperation } = useZoomSync(connection);
  const [showConnectionModal, setShowConnectionModal] = useState(false);

  // Query for last sync status
  const { data: lastSync } = useQuery({
    queryKey: ['last-sync', connection?.id],
    queryFn: async () => {
      if (!connection?.id) return null;

      const { data, error } = await supabase
        .from('zoom_sync_logs')
        .select('*')
        .eq('connection_id', connection.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching last sync:', error);
        return null;
      }

      return data;
    },
    enabled: !!connection?.id,
  });

  const getConnectionStatus = () => {
    if (!connection) return 'disconnected';
    if (connection.connection_status === 'active') return 'connected';
    return 'error';
  };

  const getConnectionIcon = () => {
    const status = getConnectionStatus();
    switch (status) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-400" />;
    }
  };

  const getConnectionBadge = () => {
    const status = getConnectionStatus();
    switch (status) {
      case 'connected':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Connected</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Disconnected</Badge>;
    }
  };

  const getSyncStatusBadge = () => {
    if (isSyncing) {
      return <Badge variant="default">Syncing ({syncProgress}%)</Badge>;
    }
    if (lastSync) {
      const variant = lastSync.sync_status === 'completed' ? 'secondary' : 'destructive';
      return <Badge variant={variant}>{lastSync.sync_status}</Badge>;
    }
    return <Badge variant="outline">Not synced</Badge>;
  };

  const handleSync = async () => {
    try {
      await startSync(SyncType.MANUAL);
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const handleCancelSync = async () => {
    try {
      await cancelSync();
    } catch (error) {
      console.error('Cancel sync failed:', error);
    }
  };

  return (
    <>
      <div className="flex items-center gap-4 p-4 bg-white border rounded-lg">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          {getConnectionIcon()}
          <div>
            <div className="font-medium text-sm">Zoom Connection</div>
            <div className="flex items-center gap-2">
              {getConnectionBadge()}
              {connection && (
                <span className="text-xs text-muted-foreground">
                  {connection.zoom_email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Sync Status */}
        <div className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''} text-blue-600`} />
          <div>
            <div className="font-medium text-sm">Sync Status</div>
            <div className="flex items-center gap-2">
              {getSyncStatusBadge()}
              {lastSync && (
                <span className="text-xs text-muted-foreground">
                  {format(new Date(lastSync.created_at), 'MMM dd, HH:mm')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Current Operation */}
        {isSyncing && currentOperation && (
          <div className="flex-1">
            <div className="font-medium text-sm">Current Operation</div>
            <div className="text-xs text-muted-foreground">{currentOperation}</div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {!connection ? (
            <Button 
              onClick={() => setShowConnectionModal(true)} 
              variant="outline" 
              size="sm"
            >
              <Wifi className="h-4 w-4 mr-2" />
              Connect Zoom
            </Button>
          ) : isSyncing ? (
            <Button 
              onClick={handleCancelSync} 
              variant="outline" 
              size="sm"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          ) : (
            <Button 
              onClick={handleSync} 
              variant="outline" 
              size="sm"
              disabled={!connection}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync
            </Button>
          )}
        </div>
      </div>

      <ZoomConnectionModal 
        open={showConnectionModal}
        onOpenChange={setShowConnectionModal}
      />
    </>
  );
}
