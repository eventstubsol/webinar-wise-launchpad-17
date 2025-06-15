
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, RefreshCw, Settings, AlertCircle } from 'lucide-react';
import { useZoomConnection } from '@/hooks/useZoomConnection';

export function ZoomConnectionCard() {
  const { connection, isLoading, isConnected, isExpired, reconnect } = useZoomConnection();

  const getStatusInfo = () => {
    if (isLoading) {
      return {
        icon: RefreshCw,
        label: 'Checking...',
        variant: 'secondary' as const,
        color: 'text-gray-600'
      };
    }
    
    if (isExpired) {
      return {
        icon: AlertCircle,
        label: 'Connection Expired',
        variant: 'destructive' as const,
        color: 'text-red-600'
      };
    }
    
    if (isConnected) {
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

  const status = getStatusInfo();
  const StatusIcon = status.icon;

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
              <Button variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Now
              </Button>
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
                ? 'Your Zoom connection has expired. Please reconnect to continue syncing webinar data.'
                : 'Connect your Zoom account to start analyzing your webinar data and unlock powerful insights.'
              }
            </p>
            <Button onClick={reconnect} className="w-full">
              <Wifi className="w-4 h-4 mr-2" />
              {isExpired ? 'Reconnect Zoom' : 'Connect Zoom Account'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
