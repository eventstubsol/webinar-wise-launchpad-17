
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw, Download, ServerCrash, Clock, CheckCircle, XCircle, Loader2, List, AlertTriangle } from 'lucide-react';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { useZoomSync } from '@/hooks/useZoomSync';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ZoomSyncLog } from '@/types/zoom';
import { format, formatDistanceToNow, formatDuration, intervalToDuration } from 'date-fns';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
  const { data: history, isLoading, error } = useQuery({
    queryKey: ['zoom-sync-history', connection?.id],
    queryFn: async () => {
      if (!connection?.id) return [];
      const { data, error } = await supabase
        .from('zoom_sync_logs')
        .select('*')
        .eq('connection_id', connection.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw new Error(error.message);
      return data as ZoomSyncLog[];
    },
    enabled: !!connection?.id,
    refetchInterval: 5000, // Poll for history updates
  });

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Sync History & Logs</CardTitle>
            <CardDescription>Detailed history of your recent sync operations.</CardDescription>
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
            <AlertTitle>Sync in Progress</AlertTitle>
            <AlertDescription>
              A sync is currently running. This list will update automatically upon completion.
            </AlertDescription>
          </Alert>
        )}
        {isLoading && <p>Loading history...</p>}
        {error && <p className="text-red-500">Could not load sync history.</p>}
        {history && history.length === 0 && !isLoading && <p>No sync history found. Start a sync to see logs here.</p>}
        {history && history.length > 0 && (
          <Accordion type="single" collapsible className="w-full">
            {history.map((log) => (
              <AccordionItem value={log.id} key={log.id}>
                <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                            {getStatusIcon(log.sync_status)}
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
                                {getSyncDuration(log.started_at, log.completed_at)}
                            </span>
                        </div>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="bg-muted/50 p-4 rounded-md border-l-4">
                    <div className="grid grid-cols-3 gap-4 text-sm mb-2">
                        <div><span className="font-semibold">Processed:</span> {log.processed_items || 0} / {log.total_items || 0}</div>
                        <div><span className="font-semibold text-green-600">Successful:</span> {(log.processed_items || 0) - (log.failed_items || 0)}</div>
                        <div><span className="font-semibold text-red-600">Failed:</span> {log.failed_items || 0}</div>
                    </div>
                    {log.error_message && (
                        <Alert variant="destructive" className="mt-4">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{log.error_message}</AlertDescription>
                        </Alert>
                    )}
                     {log.error_details && typeof log.error_details === 'object' && Object.keys(log.error_details).length > 0 && (
                        <div className="mt-2">
                            <p className="text-sm font-semibold">Error Details:</p>
                            <pre className="text-xs bg-background p-2 rounded-md overflow-x-auto">
                                {JSON.stringify(log.error_details, null, 2)}
                            </pre>
                        </div>
                    )}
                    {log.sync_status === 'completed' && !log.error_message && (
                      <p className="text-sm text-muted-foreground mt-2">Sync completed successfully.</p>
                    )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
};

export default function SyncCenter() {
  const { isConnected, isLoading: isConnectionLoading } = useZoomConnection();

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
        <p className="text-gray-600">Monitor and manage your Zoom data synchronization.</p>
      </header>
      <main className="grid gap-6">
        <SyncAnalytics />
        <SyncHistory />
      </main>
    </div>
  );
}
