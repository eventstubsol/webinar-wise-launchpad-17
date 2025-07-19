
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Info } from 'lucide-react';
import { ZoomCredentialsSetupForm } from './zoom/ZoomCredentialsSetupForm';
import { ZoomCredentialsDisplay } from './zoom/ZoomCredentialsDisplay';
import { ConnectedAccountInfo } from './zoom/ConnectedAccountInfo';
import { ConnectionStatusAlert } from './zoom/ConnectionStatusAlert';
import { SyncControls } from './zoom/SyncControls';
import { DisconnectSection } from './zoom/DisconnectSection';
import { WebhookConfiguration } from './zoom/WebhookConfiguration';
import { DiagnosticsSection } from './zoom/DiagnosticsSection';
import { useZoomCredentials } from '@/hooks/useZoomCredentials';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { ZoomConnectButton } from '@/components/zoom/ZoomConnectButton';
import { ZoomCredentials } from '@/types/zoomCredentials';

export const ZoomIntegrationSettings = () => {
  const [showCredentialsForm, setShowCredentialsForm] = useState(false);
  const { credentials, hasCredentials, isLoading: credentialsLoading } = useZoomCredentials();
  const { connection, isConnected, isExpired, isLoading: connectionLoading } = useZoomConnection();

  const handleCredentialsSaved = () => {
    setShowCredentialsForm(false);
  };

  const handleCredentialsDeleted = () => {
    // Credentials deleted, connection will be invalidated
  };

  const handleEditCredentials = () => {
    setShowCredentialsForm(true);
  };

  if (credentialsLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Loading Zoom settings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Zoom Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Connect your Zoom account to automatically sync webinar data and analyze your webinar performance.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Step 1: OAuth Credentials Setup */}
      {!hasCredentials || showCredentialsForm ? (
        <ZoomCredentialsSetupForm
          onCredentialsSaved={handleCredentialsSaved}
          onCancel={hasCredentials ? () => setShowCredentialsForm(false) : undefined}
        />
      ) : (
        <ZoomCredentialsDisplay
          credentials={credentials as ZoomCredentials}
          onEdit={handleEditCredentials}
          onDeleted={handleCredentialsDeleted}
        />
      )}

      {/* Step 2: Connection and Configuration Tabs */}
      {hasCredentials && !showCredentialsForm && (
        <Tabs defaultValue="connection" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="connection">Connection & Sync</TabsTrigger>
            <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
            <TabsTrigger value="webhooks">Real-time Updates</TabsTrigger>
          </TabsList>

          <TabsContent value="connection" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Connect Zoom Account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ConnectionStatusAlert 
                  isLoading={connectionLoading}
                  isConnected={isConnected}
                  isExpired={isExpired}
                />
                
                <ZoomConnectButton 
                  variant={isConnected ? "secondary" : "default"}
                  size="lg"
                  className="w-full"
                />
              </CardContent>
            </Card>

            {/* Connection Management (only if connected) */}
            {isConnected && connection && (
              <>
                <ConnectedAccountInfo connection={connection} />
                <SyncControls connection={connection} />
                <DisconnectSection connection={connection} />
              </>
            )}
          </TabsContent>

          <TabsContent value="diagnostics">
            <DiagnosticsSection />
          </TabsContent>

          <TabsContent value="webhooks">
            <WebhookConfiguration />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
