
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  TestTube, 
  Shield, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings
} from 'lucide-react';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { useSyncProgress } from '@/hooks/useSyncProgress';
import { EnhancedSyncControls } from './sync/EnhancedSyncControls';
import { SyncHistoryTable } from './SyncHistoryTable';
import { SyncStatusOverview } from './SyncStatusOverview';
import { ParticipantSyncTester } from './ParticipantSyncTester';
import { EnhancedSyncOptions } from '@/types/zoom/enhancedSyncTypes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function EnhancedSyncDashboard() {
  const { connection } = useZoomConnection();
  const { isActive, progress, currentOperation, errors } = useSyncProgress(connection?.id || '');
  const [rateLimitStatus, setRateLimitStatus] = useState(null);

  const handleStartEnhancedSync = async (options: EnhancedSyncOptions) => {
    if (!connection?.id) {
      toast.error('No active Zoom connection found');
      return;
    }

    try {
      console.log('Starting enhanced sync with options:', options);
      
      const { data, error } = await supabase.functions.invoke('zoom-sync-webinars', {
        body: {
          connectionId: connection.id,
          syncType: options.testMode ? 'manual' : 'incremental',
          options
        }
      });

      if (error) {
        console.error('Enhanced sync failed:', error);
        toast.error(`Sync failed: ${error.message}`);
        return;
      }

      console.log('Enhanced sync started:', data);
      
      // Show appropriate success message based on options
      const modeDescription = [];
      if (options.testMode) modeDescription.push('Test Mode');
      if (options.dryRun) modeDescription.push('Dry Run');
      if (options.verboseLogging) modeDescription.push('Verbose Logging');
      
      const modeText = modeDescription.length > 0 ? ` (${modeDescription.join(', ')})` : '';
      
      toast.success(`Enhanced sync started successfully${modeText}`);
      
    } catch (error) {
      console.error('Enhanced sync error:', error);
      toast.error(`Failed to start sync: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (!connection) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Zoom Connection</h3>
          <p className="text-muted-foreground">
            Please connect your Zoom account to use the enhanced sync features.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Enhanced Sync Dashboard</h1>
          <p className="text-muted-foreground">
            Advanced webinar synchronization with test mode, error recovery, and detailed controls
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <Badge variant="outline" className="text-blue-600 border-blue-600">
              <Activity className="h-3 w-3 mr-1 animate-pulse" />
              Sync Active
            </Badge>
          )}
        </div>
      </div>

      {/* Active Sync Progress */}
      {isActive && (
        <Alert className="border-blue-200 bg-blue-50">
          <Activity className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Sync in Progress</span>
                <span className="text-sm">{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground">{currentOperation}</p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Error Display */}
      {errors.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <span className="font-medium">Sync Errors ({errors.length})</span>
              {errors.slice(0, 3).map((error, index) => (
                <p key={index} className="text-sm">{error.message}</p>
              ))}
              {errors.length > 3 && (
                <p className="text-sm text-muted-foreground">
                  ...and {errors.length - 3} more errors
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="sync-controls" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sync-controls">Enhanced Sync</TabsTrigger>
          <TabsTrigger value="status-overview">Status Overview</TabsTrigger>
          <TabsTrigger value="participant-tools">Participant Tools</TabsTrigger>
          <TabsTrigger value="sync-history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="sync-controls" className="space-y-6">
          <EnhancedSyncControls
            onStartSync={handleStartEnhancedSync}
            isLoading={isActive}
            rateLimitStatus={rateLimitStatus}
          />
        </TabsContent>

        <TabsContent value="status-overview" className="space-y-6">
          <SyncStatusOverview />
        </TabsContent>

        <TabsContent value="participant-tools" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Participant Sync Tools
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ParticipantSyncTester />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync-history" className="space-y-6">
          <SyncHistoryTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
