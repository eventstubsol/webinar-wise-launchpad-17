
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useZoomConnection } from '@/hooks/useZoomConnection';

export function SyncHistoryTable() {
  const { connection } = useZoomConnection();

  const { data: syncHistory, isLoading } = useQuery({
    queryKey: ['sync-history', connection?.id],
    queryFn: async () => {
      if (!connection?.id) return [];

      const { data, error } = await supabase
        .from('zoom_sync_logs')
        .select('*')
        .eq('connection_id', connection.id)
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!connection?.id,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="secondary" className="text-green-700 bg-green-100">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="text-blue-700 bg-blue-100">In Progress</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDuration = (started: string, completed: string | null) => {
    if (!completed) return 'N/A';
    const start = new Date(started);
    const end = new Date(completed);
    const diff = end.getTime() - start.getTime();
    return `${Math.round(diff / 1000)}s`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Loading sync history...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Sync History</CardTitle>
      </CardHeader>
      <CardContent>
        {!syncHistory || syncHistory.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No sync history found
          </div>
        ) : (
          <div className="space-y-4">
            {syncHistory.map((sync) => (
              <div key={sync.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{sync.sync_type}</span>
                    {getStatusBadge(sync.sync_status)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Started: {new Date(sync.started_at).toLocaleString()}
                  </div>
                  {sync.error_message && (
                    <div className="text-sm text-red-600 mt-1">
                      Error: {sync.error_message}
                    </div>
                  )}
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <div>Duration: {formatDuration(sync.started_at, sync.completed_at)}</div>
                  {sync.processed_items !== null && (
                    <div>Items: {sync.processed_items}/{sync.total_items}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
