import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, Calendar, Users, Clock } from 'lucide-react';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function ZoomSyncCard() {
  const { connection, isConnected } = useZoomConnection();

  // Get sync statistics
  const { data: syncStats } = useQuery({
    queryKey: ['zoom-sync-stats', connection?.id],
    queryFn: async () => {
      if (!connection?.id) return null;

      const [webinarsResult, syncLogsResult] = await Promise.all([
        supabase
          .from('zoom_webinars')
          .select('id, synced_at', { count: 'exact' })
          .eq('connection_id', connection.id),
        supabase
          .from('zoom_sync_logs')
          .select('*')
          .eq('connection_id', connection.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
      ]);

      return {
        totalWebinars: webinarsResult.count || 0,
        lastSync: syncLogsResult.data?.completed_at || connection.last_sync_at,
        lastSyncStatus: syncLogsResult.data?.sync_status
      };
    },
    enabled: !!connection?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const formatLastSync = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'completed':
        return <Badge variant="secondary">Synced</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'in_progress':
        return <Badge variant="default">Syncing</Badge>;
      default:
        return <Badge variant="outline">Not Synced</Badge>;
    }
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Webinar Data Sync
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Connect your Zoom account to sync webinar data and view analytics.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Webinar Data Sync
          </div>
          {syncStats?.lastSyncStatus && getStatusBadge(syncStats.lastSyncStatus)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Webinars</p>
              <p className="font-medium">{syncStats?.totalWebinars || 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Last Sync</p>
              <p className="font-medium">{formatLastSync(syncStats?.lastSync || null)}</p>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t">
          <Button asChild variant="outline" size="sm">
            <Link to="/sync-center">
              Go to Sync Center
            </Link>
          </Button>
        </div>

        {syncStats?.totalWebinars === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              No webinar data found. Go to the Sync Center to import all your webinars from Zoom.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
