
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, AlertTriangle } from 'lucide-react';

interface SyncControlsCardProps {
  selectedWebinars: string[];
  syncInProgress: boolean;
  onStartSync: () => void;
}

export function SyncControlsCard({
  selectedWebinars,
  syncInProgress,
  onStartSync
}: SyncControlsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Sync Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This tool allows you to manually sync participant data for specific webinars. 
            It will force a fresh fetch even if participants were previously synced.
          </AlertDescription>
        </Alert>

        <div className="flex items-center gap-4 pt-4 border-t">
          <Button
            onClick={onStartSync}
            disabled={selectedWebinars.length === 0 || syncInProgress}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            {syncInProgress ? 'Syncing...' : `Sync ${selectedWebinars.length} Webinar${selectedWebinars.length !== 1 ? 's' : ''}`}
          </Button>
          {syncInProgress && (
            <div className="text-sm text-muted-foreground">
              Sync in progress... This may take a few minutes.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
