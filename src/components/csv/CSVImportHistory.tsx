
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Download, FileText, AlertCircle } from 'lucide-react';
import { useCSVImports } from '@/hooks/useCSVImports';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export function CSVImportHistory() {
  const { imports, loading, error, deleteImport } = useCSVImports();
  const { toast } = useToast();

  const handleDelete = async (importId: string) => {
    try {
      await deleteImport(importId);
      toast({
        title: "Import deleted",
        description: "CSV import record has been deleted",
      });
    } catch (error) {
      toast({
        title: "Error deleting import",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      processing: 'secondary',
      completed: 'default',
      failed: 'destructive',
      cancelled: 'outline'
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-red-600">
            <AlertCircle className="w-5 h-5 mr-2" />
            Error loading import history: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>CSV Import History</CardTitle>
      </CardHeader>
      <CardContent>
        {imports.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No CSV imports yet</p>
            <p className="text-sm">Upload your first CSV file to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {imports.map((importRecord) => (
              <div key={importRecord.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-medium">{importRecord.file_name}</h4>
                    {getStatusBadge(importRecord.status)}
                    <Badge variant="outline">
                      {importRecord.import_type}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex items-center space-x-4">
                      <span>Size: {formatFileSize(importRecord.file_size)}</span>
                      <span>Rows: {importRecord.total_rows}</span>
                      {importRecord.successful_rows > 0 && (
                        <span className="text-green-600">
                          ✓ {importRecord.successful_rows} successful
                        </span>
                      )}
                      {importRecord.failed_rows > 0 && (
                        <span className="text-red-600">
                          ✗ {importRecord.failed_rows} failed
                        </span>
                      )}
                    </div>
                    <div>
                      Created: {new Date(importRecord.created_at).toLocaleDateString()}
                      {importRecord.completed_at && (
                        <span className="ml-4">
                          Completed: {new Date(importRecord.completed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {importRecord.processing_errors && importRecord.processing_errors.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Download error report
                        const errorContent = JSON.stringify(importRecord.processing_errors, null, 2);
                        const blob = new Blob([errorContent], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `errors_${importRecord.id}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(importRecord.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
