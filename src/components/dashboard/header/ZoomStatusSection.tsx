import React from 'react';
import { Button } from '@/components/ui/button';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { useZoomSync } from '@/hooks/useZoomSync';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ZoomConnectionModal } from '@/components/zoom/ZoomConnectionModal';
import { SyncType } from '@/types/zoom';
import { useState } from 'react';

export function ZoomStatusSection() {
  const { connection } = useZoomConnection();
  const { startSync, cancelSync, isSyncing, syncProgress } = useZoomSync(connection);
  const [showConnectionModal, setShowConnectionModal] = useState(false);

  // Query for last sync
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

  const handleSync = async () => {
    if (!connection) {
      setShowConnectionModal(true);
      return;
    }
    
    if (isSyncing) {
      await cancelSync();
    } else {
      await startSync(SyncType.INCREMENTAL);
    }
  };

  const getLastSyncText = () => {
    if (!lastSync) return null;
    
    const syncDate = new Date(lastSync.created_at);
    return `Last sync: ${format(syncDate, 'MMM d, yyyy h:mm a')}`;
  };

  const getConnectionStatus = () => {
    if (!connection) return { text: 'Zoom: Not Connected', color: 'text-red-600' };
    if (connection.connection_status === 'active') {
      return { text: 'Zoom: Connected', color: 'text-green-600' };
    }
    return { text: 'Zoom: Error', color: 'text-red-600' };
  };

  const status = getConnectionStatus();

  return (
    <>
      <div className="flex items-center gap-4">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          {connection ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600" />
          )}
          <span className={`font-medium ${status.color}`}>
            {status.text}
          </span>
        </div>

        {/* Last Sync Info */}
        {connection && lastSync && (
          <span className="text-sm text-muted-foreground">
            {getLastSyncText()}
          </span>
        )}

        {/* Sync Button */}
        <Button
          onClick={handleSync}
          variant={connection ? "outline" : "default"}
          size="sm"
          disabled={isSyncing && connection}
          className={connection ? "" : "bg-green-600 hover:bg-green-700"}
        >
          {!connection ? (
            'Connect Zoom'
          ) : isSyncing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Syncing... {syncProgress > 0 && `${syncProgress}%`}
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync
            </>
          )}
        </Button>
      </div>

      <ZoomConnectionModal 
        open={showConnectionModal}
        onOpenChange={setShowConnectionModal}
      />
    </>
  );
}
