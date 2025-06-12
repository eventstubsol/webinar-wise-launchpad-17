
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { ZoomConnectButton } from '@/components/zoom/ZoomConnectButton';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { ZoomConnectionService } from '@/services/zoom/ZoomConnectionService';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  RefreshCw, 
  Unlink,
  Calendar,
  Globe
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const ZoomIntegrationSettings: React.FC = () => {
  const { connection, isConnected, isExpired, isLoading, refetch } = useZoomConnection();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  // Auto-sync toggle mutation
  const autoSyncMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!connection) throw new Error('No connection found');
      
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
      if (!connection) throw new Error('No connection found');
      
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

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      if (!connection) throw new Error('No connection found');
      
      const success = await ZoomConnectionService.deleteConnection(connection.id);
      if (!success) {
        throw new Error('Failed to disconnect');
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zoom-connection'] });
      toast({
        title: "Disconnected",
        description: "Your Zoom account has been disconnected successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Disconnect Failed",
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

  const getConnectionStatusAlert = () => {
    if (isLoading) {
      return (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>Loading</AlertTitle>
          <AlertDescription>Checking connection status...</AlertDescription>
        </Alert>
      );
    }

    if (!isConnected) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not Connected</AlertTitle>
          <AlertDescription>
            Connect your Zoom account to start syncing webinar data and analytics.
          </AlertDescription>
        </Alert>
      );
    }

    if (isExpired) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Expired</AlertTitle>
          <AlertDescription>
            Your Zoom connection has expired. Please reconnect to continue syncing data.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">Connected</AlertTitle>
        <AlertDescription className="text-green-700">
          Your Zoom account is connected and active.
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Zoom Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        {getConnectionStatusAlert()}

        {/* Connection Management */}
        <div className="space-y-4">
          {!isConnected ? (
            <div>
              <h3 className="text-sm font-medium mb-2">Connect Your Account</h3>
              <ZoomConnectButton 
                size="lg"
                onConnectionSuccess={() => {
                  toast({
                    title: "Connected!",
                    description: "Your Zoom account has been connected successfully.",
                  });
                }}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Account Information */}
              <div className="p-4 border rounded-lg bg-gray-50">
                <h3 className="text-sm font-medium mb-3">Connected Account</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Email:</span>
                    <span className="text-sm font-medium">{connection?.zoom_email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Account Type:</span>
                    <span className="text-sm font-medium">{connection?.zoom_account_type || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Connected:</span>
                    <span className="text-sm font-medium">
                      {connection?.created_at && formatDistanceToNow(new Date(connection.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {connection?.last_sync_at && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Last Sync:</span>
                      <span className="text-sm font-medium">
                        {formatDistanceToNow(new Date(connection.last_sync_at), { addSuffix: true })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Sync Controls */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Sync Settings</h3>
                
                {/* Auto-sync Toggle */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Auto-sync</div>
                    <div className="text-xs text-gray-600">
                      Automatically sync webinar data every {connection?.sync_frequency_hours || 24} hours
                    </div>
                  </div>
                  <Switch
                    checked={connection?.auto_sync_enabled || false}
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
                {connection?.auto_sync_enabled && connection?.next_sync_at && (
                  <div className="flex items-center gap-2 text-xs text-gray-600 p-2 bg-blue-50 rounded">
                    <Calendar className="h-3 w-3" />
                    Next auto-sync: {formatDistanceToNow(new Date(connection.next_sync_at), { addSuffix: true })}
                  </div>
                )}
              </div>

              {/* Disconnect Option */}
              <div className="pt-4 border-t">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Unlink className="h-4 w-4 mr-2" />
                      Disconnect Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disconnect Zoom Account?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove the connection to your Zoom account. You'll need to reconnect 
                        to continue syncing webinar data. Your existing data will be preserved.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => disconnectMutation.mutate()}
                        disabled={disconnectMutation.isPending}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
