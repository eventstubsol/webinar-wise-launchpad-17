import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trash2, Download, Eye, RefreshCw } from 'lucide-react';
import { ExportQueueItem } from '@/services/export/types';
import { ExportHistoryProvider } from '@/services/export/history/ExportHistoryProvider';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';

export function ExportQueueMonitor() {
  const [exportHistory, setExportHistory] = useState<ExportQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadExportHistory = async () => {
    setIsLoading(true); // Ensure loading state is set at the beginning
    try {
      const history = await ExportHistoryProvider.getExportHistory();
      setExportHistory(history);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load export history",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExportHistory();
  }, []);

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'default',
      processing: 'secondary',
      completed: 'default',
      failed: 'destructive',
      cancelled: 'outline'
    } as const;

    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };

    return (
      <Badge className={colors[status as keyof typeof colors]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDownload = (item: ExportQueueItem) => {
    if (item.file_url) {
      // In a real implementation, this would download the file
      window.open(item.file_url, '_blank');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">Loading export history...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Export Queue & History</CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadExportHistory}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {exportHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No exports found. Create your first report to get started!
          </div>
        ) : (
          <div className="space-y-4">
            {exportHistory.map((item) => (
              <div 
                key={item.id} 
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-medium">{item.export_config.title}</h4>
                    <p className="text-sm text-gray-600">
                      {item.export_type.toUpperCase()} • {formatDistanceToNow(new Date(item.created_at))} ago
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
                        onClick={() => handleDownload(item)}
                        className="flex items-center gap-1"
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
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
