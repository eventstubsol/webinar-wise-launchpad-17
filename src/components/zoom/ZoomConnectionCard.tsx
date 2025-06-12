
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Video, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Unlink,
  Clock,
  Users
} from 'lucide-react';
import { ZoomConnection } from '@/types/zoom';
import { useZoom } from '@/hooks/useZoom';

interface ZoomConnectionCardProps {
  connection?: ZoomConnection | null;
  dashboardStats: {
    totalWebinars: number;
    totalRegistrants: number;
    totalAttendees: number;
    avgAttendanceRate: number;
    hasActiveConnection: boolean;
    lastSyncAt: string | null;
  };
}

export const ZoomConnectionCard: React.FC<ZoomConnectionCardProps> = ({ 
  connection, 
  dashboardStats 
}) => {
  const { initiateZoomOAuth, disconnectZoom, loading } = useZoom();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'expired':
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatLastSync = (lastSync: string | null) => {
    if (!lastSync) return 'Never';
    
    const syncDate = new Date(lastSync);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - syncDate.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Less than 1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  if (!connection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Video className="w-5 h-5 text-blue-600" />
            <span>Zoom Integration</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Video className="h-4 w-4" />
            <AlertDescription>
              Connect your Zoom account to start analyzing your webinar data and generating insights.
            </AlertDescription>
          </Alert>
          
          <div className="mt-4">
            <Button onClick={initiateZoomOAuth} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Video className="w-4 h-4 mr-2" />
                  Connect Zoom Account
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Video className="w-5 h-5 text-blue-600" />
            <span>Zoom Integration</span>
          </div>
          <Badge className={getStatusColor(connection.connection_status)}>
            {getStatusIcon(connection.connection_status)}
            <span className="ml-1 capitalize">{connection.connection_status}</span>
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Info */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Account:</span>
            <span className="font-medium">{connection.zoom_email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Plan:</span>
            <span className="font-medium capitalize">{connection.zoom_account_type || 'Unknown'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Last Sync:</span>
            <span className="font-medium">{formatLastSync(dashboardStats.lastSyncAt)}</span>
          </div>
        </div>

        {/* Quick Stats */}
        {dashboardStats.hasActiveConnection && (
          <div className="grid grid-cols-2 gap-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-900">{dashboardStats.totalWebinars}</div>
              <div className="text-xs text-blue-600">Webinars</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-900">{dashboardStats.totalAttendees}</div>
              <div className="text-xs text-blue-600">Attendees</div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" className="flex-1">
            <RefreshCw className="w-4 h-4 mr-1" />
            Sync Now
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => connection.id && disconnectZoom(connection.id)}
            className="text-red-600 hover:text-red-700"
          >
            <Unlink className="w-4 h-4 mr-1" />
            Disconnect
          </Button>
        </div>

        {/* Status Alerts */}
        {connection.connection_status === 'expired' && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Your Zoom connection has expired. Please reconnect to continue syncing data.
            </AlertDescription>
          </Alert>
        )}

        {connection.connection_status === 'error' && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              There was an error with your Zoom connection. Please check your settings or reconnect.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
