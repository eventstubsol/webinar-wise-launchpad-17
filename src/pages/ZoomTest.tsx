
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, TestTube, Settings, Info } from 'lucide-react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { ZoomConnectionManager } from '@/components/zoom/ZoomConnectionManager';
import { ZoomTestConnection } from '@/components/zoom/ZoomTestConnection';
import { ZoomCredentialsSetupForm } from '@/components/settings/zoom/ZoomCredentialsSetupForm';
import { ZoomCredentialsDisplay } from '@/components/settings/zoom/ZoomCredentialsDisplay';
import { useZoomCredentials } from '@/hooks/useZoomCredentials';
import { useNavigate } from 'react-router-dom';
import type { ZoomCredentials } from '@/types/zoomCredentials';

const ZoomTest = () => {
  const navigate = useNavigate();
  const { credentials, hasCredentials } = useZoomCredentials();
  const [showCredentialsForm, setShowCredentialsForm] = useState(false);

  const handleCredentialsSaved = () => {
    setShowCredentialsForm(false);
  };

  const handleReconfigure = () => {
    setShowCredentialsForm(true);
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/settings')}
                variant="outline"
                size="sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Settings
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <TestTube className="h-6 w-6" />
                  Zoom Integration Test
                </h1>
                <p className="text-muted-foreground mt-1">
                  Test and troubleshoot your Zoom API connection
                </p>
              </div>
            </div>

            <Tabs defaultValue="status" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="status">Connection Status</TabsTrigger>
                <TabsTrigger value="test">Test Connection</TabsTrigger>
                <TabsTrigger value="setup">Setup & Configuration</TabsTrigger>
              </TabsList>

              <TabsContent value="status" className="space-y-6">
                <ZoomConnectionManager onReconfigure={handleReconfigure} />
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      Troubleshooting Guide
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4">
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold mb-2">Invalid Access Token</h4>
                        <p className="text-sm text-gray-600 mb-2">
                          If you see "Invalid access token" errors, your connection was likely created with corrupted OAuth data.
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Solution:</strong> Use the "Fix Connection" button to reset and reconfigure with Server-to-Server OAuth.
                        </p>
                      </div>
                      
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold mb-2">Missing Credentials</h4>
                        <p className="text-sm text-gray-600 mb-2">
                          Server-to-Server OAuth requires Client ID, Client Secret, and Account ID from your Zoom app.
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Solution:</strong> Configure your credentials in the "Setup & Configuration" tab.
                        </p>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold mb-2">Connection Type Mismatch</h4>
                        <p className="text-sm text-gray-600 mb-2">
                          Make sure your connection type matches your Zoom app type (Server-to-Server vs OAuth).
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Solution:</strong> We recommend using Server-to-Server OAuth for better reliability.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="test">
                <ZoomTestConnection />
              </TabsContent>

              <TabsContent value="setup" className="space-y-6">
                {!hasCredentials || showCredentialsForm ? (
                  <ZoomCredentialsSetupForm
                    onCredentialsSaved={handleCredentialsSaved}
                    onCancel={hasCredentials ? () => setShowCredentialsForm(false) : undefined}
                  />
                ) : (
                  <ZoomCredentialsDisplay
                    credentials={{
                      ...credentials,
                      app_type: (credentials.app_type as 'server_to_server' | 'oauth') || 'server_to_server'
                    } as ZoomCredentials}
                    onEdit={() => setShowCredentialsForm(true)}
                    onDeleted={() => setShowCredentialsForm(false)}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default ZoomTest;
