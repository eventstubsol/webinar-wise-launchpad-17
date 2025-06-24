
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, Filter, Search, RefreshCw, Download } from 'lucide-react';
import { useAuditLog } from '@/lib/database/hooks';
import { format } from 'date-fns';

interface AuditLogViewerProps {
  tableName?: string;
  recordId?: string;
  className?: string;
}

export function AuditLogViewer({ tableName, recordId, className }: AuditLogViewerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  
  const { logs, loading, error, refetch } = useAuditLog({
    tableName,
    recordId,
    limit: 50,
    realtime: true
  });

  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchTerm || 
      log.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.record_id.includes(searchTerm) ||
      (log.changed_by && log.changed_by.includes(searchTerm));
    
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    
    return matchesSearch && matchesAction;
  });

  const getActionBadge = (action: string) => {
    const variants = {
      INSERT: 'default' as const,
      UPDATE: 'secondary' as const,
      DELETE: 'destructive' as const
    };
    return variants[action as keyof typeof variants] || 'outline' as const;
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading audit logs...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load audit logs: {error.message}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Audit Log</span>
          <div className="flex items-center gap-2">
            <Button onClick={refetch} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Track changes and modifications to your data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search by table, record ID, or user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="INSERT">Insert</SelectItem>
              <SelectItem value="UPDATE">Update</SelectItem>
              <SelectItem value="DELETE">Delete</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No audit logs found
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Record ID</TableHead>
                  <TableHead>Changed By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(log.changed_at), 'MMM dd, yyyy HH:mm:ss')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {log.table_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActionBadge(log.action)}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {log.record_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {log.changed_by ? log.changed_by.slice(0, 8) + '...' : 'System'}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
