
import React from 'react';
import { ExportQueueItem } from '@/services/export/types';
import { ExportQueueItemCard } from './ExportQueueItemCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface ExportQueueListProps {
  exportHistory: ExportQueueItem[];
  isLoading: boolean;
  onDownload: (item: ExportQueueItem) => void;
}

export function ExportQueueList({ exportHistory, isLoading, onDownload }: ExportQueueListProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner />
        <span className="ml-2 text-gray-500">Loading export history...</span>
      </div>
    );
  }

  if (exportHistory.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No exports found. Create your first report to get started!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {exportHistory.map((item) => (
        <ExportQueueItemCard
          key={item.id}
          item={item}
          onDownload={onDownload}
        />
      ))}
    </div>
  );
}
