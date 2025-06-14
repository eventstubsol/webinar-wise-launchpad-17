
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Clock, AlertCircle, Search } from 'lucide-react';
import { CRMSyncLog } from '@/types/crm';
import { CRMConnectionManager } from '@/services/crm/CRMConnectionManager';
import { useToast } from '@/hooks/use-toast';

interface CRMActivityLogsProps {
  connectionId: string;
}

export function CRMActivityLogs({ connectionId }: CRMActivityLogsProps) {
  const { toast } = useToast();
  const [logs, setLogs] = useState<CRMSyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<CRMSyncLog | null>(null);

  useEffect(() => {
    loadLogs();
  }, [connectionId]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await CRMConnectionManager.getSyncLogs(connectionId);
      setLogs(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load activity logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'conflict':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'conflict':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.sync_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.operation_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div className="animate-pulse space-y-4">Loading activity logs...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
          <CardDescription>
            View detailed logs of all sync operations and their results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="conflict">Conflict</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {logs.length === 0 ? 'No sync operations yet' : 'No logs match your filters'}
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(log.status)}
                    <div>
                      <div className="font-medium">
                        {log.sync_type.replace('_', ' ')} - {log.operation_type}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {log.direction} • {new Date(log.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(log.status)}>
                      {log.status}
                    </Badge>
                    <div className="text-right text-sm text-muted-foreground">
                      {log.records_processed} records
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {selectedLog && (
        <Card>
          <CardHeader>
            <CardTitle>Sync Details</CardTitle>
            <div className="flex items-center space-x-2">
              {getStatusIcon(selectedLog.status)}
              <Badge className={getStatusColor(selectedLog.status)}>
                {selectedLog.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Operation Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span>{selectedLog.sync_type.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Operation:</span>
                      <span>{selectedLog.operation_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Direction:</span>
                      <span>{selectedLog.direction}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Started:</span>
                      <span>{new Date(selectedLog.started_at).toLocaleString()}</span>
                    </div>
                    {selectedLog.completed_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Completed:</span>
                        <span>{new Date(selectedLog.completed_at).toLocaleString()}</span>
                      </div>
                    )}
                    {selectedLog.duration_ms && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration:</span>
                        <span>{(selectedLog.duration_ms / 1000).toFixed(2)}s</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Results Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Processed:</span>
                      <span>{selectedLog.records_processed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Successful:</span>
                      <span className="text-green-600">{selectedLog.records_success}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Failed:</span>
                      <span className="text-red-600">{selectedLog.records_failed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Conflicts:</span>
                      <span className="text-orange-600">{selectedLog.records_conflicts}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {selectedLog.error_message && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Error Details</h4>
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-sm text-red-600">{selectedLog.error_message}</p>
                </div>
              </div>
            )}

            {selectedLog.conflict_details && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Conflict Details</h4>
                <div className="bg-orange-50 border border-orange-200 rounded p-3">
                  <pre className="text-sm text-orange-600 whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.conflict_details, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <Button variant="outline" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
