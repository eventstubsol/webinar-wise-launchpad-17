'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { format } from 'date-fns';
import { 
  Calendar, 
  Database, 
  Download, 
  FileText, 
  Search,
  Clock,
  User,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AuditLogEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  changed_at: string;
  changed_by: string;
  changes: any;
  changed_by_email?: string;
  record_description?: string;
}

interface AuditStats {
  total_changes: number;
  changes_by_table: Record<string, number>;
  changes_by_action: Record<string, number>;
  recent_activity: AuditLogEntry[];
}

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTable, setSelectedTable] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    to: new Date()
  });

  const supabase = createClientComponentClient();

  useEffect(() => {
    loadAuditLogs();
    loadStats();
  }, [selectedTable, selectedAction, dateRange]);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_log')
        .select(`
          *,
          changed_by_user:auth.users!changed_by(email)
        `)
        .gte('changed_at', dateRange.from.toISOString())
        .lte('changed_at', dateRange.to.toISOString())
        .order('changed_at', { ascending: false })
        .limit(100);

      if (selectedTable !== 'all') {
        query = query.eq('table_name', selectedTable);
      }

      if (selectedAction !== 'all') {
        query = query.eq('action', selectedAction);
      }

      const { data, error } = await query;

      if (error) throw error;

      setLogs(data || []);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Get total changes
      const { count: totalChanges } = await supabase
        .from('audit_log')
        .select('*', { count: 'exact', head: true });

      // Get changes by table
      const { data: tableStats } = await supabase
        .from('audit_log')
        .select('table_name')
        .gte('changed_at', dateRange.from.toISOString());

      const changesByTable = tableStats?.reduce((acc, row) => {
        acc[row.table_name] = (acc[row.table_name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Get changes by action
      const { data: actionStats } = await supabase
        .from('audit_log')
        .select('action')
        .gte('changed_at', dateRange.from.toISOString());

      const changesByAction = actionStats?.reduce((acc, row) => {
        acc[row.action] = (acc[row.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Get recent activity
      const { data: recentActivity } = await supabase
        .from('recent_audit_activity')
        .select('*')
        .limit(10);

      setStats({
        total_changes: totalChanges || 0,
        changes_by_table: changesByTable,
        changes_by_action: changesByAction,
        recent_activity: recentActivity || []
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const formatChanges = (changes: any, action: string) => {
    if (!changes) return 'No changes recorded';

    if (action === 'INSERT') {
      return 'New record created';
    }

    if (action === 'DELETE') {
      return 'Record deleted';
    }

    if (action === 'UPDATE' && changes.fields_changed) {
      const fields = Object.keys(changes.fields_changed);
      return `Updated ${fields.length} field${fields.length > 1 ? 's' : ''}: ${fields.join(', ')}`;
    }

    return 'Changes recorded';
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT': return 'bg-green-100 text-green-800';
      case 'UPDATE': return 'bg-blue-100 text-blue-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredLogs = logs.filter(log => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        log.table_name.toLowerCase().includes(searchLower) ||
        log.record_id.toLowerCase().includes(searchLower) ||
        log.changed_by_email?.toLowerCase().includes(searchLower) ||
        log.record_description?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Audit Log</h2>
        <p className="text-muted-foreground">
          Track all changes made to your data
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Changes</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_changes || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inserts</CardTitle>
            <Database className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.changes_by_action.INSERT || 0}</div>
            <p className="text-xs text-muted-foreground">New records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Updates</CardTitle>
            <Database className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.changes_by_action.UPDATE || 0}</div>
            <p className="text-xs text-muted-foreground">Modified records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deletes</CardTitle>
            <Database className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.changes_by_action.DELETE || 0}</div>
            <p className="text-xs text-muted-foreground">Removed records</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Search</Label>
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

              <div className="space-y-2">
                <Label>Table</Label>
                <Select value={selectedTable} onValueChange={setSelectedTable}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tables</SelectItem>
                    <SelectItem value="zoom_webinars">Webinars</SelectItem>
                    <SelectItem value="zoom_participants">Participants</SelectItem>
                    <SelectItem value="zoom_registrants">Registrants</SelectItem>
                    <SelectItem value="email_campaigns">Email Campaigns</SelectItem>
                    <SelectItem value="email_templates">Email Templates</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Action</Label>
                <Select value={selectedAction} onValueChange={setSelectedAction}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="INSERT">Insert</SelectItem>
                    <SelectItem value="UPDATE">Update</SelectItem>
                    <SelectItem value="DELETE">Delete</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date Range</Label>
                <Select
                  value="7days"
                  onValueChange={(value) => {
                    const now = new Date();
                    let from = new Date();
                    
                    switch (value) {
                      case '24h':
                        from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                        break;
                      case '7days':
                        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        break;
                      case '30days':
                        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        break;
                    }
                    
                    setDateRange({ from, to: now });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">Last 24 hours</SelectItem>
                    <SelectItem value="7days">Last 7 days</SelectItem>
                    <SelectItem value="30days">Last 30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Logs Table */}
          <Card>
            <CardHeader>
              <CardTitle>Audit Log Entries</CardTitle>
              <CardDescription>
                Showing {filteredLogs.length} of {logs.length} entries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Record</TableHead>
                    <TableHead>Changes</TableHead>
                    <TableHead>User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        No audit logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {format(new Date(log.changed_at), 'MMM dd, HH:mm')}
                        </TableCell>
                        <TableCell>
                          <Badge className={getActionColor(log.action)}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {log.table_name}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.record_description || log.record_id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatChanges(log.changes, log.action)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.changed_by_email || 'System'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest changes across all tables
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.recent_activity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4 py-3 border-b last:border-0">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">
                      {activity.record_description || `${activity.table_name} record`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activity.action} by {activity.changed_by_email || 'System'} • {format(new Date(activity.changed_at), 'MMM dd, HH:mm')}
                    </p>
                  </div>
                  <Badge className={getActionColor(activity.action)}>
                    {activity.action}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}