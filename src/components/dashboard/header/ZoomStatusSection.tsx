
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

export function ZoomStatusSection() {
  const { connection, tokenStatus, isLoading } = useZoomConnection();
  const { startSync, cancelSync, isSyncing, syncProgress, currentOperation } = useZoomSync(connection);
  const [showConnectionModal, setShowConnectionModal] = useState(false);

  // Get the last sync timestamp
  const { data: lastSyncData } = useQuery({
    queryKey: ['last-sync-timestamp', connection?.id],
    queryFn: async () => {
      if (!connection?.id) return null;
      
      try {
        const { data, error } = await supabase
          .from('zoom_sync_logs')
          .select('completed_at')
          .eq('connection_id', connection.id)
          .eq('sync_status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          throw error;
        }

        return data;
      } catch (error) {
        console.error('Failed to fetch last sync timestamp:', error);
        return null;
      }
    },
    enabled: !!connection?.id,
    refetchInterval: 30000,
    retry: (failureCount, error: any) => {
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const getConnectionStatus = () => {
    if (isLoading) {
      return { 
        icon: RefreshCw, 
        label: 'Checking...', 
        variant: 'secondary' as const,
        className: 'text-gray-600 bg-gray-100'
      };
    }

    switch (tokenStatus) {
      case TokenStatus.VALID:
        return { 
          icon: Wifi, 
          label: 'Connected', 
          variant: 'default' as const,
          className: 'text-green-700 bg-green-100 border-green-300'
        };
      case TokenStatus.REFRESH_EXPIRED:
      case TokenStatus.INVALID:
        return { 
          icon: AlertCircle, 
          label: 'Connection Expired', 
          variant: 'destructive' as const,
          className: 'text-red-600 bg-red-100 border-red-300'
        };
      case TokenStatus.NO_CONNECTION:
      default:
        return { 
          icon: WifiOff, 
          label: 'Not Connected', 
          variant: 'outline' as const,
          className: 'text-red-600 bg-red-100 border-red-300'
        };
    }
  };

  const status = getConnectionStatus();
  const StatusIcon = status.icon;

  const formatLastSync = (dateString: string | null | undefined) => {
    if (!dateString) return 'Never synced';
    try {
      return `Last sync: ${format(new Date(dateString), 'MMM d, yyyy h:mm a')}`;
    } catch (error) {
      return 'Last sync: Unknown';
    }
  };

  const handleConnectSyncClick = async () => {
    if (tokenStatus === TokenStatus.VALID) {
      if (isSyncing) {
        await cancelSync();
      } else {
        await startSync('incremental');
      }
    } else {
      setShowConnectionModal(true);
    }
  };

  const getButtonText = () => {
    if (isSyncing) {
      return (
        <div className="flex items-center gap-2">
          <span>Syncing... {syncProgress > 0 && `${syncProgress}%`}</span>
          <X className="w-3 h-3" />
        </div>
      );
    }
    if (tokenStatus === TokenStatus.VALID) return 'Sync';
    return 'Connect';
  };

  const isButtonDisabled = isLoading;

  return (
    <>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <Badge className={`flex items-center gap-1 ${status.className}`}>
            <StatusIcon className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            Zoom {status.label}
          </Badge>
          <span className="text-sm text-gray-500">
            {formatLastSync(lastSyncData?.completed_at || connection?.last_sync_at)}
          </span>
        </div>
        
        <Button
          onClick={handleConnectSyncClick}
          disabled={isButtonDisabled}
          size="sm"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {getButtonText()}
        </Button>
      </div>

      {/* Progress indicator */}
      {isSyncing && currentOperation && (
        <div className="text-xs text-gray-500 mt-1">
          {currentOperation}
        </div>
      )}

      <ZoomConnectionModal
        open={showConnectionModal}
        onOpenChange={setShowConnectionModal}
        onSuccess={() => {
          // Optionally refresh connection data or show success message
        }}
      />
    </>
  );
}
