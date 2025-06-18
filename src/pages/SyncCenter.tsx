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
  Users,
  Settings
} from 'lucide-react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { SidebarTrigger } from '@/components/ui/sidebar';
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
import { ParticipantSyncDebugPanel } from '@/components/sync/ParticipantSyncDebugPanel';

// Header component for consistent styling
const SyncCenterHeader = () => {
  return (
    <header className="border-b border-border bg-background sticky top-0 z-10">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <SidebarTrigger />
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-xl font-semibold text-foreground">Sync Center</h1>
          </div>
        </div>

        <div className="text-right">
          <Button>
            <Settings className="mr-2 h-4 w-4" />
            Configure Sync
          </Button>
        </div>
      </div>
    </header>
  );
};

const SyncAnalytics = () => {
    const { connection } = useZoomConnection();
    const { data: stats, isLoading, error } = useQuery({
      queryKey: ['zoom-sync-analytics', connection?.id],
      queryFn: async () => {
        if (!connection?.id) return null;
        
        try {
          // First, check if the connection has any webinars at all
          const { count: totalWebinars, error: webinarError } = await supabase
            .from('zoom_webinars')
            .select('id', { count: 'exact' })
            .eq('connection_id', connection.id);

          if (webinarError) {
            console.error("Error fetching webinars:", webinarError);
            return {
              totalWebinars: 0,
              lastSyncDate: null,
              webinarsSyncedLast: 0,
            };
          }

          // Only query sync logs if there might be data
          let lastSuccessfulSync = null;
          if (totalWebinars && totalWebinars > 0) {
            const { data: syncData, error: syncError } = await supabase
              .from('zoom_sync_logs')
              .select('completed_at,processed_items')
              .eq('connection_id', connection.id)
              .eq('sync_status', 'completed')
              .order('completed_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (syncError) {
              console.error("Error fetching sync logs:", syncError);
            } else {
              lastSuccessfulSync = syncData;
            }
          }

          return {
            totalWebinars: totalWebinars || 0,
            lastSyncDate: lastSuccessfulSync?.completed_at || null,
            webinarsSyncedLast: lastSuccessfulSync?.processed_items || 0,
          };
        } catch (error) {
          console.error("Sync Analytics Error:", error);
          return {
            totalWebinars: 0,
            lastSyncDate: null,
            webinarsSyncedLast: 0,
          };
        }
      },
      enabled: !!connection?.id,
      refetchInterval: 30000,
      retry: (failureCount, error) => {
        // Type guard for error with status property
        const hasStatus = error && typeof error === 'object' && 'status' in error;
        const status = hasStatus ? (error as any).status : null;
        
        // Don't retry on 4xx errors
        if (typeof status === 'number' && status >= 400 && status < 500) {
          return false;
        }
        return failureCount < 2;
      },
    });

    if (isLoading) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Sync Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <p>Loading analytics...</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (error) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Sync Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Loading Analytics</AlertTitle>
              <AlertDescription>
                Unable to load sync analytics. Please try refreshing the page.
              </AlertDescription>
            </Alert>
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
      
      try {
        const { data, error } = await supabase
          .from('zoom_sync_logs')
          .select('*')
          .eq('connection_id', connection.id)
          .order('created_at', { ascending: false })
          .limit(20);
        
        if (error) {
          console.error("Error fetching sync history:", error);
          return [];
        }
        
        return data || [];
      } catch (error) {
        console.error("Sync history query failed:", error);
        return [];
      }
    },
    enabled: !!connection?.id,
    refetchInterval: 5000,
    retry: (failureCount, error) => {
      // Type guard for error with status property
      const hasStatus = error && typeof error === 'object' && 'status' in error;
      const status = hasStatus ? (error as any).status : null;
      
      // Don't retry on 4xx errors
      if (typeof status === 'number' && status >= 400 && status < 500) {
        return false;
      }
      return failureCount < 2;
    },
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
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <p>Loading history...</p>
            </div>
          )}
          
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Unable to load sync history. Please try refreshing the page.
              </AlertDescription>
            </Alert>
          )}
          
          {!isLoading && !error && history && history.length === 0 && (
            <div className="text-center py-8">
              <List className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Sync History</h3>
              <p className="mt-1 text-sm text-gray-500">Run a sync to see its history here.</p>
            </div>
          )}
          
          {!isLoading && !error && history && history.length > 0 && (
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
        return (
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <SyncCenterHeader />
              <div className="p-6 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p className="mt-2 text-muted-foreground">Loading sync center...</p>
              </div>
            </SidebarInset>
          </SidebarProvider>
        );
    }
    
    if (!isConnected) {
        return (
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset>
                <SyncCenterHeader />
                <div className="p-6">
                    <Alert variant="destructive">
                        <ServerCrash className="h-4 w-4" />
                        <AlertTitle>Not Connected to Zoom</AlertTitle>
                        <AlertDescription>
                            Please connect your Zoom account in the settings to use the Sync Center.
                        </AlertDescription>
                    </Alert>
                </div>
              </SidebarInset>
            </SidebarProvider>
        );
    }
    
    return (
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <SyncCenterHeader />
            <div className="p-6 space-y-6">
              <div>
                <p className="text-muted-foreground">Monitor and manage your Zoom data synchronization.</p>
              </div>

              <RealTimeSyncProgress connectionId={connection?.id} />

              <Tabs defaultValue="overview">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">
                    <Activity className="mr-2 h-4 w-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="participants">
                    <Users className="mr-2 h-4 w-4" />
                    Participants
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
                <TabsContent value="participants" className="mt-6">
                  <ParticipantSyncDebugPanel connectionId={connection?.id || ''} />
                </TabsContent>
                <TabsContent value="history" className="mt-6">
                  <SyncHistory />
                </TabsContent>
                <TabsContent value="performance" className="mt-6">
                  <PerformanceMetricsDashboard connectionId={connection?.id} userId={user?.id} />
                </TabsContent>
              </Tabs>
            </div>
          </SidebarInset>
        </SidebarProvider>
    );
};

export default SyncCenterPage;
