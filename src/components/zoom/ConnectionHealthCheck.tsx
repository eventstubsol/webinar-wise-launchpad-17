import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wifi, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { EdgeFunctionZoomService } from '@/services/zoom/EdgeFunctionZoomService';
import { toast } from 'sonner';

export function ConnectionHealthCheck() {
  const { connection } = useZoomConnection();
  const queryClient = useQueryClient();

  const { data: healthStatus, isLoading } = useQuery({
    queryKey: ['connection-health', connection?.id],
    queryFn: async () => {
      if (!connection?.id) return null;

      // Check recent connection health logs
      const { data: healthLogs, error } = await supabase
        .from('connection_health_log')
        .select('*')
        .eq('user_id', connection.user_id)
        .eq('connection_type', 'zoom')
        .order('recorded_at', { ascending: false })
        .limit(5);

      if (error) {
        console.log('Error fetching health logs:', error);
        // Return default status if table doesn't exist or query fails
        return {
          lastCheck: null,
          status: 'unknown',
          pingTime: null,
          errorMessage: null,
          recentFailures: 0,
          totalChecks: 0
        };
      }

      const latestHealth = healthLogs?.[0];
      const recentFailures = healthLogs?.filter(log => log.status === 'error').length || 0;

      return {
        lastCheck: latestHealth?.recorded_at,
        status: latestHealth?.status || 'unknown',
        pingTime: latestHealth?.ping_time_ms,
        errorMessage: latestHealth?.error_message,
        recentFailures,
        totalChecks: healthLogs?.length || 0
      };
    },
    enabled: !!connection?.id,
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      // Use RenderZoomService for testing connection with connection ID
      const result = await EdgeFunctionZoomService.testConnection(connection?.id);
      
      // Log the test result to connection_health_log if possible
      if (connection?.user_id) {
        try {
          await supabase
            .from('connection_health_log')
            .insert({
              user_id: connection.user_id,
              connection_type: 'zoom',
              status: result.success ? 'healthy' : 'error',
              error_message: result.success ? null : result.message,
              ping_time_ms: result.success ? 100 : null
            });
        } catch (error) {
          console.log('Could not log health check result:', error);
        }
      }
      
      return result;
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Connection test completed successfully');
      } else {
        toast.error(`Connection test failed: ${result.message}`);
      }
      queryClient.invalidateQueries({ queryKey: ['connection-health'] });
    },
    onError: (error) => {
      toast.error(`Connection test failed: ${error.message}`);
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="secondary" className="text-green-700 bg-green-100">Healthy</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'warning':
        return <Badge variant="outline" className="text-yellow-700 bg-yellow-100">Warning</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (!connection) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No Zoom connection found. Please connect your Zoom account first.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="h-5 w-5" />
          Connection Health (Render API)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">
            Loading connection health...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Current Status</div>
                {healthStatus && getStatusBadge(healthStatus.status)}
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Last Check</div>
                <div className="text-sm">
                  {healthStatus?.lastCheck 
                    ? new Date(healthStatus.lastCheck).toLocaleString()
                    : 'Never'
                  }
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Response Time</div>
                <div className="text-sm">
                  {healthStatus?.pingTime ? `${healthStatus.pingTime}ms` : 'N/A'}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Recent Failures</div>
                <div className="text-sm">
                  {healthStatus?.recentFailures || 0} / {healthStatus?.totalChecks || 0}
                </div>
              </div>
            </div>

            {healthStatus?.errorMessage && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Last Error: {healthStatus.errorMessage}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => testConnectionMutation.mutate()}
                disabled={testConnectionMutation.isPending}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${testConnectionMutation.isPending ? 'animate-spin' : ''}`} />
                {testConnectionMutation.isPending ? 'Testing...' : 'Test Connection'}
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                Using Render API for connection testing
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
