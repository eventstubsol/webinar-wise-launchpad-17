
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw, Download, ServerCrash, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { useZoomSync } from '@/hooks/useZoomSync';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ZoomSyncLog } from '@/types/zoom';
import { format, formatDistanceToNow } from 'date-fns';

const SyncControls = () => {
  const { connection, isConnected, isLoading: isConnectionLoading } = useZoomConnection();
  const { startSync, isSyncing, syncProgress, currentOperation } = useZoomSync(connection?.id);

  if (isConnectionLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <Alert variant="destructive">
        <ServerCrash className="h-4 w-4" />
        <AlertTitle>Zoom Not Connected</AlertTitle>
        <AlertDescription>
          Please connect your Zoom account in settings to enable data synchronization.
        </AlertDescription>
      </Alert>
    );
  }

  if (isSyncing) {
    return (
      <div className="space-y-4 text-center">
        <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
        <h3 className="text-lg font-semibold">Sync in Progress...</h3>
        <p className="text-sm text-muted-foreground">{currentOperation}</p>
        <Progress value={syncProgress} className="w-full" />
        <p className="text-lg font-bold">{syncProgress}%</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-muted-foreground text-center">
        Keep your webinar data up-to-date. Use "Sync Recent" for new data or "Full Sync" for a complete historical import.
      </p>
      <div className="flex gap-4">
        <Button size="lg" onClick={() => startSync('incremental')} disabled={!isConnected || isSyncing}>
          <RefreshCw className="mr-2 h-4 w-4" /> Sync Recent Data
        </Button>
        <Button size="lg" variant="outline" onClick={() => startSync('initial')} disabled={!isConnected || isSyncing}>
          <Download className="mr-2 h-4 w-4" /> Full Sync
        </Button>
      </div>
    </div>
  );
};

const SyncHistory = () => {
  const { connection } = useZoomConnection();
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Sync Activity</CardTitle>
        <CardDescription>History of your last 10 sync operations.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <p>Loading history...</p>}
        {error && <p className="text-red-500">Could not load sync history.</p>}
        {history && history.length === 0 && <p>No sync history found.</p>}
        {history && history.length > 0 && (
          <ul className="space-y-4">
            {history.map((log) => (
              <li key={log.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(log.sync_status)}
                  <div>
                    <p className="font-medium capitalize">{log.sync_type} Sync</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                      {' ('}{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}{')'}
                    </p>
                  </div>
                </div>
                <Badge variant={log.sync_status === 'failed' ? 'destructive' : 'secondary'} className="capitalize">
                  {log.sync_status.replace('_', ' ')}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default function SyncCenter() {
  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Sync Center</h1>
        <p className="text-gray-600">Manage your Zoom data synchronization.</p>
      </header>
      <main className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Start New Sync</CardTitle>
            <CardDescription>
              Initiate a new data sync from your connected Zoom account.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <SyncControls />
          </CardContent>
        </Card>
        <div className="lg:col-span-3">
          <SyncHistory />
        </div>
      </main>
    </div>
  );
}
