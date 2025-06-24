
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Info, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';

interface SyncStatusMessageProps {
  status: 'idle' | 'syncing' | 'completed' | 'failed' | 'no_data';
  message?: string;
  webinarCount?: number;
  lastSyncAt?: string;
}

export const SyncStatusMessage: React.FC<SyncStatusMessageProps> = ({
  status,
  message,
  webinarCount = 0,
  lastSyncAt
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'syncing':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'no_data':
        return <Info className="h-4 w-4 text-yellow-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusVariant = () => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'syncing':
        return 'default';
      case 'no_data':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusMessage = () => {
    if (message) return message;
    
    switch (status) {
      case 'completed':
        return webinarCount > 0 
          ? `Successfully synced ${webinarCount} webinars`
          : 'Sync completed - no webinars found in the specified date range';
      case 'failed':
        return 'Sync failed - please check your Zoom connection and try again';
      case 'syncing':
        return 'Syncing webinar data from Zoom...';
      case 'no_data':
        return 'No webinars found. This could mean:\n• Your Zoom account has no webinars in the last 90 days\n• Your Zoom app may not have the required permissions\n• Check your Zoom dashboard to verify webinar data exists';
      default:
        return 'Ready to sync webinar data';
    }
  };

  const formatLastSync = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Alert variant={getStatusVariant() as 'default' | 'destructive'}>
      {getStatusIcon()}
      <AlertDescription className="ml-2">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="whitespace-pre-line">{getStatusMessage()}</div>
            {lastSyncAt && status !== 'syncing' && (
              <div className="text-sm text-muted-foreground mt-1">
                Last synced: {formatLastSync(lastSyncAt)}
              </div>
            )}
          </div>
          <Badge variant="secondary" className="ml-2">
            {status === 'syncing' ? 'In Progress' : status.replace('_', ' ')}
          </Badge>
        </div>
      </AlertDescription>
    </Alert>
  );
};
