import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Users, Play, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { toast } from 'sonner';

interface WebinarForSync {
  id: string;
  webinar_id: string;
  topic: string;
  start_time: string;
  participant_sync_status: string;
  participant_sync_attempted_at?: string;
}

interface SyncReport {
  webinarId: string;
  webinarDbId: string;
  title: string;
  success: boolean;
  participantsFetched: number;
  participantsBefore: number;
  participantsAfter: number;
  apiResponseTime: number | null;
  dbOperationTime: number | null;
  errorMessage?: string;
}

export function ParticipantSyncTester() {
  const { connection } = useZoomConnection();
  const queryClient = useQueryClient();
  const [selectedWebinars, setSelectedWebinars] = useState<string[]>([]);
  const [syncResults, setSyncResults] = useState<SyncReport[] | null>(null);

  // Fetch webinars for selection
  const { data: webinars, isLoading: webinarsLoading } = useQuery({
    queryKey: ['webinars-for-participant-sync', connection?.id],
    queryFn: async () => {
      if (!connection?.id) return [];

      const { data, error } = await supabase
        .from('zoom_webinars')
        .select('id, webinar_id, topic, start_time, participant_sync_status, participant_sync_attempted_at')
        .eq('connection_id', connection.id)
        .order('start_time', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as WebinarForSync[];
    },
    enabled: !!connection?.id,
  });

  // Participant sync mutation
  const syncMutation = useMutation({
    mutationFn: async (webinarIds: string[]) => {
      const { data, error } = await supabase.functions.invoke('zoom-sync-webinars', {
        body: {
          connectionId: connection?.id,
          syncType: 'participants_only',
          webinarIds: webinarIds,
          options: {
            forceSync: true,
            skipEligibilityCheck: true
          }
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success('Participant sync started successfully');
      
      // Poll for results
      const pollForResults = async () => {
        const syncId = data.syncId;
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes max

        const poll = async () => {
          try {
            const { data: syncLog } = await supabase
              .from('zoom_sync_logs')
              .select('*, error_details')
              .eq('id', syncId)
              .single();

            if (syncLog?.sync_status === 'completed') {
              // Get detailed results from error_details.participantsOnlyReport
              // Type the error_details as any to access the participantsOnlyReport property
              const errorDetails = syncLog.error_details as any;
              const report = errorDetails?.participantsOnlyReport;
              if (report?.results) {
                setSyncResults(report.results);
              }
              return;
            } else if (syncLog?.sync_status === 'failed') {
              toast.error('Participant sync failed');
              return;
            }

            attempts++;
            if (attempts < maxAttempts) {
              setTimeout(poll, 5000); // Poll every 5 seconds
            }
          } catch (error) {
            console.error('Error polling sync results:', error);
          }
        };

        poll();
      };

      pollForResults();
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`);
    }
  });

  const handleWebinarToggle = (webinarId: string) => {
    setSelectedWebinars(prev => 
      prev.includes(webinarId) 
        ? prev.filter(id => id !== webinarId)
        : [...prev, webinarId]
    );
  };

  const handleSelectAll = () => {
    if (selectedWebinars.length === webinars?.length) {
      setSelectedWebinars([]);
    } else {
      setSelectedWebinars(webinars?.map(w => w.webinar_id) || []);
    }
  };

  const handleStartSync = () => {
    if (selectedWebinars.length === 0) {
      toast.error('Please select at least one webinar');
      return;
    }
    setSyncResults(null);
    syncMutation.mutate(selectedWebinars);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'synced':
        return <Badge variant="secondary" className="text-green-700 bg-green-100">Synced</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'no_participants':
        return <Badge variant="outline" className="text-gray-500">No Participants</Badge>;
      case 'not_applicable':
        return <Badge variant="outline" className="text-gray-400">Not Applicable</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return 'N/A';
    return `${ms}ms`;
  };

  if (!connection) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Please connect your Zoom account first to use the participant sync tester.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Participant Sync Tester
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              This tool allows you to manually sync participant data for specific webinars. 
              It will force a fresh fetch even if participants were previously synced.
            </AlertDescription>
          </Alert>

          {/* Webinar Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Select Webinars to Sync</h3>
              {webinars && webinars.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedWebinars.length === webinars.length ? 'Deselect All' : 'Select All'}
                </Button>
              )}
            </div>

            {webinarsLoading ? (
              <div className="text-center py-4 text-muted-foreground">Loading webinars...</div>
            ) : !webinars || webinars.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">No webinars found</div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {webinars.map((webinar) => (
                  <div key={webinar.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      checked={selectedWebinars.includes(webinar.webinar_id)}
                      onCheckedChange={() => handleWebinarToggle(webinar.webinar_id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{webinar.topic}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(webinar.start_time).toLocaleDateString()} • ID: {webinar.webinar_id}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {getStatusBadge(webinar.participant_sync_status)}
                      {webinar.participant_sync_attempted_at && (
                        <div className="text-xs text-muted-foreground">
                          {new Date(webinar.participant_sync_attempted_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sync Controls */}
          <div className="flex items-center gap-4 pt-4 border-t">
            <Button
              onClick={handleStartSync}
              disabled={selectedWebinars.length === 0 || syncMutation.isPending}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {syncMutation.isPending ? 'Syncing...' : `Sync ${selectedWebinars.length} Webinar${selectedWebinars.length !== 1 ? 's' : ''}`}
            </Button>
            {syncMutation.isPending && (
              <div className="text-sm text-muted-foreground">
                Sync in progress... This may take a few minutes.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sync Results */}
      {syncResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Sync Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {syncResults.filter(r => r.success).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Successful</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {syncResults.filter(r => !r.success).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {syncResults.reduce((sum, r) => sum + r.participantsFetched, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Participants</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round(syncResults.reduce((sum, r) => sum + (r.apiResponseTime || 0), 0) / syncResults.length)}ms
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Response Time</div>
                </div>
              </div>

              <div className="space-y-2">
                {syncResults.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium truncate">{result.title}</div>
                      {result.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Participants:</span>
                        <div className="font-medium">{result.participantsFetched}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">API Time:</span>
                        <div className="font-medium">{formatDuration(result.apiResponseTime)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">DB Time:</span>
                        <div className="font-medium">{formatDuration(result.dbOperationTime)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Before/After:</span>
                        <div className="font-medium">{result.participantsBefore} → {result.participantsAfter}</div>
                      </div>
                    </div>

                    {result.errorMessage && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        {result.errorMessage}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
