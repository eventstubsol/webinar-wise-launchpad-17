
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Users, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface ParticipantSyncDebugPanelProps {
  connectionId: string;
}

export const ParticipantSyncDebugPanel: React.FC<ParticipantSyncDebugPanelProps> = ({ 
  connectionId 
}) => {
  const queryClient = useQueryClient();
  const [retryingWebinarId, setRetryingWebinarId] = useState<string | null>(null);

  // Get webinars with participant sync status
  const { data: webinars, isLoading } = useQuery({
    queryKey: ['webinars-participant-status', connectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('zoom_webinars')
        .select(`
          id,
          webinar_id,
          topic,
          status,
          start_time,
          participant_sync_status,
          participant_sync_error,
          participant_sync_attempted_at
        `)
        .eq('connection_id', connectionId)
        .order('start_time', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Get participant counts
  const { data: participantCounts } = useQuery({
    queryKey: ['participant-counts', connectionId],
    queryFn: async () => {
      const webinarIds = webinars?.map(w => w.id) || [];
      if (webinarIds.length === 0) return {};

      const { data, error } = await supabase
        .from('zoom_participants')
        .select('webinar_id')
        .in('webinar_id', webinarIds);
      
      if (error) throw error;
      
      // Count participants per webinar
      const counts: Record<string, number> = {};
      data?.forEach(p => {
        counts[p.webinar_id] = (counts[p.webinar_id] || 0) + 1;
      });
      
      return counts;
    },
    enabled: !!webinars && webinars.length > 0,
  });

  // Retry participant sync mutation
  const retryParticipantSync = useMutation({
    mutationFn: async (webinarId: string) => {
      const webinar = webinars?.find(w => w.webinar_id === webinarId);
      if (!webinar) throw new Error('Webinar not found');

      setRetryingWebinarId(webinarId);

      // Reset status to pending
      const { error: updateError } = await supabase
        .from('zoom_webinars')
        .update({
          participant_sync_status: 'pending',
          participant_sync_error: null,
          participant_sync_attempted_at: new Date().toISOString()
        })
        .eq('id', webinar.id);

      if (updateError) throw updateError;

      // Trigger sync via edge function
      const { data, error } = await supabase.functions.invoke('zoom-sync-webinars', {
        body: {
          connectionId: connectionId,
          syncType: 'single',
          webinarId: webinarId,
          options: {
            forceParticipantSync: true,
            verboseLogging: true
          }
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, webinarId) => {
      toast.success('Participant sync started for webinar');
      queryClient.invalidateQueries({ queryKey: ['webinars-participant-status'] });
      queryClient.invalidateQueries({ queryKey: ['participant-counts'] });
      setRetryingWebinarId(null);
    },
    onError: (error, webinarId) => {
      toast.error(`Failed to start participant sync: ${error.message}`);
      setRetryingWebinarId(null);
    },
  });

  // Bulk retry for failed webinars
  const retryAllFailed = useMutation({
    mutationFn: async () => {
      const failedWebinars = webinars?.filter(w => 
        w.participant_sync_status === 'failed' && 
        w.status === 'finished'
      ) || [];

      if (failedWebinars.length === 0) {
        throw new Error('No failed finished webinars to retry');
      }

      // Reset all failed webinars to pending
      const { error: updateError } = await supabase
        .from('zoom_webinars')
        .update({
          participant_sync_status: 'pending',
          participant_sync_error: null,
          participant_sync_attempted_at: new Date().toISOString()
        })
        .in('id', failedWebinars.map(w => w.id));

      if (updateError) throw updateError;

      // Trigger bulk sync
      const { data, error } = await supabase.functions.invoke('zoom-sync-webinars', {
        body: {
          connectionId: connectionId,
          syncType: 'participants_only',
          options: {
            webinarIds: failedWebinars.map(w => w.webinar_id),
            forceSync: true,
            verboseLogging: true
          }
        }
      });

      if (error) throw error;
      return { count: failedWebinars.length, data };
    },
    onSuccess: (result) => {
      toast.success(`Started participant sync for ${result.count} failed webinars`);
      queryClient.invalidateQueries({ queryKey: ['webinars-participant-status'] });
    },
    onError: (error) => {
      toast.error(`Failed to start bulk retry: ${error.message}`);
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'synced':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'no_participants':
        return <Users className="h-4 w-4 text-gray-400" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'synced':
        return <Badge variant="secondary">Synced</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="default">Pending</Badge>;
      case 'no_participants':
        return <Badge variant="outline">No Participants</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const failedCount = webinars?.filter(w => w.participant_sync_status === 'failed').length || 0;
  const finishedWithNoParticipants = webinars?.filter(w => 
    w.status === 'finished' && 
    w.participant_sync_status === 'synced' &&
    (participantCounts?.[w.id] || 0) === 0
  ).length || 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Participant Sync Debug</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Participant Sync Debug Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 border rounded">
            <div className="text-2xl font-bold">{failedCount}</div>
            <div className="text-sm text-muted-foreground">Failed Syncs</div>
          </div>
          <div className="text-center p-4 border rounded">
            <div className="text-2xl font-bold">{finishedWithNoParticipants}</div>
            <div className="text-sm text-muted-foreground">Finished w/ 0 Participants</div>
          </div>
          <div className="text-center p-4 border rounded">
            <div className="text-2xl font-bold">
              {Object.values(participantCounts || {}).reduce((sum, count) => sum + count, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Participants</div>
          </div>
        </div>

        {/* Bulk Actions */}
        {failedCount > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{failedCount} webinars have failed participant sync</span>
              <Button
                size="sm"
                onClick={() => retryAllFailed.mutate()}
                disabled={retryAllFailed.isPending}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${retryAllFailed.isPending ? 'animate-spin' : ''}`} />
                Retry All Failed
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Webinar List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {webinars?.map((webinar) => (
            <div key={webinar.id} className="flex items-center justify-between p-3 border rounded">
              <div className="flex-1">
                <div className="font-medium truncate">{webinar.topic}</div>
                <div className="text-sm text-muted-foreground">
                  {webinar.status} • {new Date(webinar.start_time).toLocaleDateString()}
                  {participantCounts && (
                    <span className="ml-2">• {participantCounts[webinar.id] || 0} participants</span>
                  )}
                </div>
                {webinar.participant_sync_error && (
                  <div className="text-xs text-red-600 mt-1">
                    {webinar.participant_sync_error}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {getStatusIcon(webinar.participant_sync_status)}
                {getStatusBadge(webinar.participant_sync_status)}
                
                {(webinar.participant_sync_status === 'failed' || 
                  (webinar.status === 'finished' && (participantCounts?.[webinar.id] || 0) === 0)) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => retryParticipantSync.mutate(webinar.webinar_id)}
                    disabled={retryingWebinarId === webinar.webinar_id}
                  >
                    <RefreshCw className={`h-3 w-3 ${retryingWebinarId === webinar.webinar_id ? 'animate-spin' : ''}`} />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
