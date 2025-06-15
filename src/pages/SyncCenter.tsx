
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
import { useAuth } from '@/contexts/AuthContext';

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
          .select('completed_at,processed_items')
          .eq('connection_id', connection.id)
          .eq('sync_status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

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
              <CardDescription>
                Detailed logs and history of your synchronization jobs.
              </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && <p>Loading history...</p>}
          {error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert>}
          
          {history && history.length === 0 && (
            <div className="text-center py-8">
              <List className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Sync History</h3>
              <p className="mt-1 text-sm text-gray-500">Run a sync to see its history here.</p>
            </div>
          )}
          
          {history && history.length > 0 && (
            <Accordion type="single" collapsible onValueChange={setSelectedSyncId}>
              {history.map((log) => (
                <AccordionItem value={log.id} key={log.id}>
                  <AccordionTrigger>
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.sync_status)}
                        <span className="font-medium capitalize">{log.sync_type} Sync</span>
                        <Badge variant="outline">{log.sync_status}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="p-4 bg-gray-50 rounded-b-md">
                      <p><strong>Status:</strong> {log.sync_status}</p>
                      <p><strong>Started:</strong> {format(new Date(log.created_at), "PPP p")}</p>
                      {log.completed_at && <p><strong>Duration:</strong> {getSyncDuration(log.created_at, log.completed_at)}</p>}
                      <p><strong>Current Stage:</strong> {formatSyncStage(log.sync_stage, log.current_webinar_id)}</p>
                      {log.processed_items !== null && <p><strong>Items Processed:</strong> {log.processed_items}</p>}
                      {log.error_message && <p className="text-red-500"><strong>Error:</strong> {log.error_message}</p>}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
      
      {selectedSync && (
        <SyncHistoryDetailView syncEntry={selectedSync} />
      )}
    </div>
  );
};

const SyncCenterPage = () => {
    const { connection, isLoading, isConnected } = useZoomConnection();
    const { user } = useAuth();

    if (isLoading) {
        return <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>;
    }
    
    if (!isConnected) {
        return (
            <div className="p-8">
                <Alert variant="destructive">
                    <ServerCrash className="h-4 w-4" />
                    <AlertTitle>Not Connected to Zoom</AlertTitle>
                    <AlertDescription>
                        Please connect your Zoom account in the settings to use the Sync Center.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Sync Center</h1>
                <p className="text-muted-foreground">Monitor and manage your Zoom data synchronization.</p>
              </div>
              <div className="mt-4 sm:mt-0">
                <Button>
                  <Settings className="mr-2 h-4 w-4" />
                  Configure Sync
                </Button>
              </div>
            </div>

            <RealTimeSyncProgress connectionId={connection?.id} />

            <Tabs defaultValue="overview">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">
                  <Activity className="mr-2 h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="history">
                  <Clock className="mr-2 h-4 w-4" />
                  History
                </TabsTrigger>
                <TabsTrigger value="performance">
                  <Zap className="mr-2 h-4 w-4" />
                  Performance
                </TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="mt-6">
                <SyncAnalytics />
                <div className="mt-8">
                    <SyncQueueVisualization connectionId={connection?.id} />
                </div>
              </TabsContent>
              <TabsContent value="history" className="mt-6">
                <SyncHistory />
              </TabsContent>
              <TabsContent value="performance" className="mt-6">
                <PerformanceMetricsDashboard connectionId={connection?.id} userId={user?.id} />
              </TabsContent>
            </Tabs>
        </div>
    );
};

export default SyncCenterPage;
