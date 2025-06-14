
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ExportQueueItem } from '@/services/export/types';
import { ExportHistoryProvider } from '@/services/export/history/ExportHistoryProvider';
import { useToast } from '@/components/ui/use-toast';
import { ExportQueueHeader } from './queue-monitor/ExportQueueHeader';
import { ExportQueueList } from './queue-monitor/ExportQueueList';

export function ExportQueueMonitor() {
  const [exportHistory, setExportHistory] = useState<ExportQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadExportHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const history = await ExportHistoryProvider.getExportHistory();
      setExportHistory(history);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to load export history: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadExportHistory();
  }, [loadExportHistory]);
  
  const handleDownload = (item: ExportQueueItem) => {
    if (item.file_url) {
      // In a real implementation, this would trigger a secure download
      window.open(item.file_url, '_blank');
      toast({
        title: "Downloading",
        description: `Starting download for: ${item.export_config.title}`,
      });
    } else {
      toast({
        title: "Download Unavailable",
        description: "File URL is not available for this export.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <ExportQueueHeader onRefresh={loadExportHistory} />
      <CardContent>
        <ExportQueueList
          exportHistory={exportHistory}
          isLoading={isLoading}
          onDownload={handleDownload}
        />
      </CardContent>
    </Card>
  );
}
