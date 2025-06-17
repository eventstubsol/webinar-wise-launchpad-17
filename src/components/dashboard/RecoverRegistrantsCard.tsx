
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Users, RefreshCw } from 'lucide-react';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { useSyncProgress } from '@/hooks/useSyncProgress';
import { SyncType } from '@/types/zoom';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function RecoverRegistrantsCard() {
  const { connection, isConnected } = useZoomConnection();
  const { startSync, isActive } = useSyncProgress(connection?.id || '');
  const [isRecovering, setIsRecovering] = useState(false);

  const handleRecoverRegistrants = async () => {
    if (!connection?.id) return;
    
    setIsRecovering(true);
    try {
      await startSync('registrants_only' as SyncType);
    } catch (error) {
      console.error('Failed to start registrants recovery:', error);
    } finally {
      setIsRecovering(false);
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertTriangle className="h-5 w-5" />
          Recover Missing Registrants
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Users className="h-4 w-4" />
          <AlertDescription>
            Some webinars are missing their registrant data. This recovery process will attempt to fetch 
            registrants for all your webinars using multiple Zoom API strategies.
          </AlertDescription>
        </Alert>

        <div className="text-sm text-gray-600">
          <p>This process will:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Check all 43 webinars for missing registrant data</li>
            <li>Try multiple API endpoints for each webinar</li>
            <li>Preserve existing webinar information</li>
            <li>Provide detailed progress reports</li>
          </ul>
        </div>

        <Button
          onClick={handleRecoverRegistrants}
          disabled={isActive || isRecovering}
          className="w-full"
          variant="default"
        >
          {isRecovering || isActive ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Recovery in Progress...
            </>
          ) : (
            <>
              <Users className="h-4 w-4 mr-2" />
              Start Registrants Recovery
            </>
          )}
        </Button>

        {isActive && (
          <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded">
            Recovery process is running. Check the sync progress indicator for detailed status updates.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
