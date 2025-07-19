
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, RefreshCw, Settings, AlertCircle } from 'lucide-react';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { useDashboardRefresh } from '@/hooks/useDashboardRefresh';
import { TokenUtils, TokenStatus } from '@/services/zoom/utils/tokenUtils';
import { ZoomConnectButton } from '@/components/zoom/ZoomConnectButton';
import { ZoomConnection } from '@/types/zoom';
import { useToast } from '@/hooks/use-toast';

export function ZoomConnectionCard() {
  const { connection, isLoading, tokenStatus } = useZoomConnection();
  const { refreshDashboardData } = useDashboardRefresh();
  const { toast } = useToast();

  const getStatusInfo = () => {
    if (isLoading) {
      return {
        icon: RefreshCw,
        label: 'Checking...',
        variant: 'secondary' as const,
        color: 'text-gray-600'
      };
    }
    
    // Use centralized token status logic
    if (tokenStatus === TokenStatus.INVALID || tokenStatus === TokenStatus.REFRESH_EXPIRED) {
      return {
        icon: AlertCircle,
        label: 'Connection Invalid',
        variant: 'destructive' as const,
        color: 'text-red-600'
      };
    }
    
    if (tokenStatus === TokenStatus.VALID) {
      return {
        icon: Wifi,
        label: 'Connected',
        variant: 'default' as const,
        color: 'text-green-600'
      };
    }
    
    return {
      icon: WifiOff,
      label: 'Not Connected',
      variant: 'outline' as const,
      color: 'text-red-600'
    };
  };

  const handleConnectionSuccess = async (reconnectedConnection: ZoomConnection) => {
    console.log('🔄 Zoom reconnection successful, refreshing dashboard...');
    
    try {
      // Refresh all dashboard data
      await refreshDashboardData();
      
      toast({
        title: "Connection Restored!",
        description: "Your Zoom account has been reconnected and dashboard data is being updated.",
      });
    } catch (error) {
      console.error('Failed to refresh dashboard after reconnection:', error);
      toast({
        title: "Connection Restored",
        description: "Your Zoom account has been reconnected. Please refresh the page if data doesn't update automatically.",
        variant: "default",
      });
    }
  };

  const handleConnectionError = (error: string) => {
    toast({
      title: "Connection Failed",
      description: error,
      variant: "destructive",
    });
  };

  const status = getStatusInfo();
  const StatusIcon = status.icon;
  const isConnected = tokenStatus === TokenStatus.VALID;
  const isExpired = tokenStatus === TokenStatus.INVALID || tokenStatus === TokenStatus.REFRESH_EXPIRED;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Zoom Integration</span>
          <Badge variant={status.variant} className="flex items-center gap-1">
            <StatusIcon className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            {status.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Account</p>
                <p className="font-medium">{connection?.zoom_account_type || 'Connected'}</p>
              </div>
              <div>
                <p className="text-gray-600">Last Sync</p>
                <p className="font-medium">
                  {connection?.last_sync_at 
                    ? new Date(connection.last_sync_at).toLocaleDateString()
                    : 'Never'
                  }
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600 text-sm">
              {isExpired 
                ? 'Your Zoom connection has invalid credentials. Please reconfigure to continue syncing webinar data.'
                : 'Connect your Zoom account to start analyzing your webinar data and unlock powerful insights.'
              }
            </p>
            <ZoomConnectButton 
              variant="default"
              size="default"
              className="w-full"
              onConnectionSuccess={handleConnectionSuccess}
              onConnectionError={handleConnectionError}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
