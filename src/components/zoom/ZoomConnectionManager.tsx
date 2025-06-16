
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Trash2, RefreshCw, Settings, AlertTriangle, CheckCircle } from 'lucide-react';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { useZoomCredentials } from '@/hooks/useZoomCredentials';
import { ZoomConnectionService } from '@/services/zoom/ZoomConnectionService';
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

  const getConnectionStatus = () => {
    if (!connection) {
      return { status: 'none', label: 'Not Connected', color: 'bg-gray-500' };
    }

    const isServerToServer = connection.connection_type === 'server_to_server';
    const hasCredentials = credentials?.client_id && credentials?.client_secret && credentials?.account_id;
    
    if (isServerToServer && hasCredentials) {
      return { status: 'valid', label: 'Server-to-Server Connected', color: 'bg-green-500' };
    }
    
    if (connection.connection_type === 'oauth' && connection.access_token?.length < 50) {
      return { status: 'invalid', label: 'Invalid OAuth Token', color: 'bg-red-500' };
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
      // Delete the invalid connection if it exists
      if (connection) {
        await ZoomConnectionService.deleteConnection(connection.id);
      }

      toast({
        title: "Connection Reset",
        description: "Invalid connection removed. Please validate your credentials to create a new connection.",
      });

      // Trigger refetch and reconfigure
      await refetch();
      onReconfigure?.();
    } catch (error) {
      console.error('Error fixing connection:', error);
      toast({
        title: "Error",
        description: "Failed to fix connection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsFixing(false);
    }
  };

  const connectionStatus = getConnectionStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Connection Status</span>
          <Badge className={`${connectionStatus.color} text-white`}>
            {connectionStatus.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {connection && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Connection Type</p>
              <p className="font-medium capitalize">{connection.connection_type || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-gray-600">Status</p>
              <p className="font-medium">{connection.connection_status}</p>
            </div>
            {connection.zoom_email && (
              <div className="col-span-2">
                <p className="text-gray-600">Zoom Account</p>
                <p className="font-medium">{connection.zoom_email}</p>
              </div>
            )}
          </div>
        )}

        {connectionStatus.status === 'invalid' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your Zoom connection has an invalid token. This typically happens when the connection 
              was created incorrectly. Click "Fix Connection" to reset and reconfigure.
            </AlertDescription>
          </Alert>
        )}

        {connectionStatus.status === 'none' && !credentials && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No Zoom credentials configured. Please set up your Server-to-Server OAuth app credentials first.
            </AlertDescription>
          </Alert>
        )}

        {connectionStatus.status === 'valid' && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Your Zoom integration is properly configured and ready to use.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          {connectionStatus.status === 'invalid' && (
            <Button 
              onClick={handleFixConnection}
              disabled={isFixing}
              variant="destructive"
              size="sm"
            >
              {isFixing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Fix Connection
            </Button>
          )}
          
          <Button
            onClick={onReconfigure}
            variant="outline"
            size="sm"
          >
            <Settings className="w-4 h-4 mr-2" />
            Configure
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
