
import React from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Download } from 'lucide-react';
import { ExportQueueItem } from '@/services/export/types';
import { formatDistanceToNow } from 'date-fns';

interface ExportQueueItemCardProps {
  item: ExportQueueItem;
  onDownload: (item: ExportQueueItem) => void;
}

const getStatusBadge = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800'
  };

  return (
    <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

const formatFileSize = (bytes?: number) => {
  if (bytes === undefined || bytes === null) return 'N/A';
  if (bytes === 0) return '0 Bytes';
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

export function ExportQueueItemCard({ item, onDownload }: ExportQueueItemCardProps) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h4 className="font-medium">{item.export_config.title}</h4>
          <p className="text-sm text-gray-600">
            {(item.export_type || 'N/A').toUpperCase()} • {formatDistanceToNow(new Date(item.created_at))} ago
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(item.status)}
        </div>
      </div>

      {item.status === 'processing' && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{item.progress_percentage}%</span>
          </div>
          <Progress value={item.progress_percentage} className="h-2" />
        </div>
      )}

      {item.status === 'completed' && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            File size: {formatFileSize(item.file_size)}
            {item.completed_at && (
              <> • Completed {formatDistanceToNow(new Date(item.completed_at))} ago</>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownload(item)}
              className="flex items-center gap-1"
              disabled={!item.file_url}
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
      )}

      {item.status === 'failed' && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <p className="text-sm text-red-800">
            <strong>Error:</strong> {item.error_message || 'Unknown error occurred'}
          </p>
        </div>
      )}

      {item.expires_at && new Date(item.expires_at) > new Date() && (
        <div className="text-xs text-gray-500">
          Expires {formatDistanceToNow(new Date(item.expires_at))} from now
        </div>
      )}
    </div>
  );
}
