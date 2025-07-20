
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Trash2, RefreshCw, Settings, AlertTriangle, CheckCircle, Wrench, Activity } from 'lucide-react';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { useZoomCredentials } from '@/hooks/useZoomCredentials';
import { ZoomConnectionService } from '@/services/zoom/ZoomConnectionService';
import { RenderConnectionService } from '@/services/zoom/RenderConnectionService';
import { useToast } from '@/hooks/use-toast';

interface ZoomConnectionManagerProps {
  onReconfigure?: () => void;
}

export const ZoomConnectionManager: React.FC<ZoomConnectionManagerProps> = ({
  onReconfigure
}) => {
  const { connection, isLoading, refetch } = useZoomConnection();
  const { credentials } = useZoomCredentials();
  const { toast } = useToast();
  const [isFixing, setIsFixing] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [connectionHealth, setConnectionHealth] = useState<any>(null);

  const getConnectionStatus = () => {
    const hasCredentials = credentials?.client_id && credentials?.client_secret && credentials?.account_id;
    
    if (hasCredentials) {
      if (connection) {
        if (connection.access_token && connection.access_token.length < 50) {
          return { status: 'invalid_oauth', label: 'Invalid OAuth Token', color: 'bg-red-500' };
        }
        if (connection.access_token?.length > 50) {
          return { status: 'valid', label: 'Connected (Render API)', color: 'bg-green-500' };
        }
      }
      return { status: 'needs_validation', label: 'Needs Validation', color: 'bg-yellow-500' };
    }
    
    if (!connection) {
      return { status: 'none', label: 'Not Connected', color: 'bg-gray-500' };
    }
    
    if (connection.access_token?.length < 50) {
      return { status: 'invalid_oauth', label: 'Invalid OAuth Token', color: 'bg-red-500' };
    }
    
    return { status: 'unknown', label: 'Connection Issue', color: 'bg-yellow-500' };
  };

  const handleFixConnection = async () => {
    if (!credentials) {
      toast({
        title: "Missing Credentials",
        description: "Please configure your Zoom credentials first.",
        variant: "destructive",
      });
      onReconfigure?.();
      return;
    }

    setIsFixing(true);
    try {
      if (connection) {
        await ZoomConnectionService.deleteConnection(connection.id);
        toast({
          title: "Invalid Connection Removed",
          description: "The invalid connection has been removed. Please validate your credentials again.",
        });
      }

      toast({
        title: "Ready for Validation",
        description: "Please use the validation button to establish a new connection via Render API.",
      });
    } catch (error) {
      console.error('Error fixing connection:', error);
      toast({
        title: "Fix Failed",
        description: "Failed to fix the connection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsFixing(false);
      refetch();
    }
  };

  const handleAutoRecover = async () => {
    if (!connection?.id) return;

    setIsRecovering(true);
    try {
      const recoveryResult = await RenderConnectionService.attemptConnectionRecovery(connection.id);
      
      if (recoveryResult.success) {
        toast({
          title: "Recovery Successful",
          description: "Your Zoom connection has been automatically recovered.",
        });
        refetch();
      } else {
        toast({
          title: "Recovery Failed",
          description: "Automatic recovery failed. Manual intervention required.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Auto-recovery error:', error);
      toast({
        title: "Recovery Error",
        description: "An error occurred during recovery.",
        variant: "destructive",
      });
    } finally {
      setIsRecovering(false);
    }
  };

  const checkConnectionHealth = async () => {
    if (!connection?.id) return;

    try {
      const health = await RenderConnectionService.checkConnectionHealth(connection.id);
      setConnectionHealth(health);
      
      toast({
        title: health.isHealthy ? "Connection Healthy" : "Connection Issues",
        description: health.isHealthy 
          ? "Your Zoom connection is working properly." 
          : "Connection issues detected. Consider using auto-recovery.",
        variant: health.isHealthy ? "default" : "destructive",
      });
    } catch (error) {
      console.error('Health check error:', error);
      toast({
        title: "Health Check Failed",
        description: "Unable to check connection health.",
        variant: "destructive",
      });
    }
  };

  const status = getConnectionStatus();
  const isConnected = status.status === 'valid';
  const hasInvalidConnection = status.status === 'invalid_oauth';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Connection Status</span>
            <div className="flex items-center gap-2">
              <Badge className={`${status.color} text-white`}>
                {status.label}
              </Badge>
              <Badge variant="outline" className="bg-blue-50">
                Render API
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnected ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Your Zoom account is connected and working properly through our Render API backend.
              </AlertDescription>
            </Alert>
          ) : hasInvalidConnection ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your connection has an invalid OAuth token. This usually happens with corrupted legacy connections.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {status.status === 'needs_validation' 
                  ? 'Your credentials are configured but need validation.'
                  : 'No Zoom connection detected.'
                }
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Account Email</p>
              <p className="font-medium">{connection?.zoom_email || 'Not connected'}</p>
            </div>
            <div>
              <p className="text-gray-600">Account Type</p>
              <p className="font-medium">{connection?.zoom_account_type || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-gray-600">Connection Type</p>
              <p className="font-medium">{connection?.connection_type || 'Not set'}</p>
            </div>
            <div>
              <p className="text-gray-600">Last Sync</p>
              <p className="font-medium">
                {connection?.last_sync_at 
                  ? new Date(connection.last_sync_at).toLocaleDateString()
                  : 'Never'
                }
              </p>
            </div>
          </div>

          {connectionHealth && (
            <div className="p-3 bg-gray-50 rounded text-sm">
              <p className="font-medium">Health Status: {connectionHealth.isHealthy ? 'Healthy' : 'Issues Detected'}</p>
              <p className="text-gray-600">Token Status: {connectionHealth.status}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>

            {connection && (
              <>
                <Button onClick={checkConnectionHealth} variant="outline" size="sm">
                  <Activity className="w-4 h-4 mr-2" />
                  Health Check
                </Button>

                <Button 
                  onClick={handleAutoRecover}
                  disabled={isRecovering}
                  variant="secondary" 
                  size="sm"
                >
                  {isRecovering ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Recovering...
                    </>
                  ) : (
                    <>
                      <Wrench className="w-4 h-4 mr-2" />
                      Auto-Recover
                    </>
                  )}
                </Button>
              </>
            )}

            {hasInvalidConnection && (
              <Button 
                onClick={handleFixConnection}
                disabled={isFixing}
                variant="destructive" 
                size="sm"
              >
                {isFixing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Fixing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Fix Connection
                  </>
                )}
              </Button>
            )}

            <Button onClick={onReconfigure} variant="ghost" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Configure
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Health Monitoring Info */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Monitoring</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            The new Render API backend provides enhanced connection monitoring and automatic recovery capabilities:
          </p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Real-time health monitoring</li>
            <li>• Automatic token refresh</li>
            <li>• Connection recovery mechanisms</li>
            <li>• Comprehensive error diagnostics</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
