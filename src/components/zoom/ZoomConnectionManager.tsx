
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
    // If we have Server-to-Server credentials, that's the preferred connection type
    const hasCredentials = credentials?.client_id && credentials?.client_secret && credentials?.account_id;
    
    if (hasCredentials) {
      // Check if the existing connection is valid for Server-to-Server
      if (connection) {
        // Check for invalid OAuth token (short tokens are corrupted OAuth tokens)
        if (connection.access_token && connection.access_token.length < 50) {
          return { status: 'invalid_oauth', label: 'Invalid OAuth Token', color: 'bg-red-500' };
        }
        // Check if it's a proper Server-to-Server connection
        if (connection.access_token?.length > 50) {
          return { status: 'valid', label: 'Server-to-Server Connected', color: 'bg-green-500' };
        }
      }
      return { status: 'needs_validation', label: 'Needs Validation', color: 'bg-yellow-500' };
    }
    
    if (!connection) {
      return { status: 'none', label: 'Not Connected', color: 'bg-gray-500' };
    }
    
    // Check for invalid OAuth token
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
      // Delete the invalid connection if it exists
      if (connection) {
        await ZoomConnectionService.deleteConnection(connection.id);
        toast({
          title: "Invalid Connection Removed",
          description: "The invalid OAuth connection has been deleted.",
        });
      }

      // Trigger refetch to clear the connection state
      await refetch();
      
      toast({
        title: "Ready for Validation",
        description: "Please click 'Validate Connection' to create a new Server-to-Server connection.",
      });

      // Trigger reconfigure to show the validation button
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
              <p className="text-gray-600">Connection Status</p>
              <p className="font-medium">{connection.connection_status}</p>
            </div>
            <div>
              <p className="text-gray-600">Token Length</p>
              <p className="font-medium">{connection.access_token?.length || 0} chars</p>
            </div>
            {connection.zoom_email && (
              <div className="col-span-2">
                <p className="text-gray-600">Zoom Account</p>
                <p className="font-medium">{connection.zoom_email}</p>
              </div>
            )}
          </div>
        )}

        {/* Status-specific alerts */}
        {connectionStatus.status === 'invalid_oauth' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your Zoom connection has an invalid OAuth token (corrupted data). 
              Click "Fix Connection" to remove it and enable Server-to-Server validation.
            </AlertDescription>
          </Alert>
        )}

        {connectionStatus.status === 'needs_validation' && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Server-to-Server credentials are configured but not validated. 
              Use the "Configure" button to validate your connection.
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
          {connectionStatus.status === 'invalid_oauth' && (
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
