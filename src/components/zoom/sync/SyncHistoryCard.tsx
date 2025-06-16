
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { SyncHistoryEntry } from '@/hooks/sync/types';
import { SyncStatus } from '@/types/zoom';
import { formatDistanceToNow } from 'date-fns';

interface SyncHistoryCardProps {
  syncHistory: SyncHistoryEntry[];
}

const getStatusIcon = (syncStatus: SyncStatus) => {
  switch (syncStatus) {
    case SyncStatus.IN_PROGRESS:
    case SyncStatus.STARTED:
      return <RefreshCw className="h-4 w-4 animate-spin" />;
    case SyncStatus.COMPLETED:
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case SyncStatus.FAILED:
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    case SyncStatus.CANCELLED:
      return <XCircle className="h-4 w-4 text-gray-600" />;
    default:
      return null;
  }
};

export const SyncHistoryCard: React.FC<SyncHistoryCardProps> = ({
  syncHistory,
}) => {
  if (syncHistory.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Recent Syncs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {syncHistory.slice(0, 5).map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between text-xs p-2 rounded bg-gray-50"
            >
              <div className="flex items-center gap-2">
                {getStatusIcon(entry.status)}
                <span className="capitalize">{entry.type}</span>
              </div>
              <div className="text-right text-muted-foreground">
                <div>{entry.itemsProcessed} items</div>
                <div>{formatDistanceToNow(new Date(entry.startedAt), { addSuffix: true })}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
