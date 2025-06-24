
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AuditLogEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_data: any;
  new_data: any;
  changed_by: string;
  changed_at: string;
  change_context?: string;
}

interface UseAuditLogOptions {
  tableName?: string;
  recordId?: string;
  limit?: number;
  realtime?: boolean;
}

export function useAuditLog(options: UseAuditLogOptions = {}) {
  const { tableName, recordId, limit = 50, realtime = false } = options;
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('audit_log')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(limit);

      if (tableName) {
        query = query.eq('table_name', tableName);
      }

      if (recordId) {
        query = query.eq('record_id', recordId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch audit logs'));
    } finally {
      setLoading(false);
    }
  }, [tableName, recordId, limit]);

  useEffect(() => {
    fetchLogs();

    if (realtime) {
      const channel = supabase
        .channel('audit-log-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'audit_log',
            filter: tableName ? `table_name=eq.${tableName}` : undefined
          },
          (payload) => {
            setLogs(prev => [payload.new as AuditLogEntry, ...prev].slice(0, limit));
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchLogs, realtime, tableName, limit]);

  const getFieldChanges = useCallback((log: AuditLogEntry) => {
    if (log.action !== 'UPDATE' || !log.old_data || !log.new_data) {
      return [];
    }

    const changes: Array<{
      field: string;
      oldValue: any;
      newValue: any;
    }> = [];

    Object.keys(log.new_data).forEach(key => {
      if (log.old_data[key] !== log.new_data[key]) {
        changes.push({
          field: key,
          oldValue: log.old_data[key],
          newValue: log.new_data[key]
        });
      }
    });

    return changes;
  }, []);

  const clearLogs = useCallback(async () => {
    // This would typically require admin privileges
    // Implement based on your security requirements
    console.warn('Clear logs not implemented - requires admin privileges');
  }, []);

  return {
    logs,
    loading,
    error,
    refetch: fetchLogs,
    getFieldChanges,
    clearLogs
  };
}

// Hook for tracking specific record changes
export function useRecordHistory(tableName: string, recordId: string) {
  const [history, setHistory] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const { data, error } = await supabase
          .rpc('get_record_history', {
            p_table_name: tableName,
            p_record_id: recordId
          });

        if (error) throw error;
        setHistory(data || []);
      } catch (error) {
        console.error('Failed to fetch record history:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [tableName, recordId]);

  const getVersionAt = useCallback((date: Date) => {
    // Find the state of the record at a specific date
    const relevantLogs = history.filter(log => 
      new Date(log.changed_at) <= date
    );

    if (relevantLogs.length === 0) return null;

    // Reconstruct the record state at that date
    let recordState: any = {};

    relevantLogs.reverse().forEach(log => {
      if (log.action === 'INSERT') {
        recordState = { ...log.new_data };
      } else if (log.action === 'UPDATE') {
        recordState = { ...recordState, ...log.new_data };
      }
    });

    return recordState;
  }, [history]);

  return {
    history,
    loading,
    getVersionAt
  };
}

// Hook for audit statistics
export function useAuditStats(dateRange?: { from: Date; to: Date }) {
  const [stats, setStats] = useState({
    totalChanges: 0,
    changesByTable: {} as Record<string, number>,
    changesByAction: {} as Record<string, number>,
    changesByUser: {} as Record<string, number>,
    averageChangesPerDay: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        let query = supabase.from('audit_log').select('*');

        if (dateRange) {
          query = query
            .gte('changed_at', dateRange.from.toISOString())
            .lte('changed_at', dateRange.to.toISOString());
        }

        const { data, error } = await query;

        if (error) throw error;

        const logs = data || [];
        
        // Calculate statistics
        const changesByTable: Record<string, number> = {};
        const changesByAction: Record<string, number> = {};
        const changesByUser: Record<string, number> = {};

        logs.forEach(log => {
          changesByTable[log.table_name] = (changesByTable[log.table_name] || 0) + 1;
          changesByAction[log.action] = (changesByAction[log.action] || 0) + 1;
          if (log.changed_by) {
            changesByUser[log.changed_by] = (changesByUser[log.changed_by] || 0) + 1;
          }
        });

        // Calculate average changes per day
        let averageChangesPerDay = 0;
        if (dateRange && logs.length > 0) {
          const days = Math.ceil(
            (dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)
          );
          averageChangesPerDay = logs.length / days;
        }

        setStats({
          totalChanges: logs.length,
          changesByTable,
          changesByAction,
          changesByUser,
          averageChangesPerDay
        });
      } catch (error) {
        console.error('Failed to fetch audit stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [dateRange]);

  return { stats, loading };
}
