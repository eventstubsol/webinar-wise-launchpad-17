
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ZoomConnectButton } from '@/components/zoom/ZoomConnectButton';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { useToast } from '@/hooks/use-toast';
import { Globe } from 'lucide-react';
import { ConnectionStatusAlert } from './zoom/ConnectionStatusAlert';
import { ConnectedAccountInfo } from './zoom/ConnectedAccountInfo';
import { SyncControls } from './zoom/SyncControls';
import { DisconnectSection } from './zoom/DisconnectSection';

export const ZoomIntegrationSettings: React.FC = () => {
  const { connection, isConnected, isExpired, isLoading } = useZoomConnection();
  const { toast } = useToast();

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
        <ConnectionStatusAlert 
          isLoading={isLoading}
          isConnected={isConnected}
          isExpired={isExpired}
        />

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
              <ConnectedAccountInfo connection={connection} />

              {/* Sync Controls */}
              <SyncControls connection={connection} />

              {/* Disconnect Option */}
              <DisconnectSection connection={connection} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
