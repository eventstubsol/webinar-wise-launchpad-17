import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Activity,
  TrendingUp,
  Database,
  Users,
  Calendar,
  AlertTriangle,
  Play,
  Pause,
  Settings,
  Calculator
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ZoomConnectionService } from '@/services/zoom/ZoomConnectionService';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { useWebinarMetricsUpdate } from '@/hooks/useWebinarMetricsUpdate';
import { SyncType, SyncStatus } from '@/types/zoom';
import { RealTimeSyncProgress } from '@/components/sync/RealTimeSyncProgress';
import { PerformanceMetricsDashboard } from '@/components/sync/PerformanceMetricsDashboard';
import { EnhancedSyncDashboard } from '@/components/zoom/EnhancedSyncDashboard';

interface SyncLogWithDetails {
  id: string;
  connection_id: string;
  sync_type: string;
  sync_status: string;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  total_items: number | null;
  processed_items: number | null;
  error_message: string | null;
  metadata: any;
  webinars_synced: number | null;
  // Note: current_webinar_id is not available in the database schema
  sync_stage: string | null;
  stage_progress_percentage: number | null;
}

interface SyncQueue {
  id: string;
  sync_id: string;
  webinar_id: string | null;
  webinar_title: string | null;
  status: string;
  queue_position: number;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  estimated_duration_seconds: number | null;
}

interface SyncMetrics {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageDuration: number;
  totalWebinarsSynced: number;
  lastSyncAt: string | null;
}

export default function SyncCenter() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { connection, isConnected } = useZoomConnection();
  const { 
    updateMetrics, 
    isUpdating,
    recoverMetrics,
    isRecovering,
    generateReport,
    isGeneratingReport,
    recoveryReport
  } = useWebinarMetricsUpdate();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch sync logs with enhanced details
  const { data: syncLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['sync-logs', connection?.id],
    queryFn: async () => {
      if (!connection?.id) return [];
      
      const { data, error } = await supabase
        .from('zoom_sync_logs')
        .select('*')
        .eq('connection_id', connection.id)
        .order('started_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching sync logs:', error);
        throw error;
      }

      return data as SyncLogWithDetails[];
    },
    enabled: !!connection?.id,
    refetchInterval: 5000,
  });

  // Fetch sync queue
  const { data: syncQueue = [], isLoading: queueLoading } = useQuery({
    queryKey: ['sync-queue', connection?.id],
    queryFn: async () => {
      if (!connection?.id) return [];
      
      // Get recent sync logs to find associated queue items
      const { data, error } = await supabase
        .from('sync_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching sync queue:', error);
        throw error;
      }

      return data as SyncQueue[];
    },
    enabled: !!connection?.id,
    refetchInterval: 3000,
  });

  // Calculate sync metrics
  const syncMetrics: SyncMetrics = React.useMemo(() => {
    const totalSyncs = syncLogs.length;
    const successfulSyncs = syncLogs.filter(log => log.sync_status === 'completed').length;
    const failedSyncs = syncLogs.filter(log => log.sync_status === 'failed').length;
    
    const completedSyncs = syncLogs.filter(log => log.duration_seconds !== null);
    const averageDuration = completedSyncs.length > 0 
      ? completedSyncs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0) / completedSyncs.length
      : 0;
    
    const totalWebinarsSynced = syncLogs.reduce((sum, log) => sum + (log.webinars_synced || 0), 0);
    const lastSyncAt = syncLogs.length > 0 ? syncLogs[0].started_at : null;

    return {
      totalSyncs,
      successfulSyncs,
      failedSyncs,
      averageDuration,
      totalWebinarsSynced,
      lastSyncAt,
    };
  }, [syncLogs]);

  // Start manual sync mutation
  const startSyncMutation = useMutation({
    mutationFn: async (syncType: SyncType) => {
      if (!connection?.id) throw new Error('No connection available');
      
      // This would typically call a sync service
      // For now, we'll just create a log entry to simulate starting a sync
      const { data, error } = await supabase
        .from('zoom_sync_logs')
        .insert({
          connection_id: connection.id,
          sync_type: syncType,
          sync_status: 'pending',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-logs'] });
      queryClient.invalidateQueries({ queryKey: ['sync-queue'] });
      toast({
        title: "Sync Started",
        description: "Your sync has been queued and will begin shortly.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync Failed to Start",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getSyncStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'running':
      case 'syncing':
        return <Badge className="bg-blue-100 text-blue-800">Running</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getCurrentSyncInfo = (log: SyncLogWithDetails) => {
    // Use metadata or sync_stage instead of current_webinar_id
    const currentStage = log.sync_stage || 'Unknown stage';
    const progress = log.stage_progress_percentage || 0;
    const processedItems = log.processed_items || 0;
    const totalItems = log.total_items || 0;
    
    return {
      stage: currentStage,
      progress,
      processedItems,
      totalItems,
      currentItem: `${processedItems}/${totalItems} items processed`
    };
  };

  // Handle metrics update
  const handleUpdateMetrics = () => {
    if (connection?.id) {
      updateMetrics(connection.id);
    }
  };

  // Handle metrics recovery
  const handleRecoverMetrics = () => {
    if (connection?.id) {
      recoverMetrics(connection.id);
    }
  };

  // Handle report generation
  const handleGenerateReport = () => {
    if (connection?.id) {
      generateReport(connection.id);
    }
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Sync Center</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage your Zoom data synchronization
          </p>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please connect your Zoom account first to access the Sync Center.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Sync Center</h1>
        <p className="text-muted-foreground mt-2">
          Monitor and manage your Zoom data synchronization
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="realtime">Real-time Sync</TabsTrigger>
          <TabsTrigger value="history">Sync History</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Activity className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold">{syncMetrics.totalSyncs}</p>
                    <p className="text-sm text-muted-foreground">Total Syncs</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold">{syncMetrics.successfulSyncs}</p>
                    <p className="text-sm text-muted-foreground">Successful</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-8 w-8 text-orange-600" />
                  <div>
                    <p className="text-2xl font-bold">{formatDuration(syncMetrics.averageDuration)}</p>
                    <p className="text-sm text-muted-foreground">Avg Duration</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Database className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold">{syncMetrics.totalWebinarsSynced}</p>
                    <p className="text-sm text-muted-foreground">Webinars Synced</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Metrics Management Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Webinar Metrics Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Standard Update */}
                <div className="flex flex-col space-y-2">
                  <h4 className="font-medium">Standard Update</h4>
                  <p className="text-sm text-muted-foreground">
                    Update metrics for webinars with zero attendees
                  </p>
                  <Button 
                    onClick={handleUpdateMetrics}
                    disabled={isUpdating}
                    size="sm"
                  >
                    {isUpdating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Calculator className="h-4 w-4 mr-2" />
                        Update Metrics
                      </>
                    )}
                  </Button>
                </div>

                {/* Recovery Process */}
                <div className="flex flex-col space-y-2">
                  <h4 className="font-medium">Smart Recovery</h4>
                  <p className="text-sm text-muted-foreground">
                    Fix webinars with participant data but zero metrics
                  </p>
                  <Button 
                    onClick={handleRecoverMetrics}
                    disabled={isRecovering}
                    variant="outline"
                    size="sm"
                  >
                    {isRecovering ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Recovering...
                      </>
                    ) : (
                      <>
                        <Settings className="h-4 w-4 mr-2" />
                        Recover Metrics
                      </>
                    )}
                  </Button>
                </div>

                {/* Diagnostics */}
                <div className="flex flex-col space-y-2">
                  <h4 className="font-medium">Diagnostics</h4>
                  <p className="text-sm text-muted-foreground">
                    Generate detailed metrics analysis report
                  </p>
                  <Button 
                    onClick={handleGenerateReport}
                    disabled={isGeneratingReport}
                    variant="outline"
                    size="sm"
                  >
                    {isGeneratingReport ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Activity className="h-4 w-4 mr-2" />
                        Generate Report
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Recovery Report */}
              {recoveryReport && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Recovery Results</h4>
                  <div className="text-sm space-y-1">
                    <p>✅ Fixed: {recoveryReport.totalFixed} webinars</p>
                    {recoveryReport.errors.length > 0 && (
                      <p>❌ Errors: {recoveryReport.errors.length}</p>
                    )}
                  </div>
                  {recoveryReport.errors.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-red-600">
                        View Errors ({recoveryReport.errors.length})
                      </summary>
                      <div className="mt-2 max-h-40 overflow-y-auto">
                        {recoveryReport.errors.map((error: string, index: number) => (
                          <div key={index} className="text-xs text-red-600 py-1 border-b">
                            {error}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Sync Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Sync Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : syncLogs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No sync history available</p>
              ) : (
                <div className="space-y-4">
                  {syncLogs.slice(0, 5).map((log) => {
                    const syncInfo = getCurrentSyncInfo(log);
                    return (
                      <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              {getSyncStatusBadge(log.sync_status)}
                              <span className="font-medium capitalize">{log.sync_type} Sync</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Started: {formatDateTime(log.started_at)}
                            </div>
                            {log.sync_status === 'running' && (
                              <div className="text-sm text-blue-600">
                                {syncInfo.stage} - {syncInfo.currentItem}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">
                            Duration: {formatDuration(log.duration_seconds)}
                          </div>
                          {log.webinars_synced && (
                            <div className="text-sm text-muted-foreground">
                              {log.webinars_synced} webinars
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="realtime" className="space-y-6">
          {/* Fixed: Remove connectionId prop and use correct interface */}
          <RealTimeSyncProgress connection={connection} />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Complete Sync History</CardTitle>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-2">
                  {syncLogs.map((log) => {
                    const syncInfo = getCurrentSyncInfo(log);
                    return (
                      <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-4">
                          <div>
                            {getSyncStatusBadge(log.sync_status)}
                          </div>
                          <div>
                            <div className="font-medium capitalize">{log.sync_type} Sync</div>
                            <div className="text-sm text-muted-foreground">
                              {formatDateTime(log.started_at)}
                              {log.completed_at && ` - ${formatDateTime(log.completed_at)}`}
                            </div>
                            {log.error_message && (
                              <div className="text-sm text-red-600 mt-1">
                                Error: {log.error_message}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">
                            Duration: {formatDuration(log.duration_seconds)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {log.processed_items || 0}/{log.total_items || 0} items
                          </div>
                          {log.webinars_synced && (
                            <div className="text-sm text-muted-foreground">
                              {log.webinars_synced} webinars
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {isConnected && connection && (
            <PerformanceMetricsDashboard 
              connectionId={connection.id}
              userId={connection.user_id}
            />
          )}
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <EnhancedSyncDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
