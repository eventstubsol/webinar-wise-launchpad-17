
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ZoomConnection } from '@/types/zoom';
import { ZoomConnectionService } from '@/services/zoom/ZoomConnectionService';
import { useZoomSyncOrchestrator } from '@/hooks/useZoomSyncOrchestrator';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Calendar, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SyncControlsProps {
  connection: ZoomConnection;
}

export const SyncControls: React.FC<SyncControlsProps> = ({ connection }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  
  const {
    startInitialSync,
    startIncrementalSync,
    isStarting
  } = useZoomSyncOrchestrator();

  // Auto-sync toggle mutation
  const autoSyncMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const success = await ZoomConnectionService.updateConnection(connection.id, {
        auto_sync_enabled: enabled,
        updated_at: new Date().toISOString(),
      });
      
      if (!success) {
        throw new Error('Failed to update auto-sync setting');
      }
      
      return enabled;
    },
    onSuccess: (enabled) => {
      queryClient.invalidateQueries({ queryKey: ['zoom-connection'] });
      toast({
        title: "Settings Updated",
        description: `Auto-sync has been ${enabled ? 'enabled' : 'disabled'}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleIncrementalSync = async () => {
    setIsSyncing(true);
    try {
      await startIncrementalSync();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleInitialSync = async () => {
    setIsSyncing(true);
    try {
      await startInitialSync();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAutoSyncToggle = (enabled: boolean) => {
    autoSyncMutation.mutate(enabled);
  };

  const syncInProgress = isSyncing || isStarting;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Sync Settings</h3>
      
      {/* Auto-sync Toggle */}
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div className="space-y-0.5">
          <div className="text-sm font-medium">Auto-sync</div>
          <div className="text-xs text-gray-600">
            Automatically sync webinar data every {connection.sync_frequency_hours || 24} hours
          </div>
        </div>
        <Switch
          checked={connection.auto_sync_enabled || false}
          onCheckedChange={handleAutoSyncToggle}
          disabled={autoSyncMutation.isPending}
        />
      </div>

      {/* Manual Sync Options */}
      <div className="space-y-3">
        {/* Incremental Sync */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">Quick Sync</div>
            <div className="text-xs text-gray-600">
              Sync recent changes and new webinars
            </div>
          </div>
          <Button
            onClick={handleIncrementalSync}
            disabled={syncInProgress}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncInProgress ? 'animate-spin' : ''}`} />
            {syncInProgress ? 'Syncing...' : 'Quick Sync'}
          </Button>
        </div>

        {/* Initial/Full Sync */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">Full Sync</div>
            <div className="text-xs text-gray-600">
              Complete synchronization of all webinar data
            </div>
          </div>
          <Button
            onClick={handleInitialSync}
            disabled={syncInProgress}
            size="sm"
            variant="outline"
          >
            <Zap className={`h-4 w-4 mr-2 ${syncInProgress ? 'animate-spin' : ''}`} />
            {syncInProgress ? 'Syncing...' : 'Full Sync'}
          </Button>
        </div>
      </div>

      {/* Last Sync Info */}
      {connection.last_sync_at && (
        <div className="flex items-center gap-2 text-xs text-gray-600 p-2 bg-gray-50 rounded">
          <Calendar className="h-3 w-3" />
          Last sync: {formatDistanceToNow(new Date(connection.last_sync_at), { addSuffix: true })}
        </div>
      )}

      {/* Next Sync Info */}
      {connection.auto_sync_enabled && connection.next_sync_at && (
        <div className="flex items-center gap-2 text-xs text-gray-600 p-2 bg-blue-50 rounded">
          <Calendar className="h-3 w-3" />
          Next auto-sync: {formatDistanceToNow(new Date(connection.next_sync_at), { addSuffix: true })}
        </div>
      )}
    </div>
  );
};
