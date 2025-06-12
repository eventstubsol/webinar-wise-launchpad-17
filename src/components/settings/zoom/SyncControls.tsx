
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ZoomConnection } from '@/types/zoom';
import { ZoomConnectionService } from '@/services/zoom/ZoomConnectionService';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SyncControlsProps {
  connection: ZoomConnection;
}

export const SyncControls: React.FC<SyncControlsProps> = ({ connection }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

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

  // Manual sync mutation
  const manualSyncMutation = useMutation({
    mutationFn: async () => {
      // TODO: Implement actual sync logic - this is a placeholder
      await new Promise(resolve => setTimeout(resolve, 2000));
      return true;
    },
    onSuccess: () => {
      setIsSyncing(false);
      queryClient.invalidateQueries({ queryKey: ['zoom-connection'] });
      toast({
        title: "Sync Complete",
        description: "Your Zoom data has been synchronized successfully.",
      });
    },
    onError: (error: Error) => {
      setIsSyncing(false);
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleManualSync = () => {
    setIsSyncing(true);
    manualSyncMutation.mutate();
  };

  const handleAutoSyncToggle = (enabled: boolean) => {
    autoSyncMutation.mutate(enabled);
  };

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

      {/* Manual Sync */}
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div className="space-y-0.5">
          <div className="text-sm font-medium">Manual Sync</div>
          <div className="text-xs text-gray-600">
            Sync your latest webinar data now
          </div>
        </div>
        <Button
          onClick={handleManualSync}
          disabled={isSyncing || manualSyncMutation.isPending}
          size="sm"
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </Button>
      </div>

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
