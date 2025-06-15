import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, 
  Download, 
  ServerCrash, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  List, 
  AlertTriangle, 
  Zap,
  Activity,
  Settings
} from 'lucide-react';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { useZoomSync } from '@/hooks/useZoomSync';
import { useNotificationSystem } from '@/hooks/useNotificationSystem';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow, formatDuration, intervalToDuration } from 'date-fns';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { RealTimeSyncProgress } from '@/components/sync/RealTimeSyncProgress';
import { SyncHistoryDetailView } from '@/components/sync/SyncHistoryDetailView';
import { SyncQueueVisualization } from '@/components/sync/SyncQueueVisualization';
import { PerformanceMetricsDashboard } from '@/components/sync/PerformanceMetricsDashboard';
import { NotificationService } from '@/services/notifications/NotificationService';

const SyncAnalytics = () => {
    const { connection } = useZoomConnection();
    const { data: stats, isLoading } = useQuery({
      queryKey: ['zoom-sync-analytics', connection?.id],
      queryFn: async () => {
        if (!connection?.id) return null;
        
        const { count: totalWebinars, error: webinarError } = await supabase
          .from('zoom_webinars')
          .select('id', { count: 'exact' })
          .eq('connection_id', connection.id);

        const { data: lastSuccessfulSync, error: syncError } = await supabase
          .from('zoom_sync_logs')
          .select('*')
          .eq('connection_id', connection.id)
          .eq('sync_status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(1)
          .single();

        if (webinarError || syncError) {
          console.error("Sync Analytics Error:", webinarError || syncError);
        }

        return {
          totalWebinars: totalWebinars || 0,
          lastSyncDate: lastSuccessfulSync?.completed_at,
          webinarsSyncedLast: lastSuccessfulSync?.processed_items || 0,
        };
      },
      enabled: !!connection?.id,
      refetchInterval: 30000,
    });

    if (isLoading) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Sync Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Loading analytics...</p>
          </CardContent>
        </Card>
      );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Sync Overview</CardTitle>
                <CardDescription>High-level statistics about your data synchronization.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="flex flex-col items-center justify-center p-4 border rounded-lg">
                    <p className="text-3xl font-bold">{stats?.totalWebinars ?? 0}</p>
                    <p className="text-sm text-muted-foreground">Total Webinars Synced</p>
                </div>
                <div className="flex flex-col items-center justify-center p-4 border rounded-lg">
                    <p className="text-3xl font-bold">{stats?.webinarsSyncedLast ?? 0}</p>
                    <p className="text-sm text-muted-foreground">Synced in Last Run</p>
                </div>
                <div className="flex flex-col items-center justify-center p-4 border rounded-lg">
                    <p className="text-lg font-semibold">
                      {stats?.lastSyncDate ? formatDistanceToNow(new Date(stats.lastSyncDate), { addSuffix: true }) : 'Never'}
                    </p>
                    <p className="text-sm text-muted-foreground">Last Successful Sync</p>
                </div>
            </CardContent>
        </Card>
    );
};

const SyncHistory = () => {
  const { connection } = useZoomConnection();
  const { startSync, isSyncing } = useZoomSync(connection?.id);
  const [selectedSyncId, setSelectedSyncId] = useState<string | null>(null);
  
  const { data: history, isLoading, error } = useQuery({
    queryKey: ['zoom-sync-history', connection?.id],
    queryFn: async () => {
      if (!connection?.id) return [];
      const { data, error } = await supabase
        .from('zoom_sync_logs')
        .select('*')
        .eq('connection_id', connection.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!connection?.id,
    refetchInterval: 5000,
  });

  // Set up sync completion notifications
  useEffect(() => {
    if (!connection?.id) return;

    const channel = supabase
      .channel(`sync-notifications-${connection.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'zoom_sync_logs',
          filter: `connection_id=eq.${connection.id}`,
        },
        (payload) => {
          const syncLog = payload.new;
          if (syncLog.sync_status === 'completed') {
            const duration = syncLog.duration_seconds 
              ? formatDuration(intervalToDuration({ start: 0, end: syncLog.duration_seconds * 1000 }))
              : 'unknown time';
            
            NotificationService.showSyncComplete(
              syncLog.processed_items || 0,
              duration
            );
          } else if (syncLog.sync_status === 'failed') {
            NotificationService.showSyncError(
              syncLog.error_message || 'Sync failed with unknown error'
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [connection?.id]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'in_progress':
      case 'started': return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getSyncDuration = (start: string, end: string | null): string => {
    if (!start || !end) return '-';
    try {
        const duration = intervalToDuration({ start: new Date(start), end: new Date(end) });
        return formatDuration(duration, { format: ['minutes', 'seconds'], zero: false }) || '< 1 second';
    } catch(e) {
        return '-';
    }
  };

  const formatSyncStage = (stage: string | null, webinarId: string | null): string => {
    if (!stage) return 'Not started';
    
    const stageLabels: { [key: string]: string } = {
      'initializing': 'Initializing sync',
      'fetching_webinar_list': 'Fetching webinar list',
      'fetching_recent_webinars': 'Fetching recent webinars',
      'starting_webinar': 'Starting webinar sync',
      'webinar_details': 'Fetching webinar details',
      'registrants': 'Fetching registrants',
      'participants': 'Fetching participants',
      'polls': 'Fetching polls and responses',
      'qa': 'Fetching Q&A data',
      'recordings': 'Fetching recordings',
      'webinar_completed': 'Webinar completed',
      'webinar_failed': 'Webinar failed',
      'completed': 'Sync completed',
      'failed': 'Sync failed'
    };

    const label = stageLabels[stage] || stage;
    return webinarId ? `${label} (${webinarId})` : label;
  };

  const selectedSync = selectedSyncId ? history?.find(h => h.id === selectedSyncId) : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Sequential Sync History & Logs
              </CardTitle>
              <CardDescription>Detailed history of your webinar sync operations with sequential processing.</CardDescription>
          </div>
          <div className="flex gap-2">
              <Button variant="outline" onClick={() => startSync('incremental')} disabled={isSyncing}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} /> Sync Recent
              </Button>
              <Button onClick={() => startSync('initial')} disabled={isSyncing}>
                  <Download className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} /> Full Sync
              </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isSyncing && (
            <Alert className="mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertTitle>Sequential Sync in Progress</AlertTitle>
              <AlertDescription>
                Webinars are being processed one by one for optimal reliability. This list will update automatically.
              </AlertDescription>
            </Alert>
          )}
          
          {isLoading && <p>Loading history...</p>}
          {error && <p className="text-red-500">Could not load sync history.</p>}
          {history && history.length === 0 && !isLoading && <p>No sync history found. Start a sync to see logs here.</p>}
          
          {history && history.length > 0 && (
            <div className="space-y-4">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-lg font-semibold text-green-600">
                    {history.filter(h => h.sync_status === 'completed').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Successful</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-red-600">
                    {history.filter(h => h.sync_status === 'failed').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">
                    {history.filter(h => h.sync_status === 'completed')
                      .reduce((sum, h) => sum + (h.processed_items || 0), 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Items Synced</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">
                    {history.filter(h => h.sync_status === 'completed')
                      .reduce((sum, h) => sum + (h.api_calls_made || 0), 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">API Calls Made</div>
                </div>
              </div>

              {/* Detailed History */}
              <Accordion type="single" collapsible className="w-full">
                {history.map((log) => (
                  <AccordionItem value={log.id} key={log.id}>
                    <AccordionTrigger 
                      className="hover:no-underline"
                      onClick={() => setSelectedSyncId(selectedSyncId === log.id ? null : log.id)}
                    >
                        <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center gap-3">
                                {/* ... keep existing status icon and basic info the same ... */}
                                <div>
                                    <p className="font-medium capitalize">{log.sync_type} Sync</p>
                                    <p className="text-sm text-muted-foreground">
                                    {format(new Date(log.created_at), 'MMM d, yyyy, p')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <Badge variant={log.sync_status === 'failed' ? 'destructive' : 'secondary'} className="capitalize">
                                    {log.sync_status.replace('_', ' ')}
                                </Badge>
                                <span className="text-sm text-muted-foreground w-28 text-right">
                                    {/* ... keep existing duration calculation the same ... */}
                                </span>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="bg-muted/50 p-0 rounded-md border-l-4">
                      {selectedSyncId === log.id && (
                        <div className="p-4">
                          <SyncHistoryDetailView syncEntry={log} />
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default function SyncCenter() {
  const { isConnected, isLoading: isConnectionLoading, connection } = useZoomConnection();
  const { preferences } = useNotificationSystem(connection?.user_id);

  // Request notification permission on first load
  useEffect(() => {
    if (preferences?.browser_notifications_enabled) {
      NotificationService.requestPermission();
    }
  }, [preferences?.browser_notifications_enabled]);

  if (isConnectionLoading) {
      return (
        <div className="flex items-center justify-center p-8 h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
  }

  if (!isConnected) {
    return (
        <div className="p-6">
            <Alert variant="destructive">
                <ServerCrash className="h-4 w-4" />
                <AlertTitle>Zoom Not Connected</AlertTitle>
                <AlertDescription>
                Please connect your Zoom account in settings to enable data synchronization.
                </AlertDescription>
            </Alert>
        </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Sync Center</h1>
        <p className="text-gray-600">Monitor and manage your comprehensive Zoom data synchronization.</p>
      </header>
      
      <main>
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="queue">Sync Queue</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <SyncAnalytics />
            {connection?.id && <RealTimeSyncProgress connectionId={connection.id} />}
          </TabsContent>

          <TabsContent value="queue" className="space-y-6">
            {connection?.id && <SyncQueueVisualization connectionId={connection.id} />}
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <SyncHistory />
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            {connection?.id && connection.user_id && (
              <PerformanceMetricsDashboard 
                connectionId={connection.id} 
                userId={connection.user_id}
              />
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Notification Settings
                </CardTitle>
                <CardDescription>
                  Configure how you want to be notified about sync events.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      Notification preferences can be configured in your account settings. 
                      Browser notifications require permission and will be requested when enabled.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Current Settings:</h4>
                    <ul className="text-sm space-y-1 ml-4">
                      <li>• Browser notifications: {preferences?.browser_notifications_enabled ? 'Enabled' : 'Disabled'}</li>
                      <li>• Toast notifications: {preferences?.toast_notifications_enabled ? 'Enabled' : 'Disabled'}</li>
                      <li>• Email notifications: {preferences?.email_notifications_enabled ? 'Enabled' : 'Disabled'}</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
