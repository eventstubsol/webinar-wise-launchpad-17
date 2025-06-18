import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, Calendar, Users, Clock, AlertTriangle, Settings, CheckCircle, XCircle } from 'lucide-react';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function ZoomSyncCard() {
  const { connection, isConnected, isExpired } = useZoomConnection();

  // Get sync statistics including participant sync status
  const { data: syncStats } = useQuery({
    queryKey: ['zoom-sync-stats', connection?.id],
    queryFn: async () => {
      if (!connection?.id) return null;

      try {
        const [webinarsResult, syncLogsResult, participantStatsResult] = await Promise.all([
          supabase
            .from('zoom_webinars')
            .select('id, synced_at, participant_sync_status', { count: 'exact' })
            .eq('connection_id', connection.id),
          supabase
            .from('zoom_sync_logs')
            .select('*')
            .eq('connection_id', connection.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('zoom_webinars')
            .select('participant_sync_status', { count: 'exact' })
            .eq('connection_id', connection.id)
        ]);

        // Calculate participant sync statistics
        const participantSyncStats = participantStatsResult.data?.reduce((acc: any, webinar: any) => {
          const status = webinar.participant_sync_status || 'pending';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {}) || {};

        return {
          totalWebinars: webinarsResult.count || 0,
          lastSync: syncLogsResult.data?.completed_at || connection.last_sync_at,
          lastSyncStatus: syncLogsResult.data?.sync_status,
          lastSyncError: syncLogsResult.data?.error_message,
          lastSyncErrorDetails: syncLogsResult.data?.error_details,
          participantSyncStats: participantSyncStats,
        };
      } catch (error) {
        console.error('Error fetching sync stats:', error);
        return {
          totalWebinars: 0,
          lastSync: null,
          lastSyncStatus: null,
          lastSyncError: null,
          lastSyncErrorDetails: null,
          participantSyncStats: {},
        };
      }
    },
    enabled: !!connection?.id,
    refetchInterval: 60000, // Increased from 30s to 60s to reduce polling
    retry: (failureCount, error) => {
      const hasStatus = error && typeof error === 'object' && 'status' in error;
      const status = hasStatus ? (error as any).status : null;
      
      if (typeof status === 'number' && status >= 400 && status < 500) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 30000, // Add stale time to reduce unnecessary fetches
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

  const getStatusBadge = (status: string | undefined | null) => {
    switch (status) {
      case 'completed':
        return <Badge variant="secondary">Synced</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'in_progress':
      case 'started':
        return <Badge variant="default">Syncing</Badge>;
      default:
        return <Badge variant="outline">Not Synced</Badge>;
    }
  };

  const getParticipantSyncStatusIcon = (status: string, count: number) => {
    switch (status) {
      case 'synced':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'failed':
        return <XCircle className="h-3 w-3 text-red-500" />;
      case 'no_participants':
        return <Users className="h-3 w-3 text-gray-400" />;
      case 'pending':
        return <Clock className="h-3 w-3 text-yellow-500" />;
      case 'not_applicable':
        return <Calendar className="h-3 w-3 text-gray-400" />;
      default:
        return <Clock className="h-3 w-3 text-gray-400" />;
    }
  };

  const isAuthError = isExpired || (syncStats?.lastSyncErrorDetails && (syncStats.lastSyncErrorDetails as any).isAuthError);

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Webinar Data Sync
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Connect your Zoom account to sync webinar data and view analytics.
          </p>
          <Button asChild variant="default" size="sm">
            <Link to="/settings">
              <Settings className="w-4 h-4 mr-2" />
              Connect Zoom Account
            </Link>
          </Button>
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
          {isAuthError ? (
            <Badge variant="destructive">Reconnect Required</Badge>
          ) : (
            syncStats?.lastSyncStatus && getStatusBadge(syncStats.lastSyncStatus)
          )}
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

        {/* Participant Sync Status Summary */}
        {syncStats?.participantSyncStats && Object.keys(syncStats.participantSyncStats).length > 0 && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">Participant Sync Status</p>
            <div className="space-y-1">
              {Object.entries(syncStats.participantSyncStats).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {getParticipantSyncStatusIcon(status, count as number)}
                    <span className="capitalize">{status.replace('_', ' ')}</span>
                  </div>
                  <span className="font-medium">{count as number}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Show authentication error prominently */}
        {isAuthError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-red-800 font-medium">Connection Expired</p>
                <p className="text-red-700">Your Zoom authentication has expired. Please reconnect your account to resume syncing.</p>
                <Button asChild variant="outline" size="sm" className="mt-2 bg-white hover:bg-gray-50">
                  <Link to="/settings">
                    Reconnect Zoom Account
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Show other error messages if last sync failed */}
        {syncStats?.lastSyncStatus === 'failed' && !isAuthError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-red-800 font-medium">Last sync failed</p>
                <p className="text-red-700">{syncStats.lastSyncError || 'An unknown error occurred.'}</p>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 border-t">
          <Button asChild variant="outline" size="sm">
            <Link to="/sync-center">
              Go to Sync Center
            </Link>
          </Button>
        </div>

        {syncStats?.totalWebinars === 0 && !isAuthError && (
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
