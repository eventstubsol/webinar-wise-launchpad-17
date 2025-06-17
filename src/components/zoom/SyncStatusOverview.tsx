
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useZoomConnection } from '@/hooks/useZoomConnection';

export function SyncStatusOverview() {
  const { connection } = useZoomConnection();

  const { data: syncStats, isLoading } = useQuery({
    queryKey: ['sync-overview', connection?.id],
    queryFn: async () => {
      if (!connection?.id) return null;

      const { data: recentSyncs, error } = await supabase
        .from('zoom_sync_logs')
        .select('sync_status, sync_type, started_at, completed_at')
        .eq('connection_id', connection.id)
        .order('started_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const stats = {
        totalSyncs: recentSyncs?.length || 0,
        completedSyncs: recentSyncs?.filter(s => s.sync_status === 'completed').length || 0,
        failedSyncs: recentSyncs?.filter(s => s.sync_status === 'failed').length || 0,
        inProgressSyncs: recentSyncs?.filter(s => s.sync_status === 'in_progress').length || 0,
        lastSyncAt: recentSyncs?.[0]?.started_at,
        lastSyncStatus: recentSyncs?.[0]?.sync_status
      };

      return stats;
    },
    enabled: !!connection?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Loading sync overview...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Syncs</CardTitle>
          <RotateCcw className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{syncStats?.totalSyncs || 0}</div>
          <p className="text-xs text-muted-foreground">Last 10 operations</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{syncStats?.completedSyncs || 0}</div>
          <p className="text-xs text-muted-foreground">Successful syncs</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Failed</CardTitle>
          <XCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{syncStats?.failedSyncs || 0}</div>
          <p className="text-xs text-muted-foreground">Failed operations</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {syncStats?.lastSyncStatus && (
              <Badge variant={syncStats.lastSyncStatus === 'completed' ? 'secondary' : 'destructive'}>
                {syncStats.lastSyncStatus}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {syncStats?.lastSyncAt 
              ? new Date(syncStats.lastSyncAt).toLocaleString()
              : 'No syncs yet'
            }
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
