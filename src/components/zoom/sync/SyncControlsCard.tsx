
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';
import { SyncType } from '@/types/zoom';

interface SyncControlsCardProps {
  onStartSync: (type: SyncType) => void;
}

export const SyncControlsCard: React.FC<SyncControlsCardProps> = ({
  onStartSync,
}) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Sync Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onStartSync(SyncType.INCREMENTAL)}
          className="w-full"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Quick Sync
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onStartSync(SyncType.INITIAL)}
          className="w-full"
        >
          Full Sync
        </Button>
      </CardContent>
    </Card>
  );
};
